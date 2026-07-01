from app.core.config import settings
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.security import verify_nomba_signature
from app.db.session import get_db 
from app.models import Transaction, Student, School
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

@router.post("/nomba")
async def nomba_webhook_listener(
    request: Request, 
    nomba_signature: str = Header(None, alias="nomba-signature"),
    nomba_timestamp: str = Header(None, alias="nomba-timestamp"), # Catch the timestamp!
    db: Session = Depends(get_db)
):
    if not nomba_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    # 1. Parse the JSON body immediately (We don't need raw bytes anymore!)
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # 2. Security Check: Verify using the new Nomba Concatenation Algorithm
    is_valid = verify_nomba_signature(payload, nomba_signature, nomba_timestamp)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Nomba signature")

    try:
        # 3. Process the event
        event_type = payload.get("event_type")

        if event_type != "payment_success":
            return {"status": "ignored", "detail": f"Unsupported event type: {event_type}"}

        payload_data = payload.get("data", {})
        transaction_details = payload_data.get("transaction", {})

        # Safely extract the reference and ID from the possible Nomba payload shapes.
        order_ref = (
            payload_data.get("orderReference")
            or payload.get("orderReference")
            or transaction_details.get("merchantTxRef")
        )
        nomba_txn_id = transaction_details.get("transactionId")

        if not order_ref:
            logger.warning("Nomba webhook missing order reference: %s", payload)
            return {"status": "ignored", "detail": "Missing order reference"}

        # 4. Idempotency Check
        transaction = db.query(Transaction).filter(Transaction.reference == order_ref).first()

        if not transaction:
            logger.warning("Nomba webhook referenced unknown transaction: %s", order_ref)
            return {"status": "ignored", "detail": "Transaction reference not found in DB"}

        if transaction.status == "SUCCESS":
            return {"status": "success", "detail": "Transaction already marked as complete"}

        # 5. Safe to update the ledger.
        transaction.status = "SUCCESS"
        transaction.nomba_txn_id = nomba_txn_id

        student = db.query(Student).filter(Student.id == transaction.student_id).first()
        if student:
            current_balance = float(student.outstanding_balance or 0)
            paid_amount = float(transaction.base_fee or 0)
            student.outstanding_balance = max(0.0, current_balance - paid_amount)

        db.commit()

        if student:
            logger.info("Webhook success recorded for %s", student.full_name)

        return {"status": "success", "detail": "Transaction recorded"}

    except Exception:
        db.rollback()
        logger.exception("Failed to process Nomba webhook")
        raise HTTPException(status_code=500, detail="Failed to process webhook")

@router.get("/receipt/{order_ref}")
def get_receipt(order_ref: str, db: Session = Depends(get_db)):
    # Find the transaction
    transaction = db.query(Transaction).filter(Transaction.reference == order_ref).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Find the student and school to populate the receipt
    student = db.query(Student).filter(Student.id == transaction.student_id).first()
    school = db.query(School).filter(School.id == transaction.school_id).first()
    
    return {
        "school_name": school.name,
        "school_logo": school.logo_url,
        "student_name": student.full_name,
        "reg_number": student.reg_number,
        "order_reference": transaction.reference,
        "amount_paid": transaction.total_billed, # Or base_fee depending on what you want to show
        "status": transaction.status,
        "date": transaction.updated_at.strftime("%d/%m/%Y %H:%M")
    }


@router.get("/status/{order_ref}")
def get_transaction_status(order_ref: str, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.reference == order_ref).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    student = db.query(Student).filter(Student.id == transaction.student_id).first()
    school = db.query(School).filter(School.id == transaction.school_id).first()

    return {
        "order_reference": transaction.reference,
        "status": transaction.status,
        "student_name": student.full_name if student else None,
        "school_name": school.name if school else None,
        "amount_paid": float(transaction.total_billed or 0),
        "nomba_txn_id": transaction.nomba_txn_id,
        "date": transaction.updated_at.strftime("%d/%m/%Y %H:%M")
    }