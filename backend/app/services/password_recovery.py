import logging
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage

import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

RESET_TOKEN_PURPOSE = "password_reset"


def create_password_reset_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "purpose": RESET_TOKEN_PURPOSE,
        "exp": datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_password_reset_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Password reset token has expired") from exc
    except jwt.PyJWTError as exc:
        raise ValueError("Password reset token is invalid") from exc


def send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    role: str,
    reset_link: str,
    school_name: str,
) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD in backend/.env")

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    if not from_email:
        raise RuntimeError("SMTP_FROM_EMAIL is missing")

    message = EmailMessage()
    message["Subject"] = f"{school_name} BursarOS password reset"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{from_email}>"
    message["To"] = recipient_email

    plain_text = f"""
Hello {recipient_name},

We received a request to reset your {role} password for {school_name}.

Reset your password using this link:
{reset_link}

This link expires soon. If you did not request this reset, you can ignore this email.

Regards,
{settings.SMTP_FROM_NAME}
""".strip()

    html_text = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Password reset request</h2>
        <p>Hello {recipient_name},</p>
        <p>We received a request to reset your <strong>{role}</strong> password for <strong>{school_name}</strong>.</p>
        <p>
          <a href="{reset_link}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
            Reset your password
          </a>
        </p>
        <p style="word-break: break-all;">If the button does not work, copy and paste this link into your browser:<br>{reset_link}</p>
        <p>This link expires soon. If you did not request this reset, you can ignore this email.</p>
        <p>Regards,<br>{settings.SMTP_FROM_NAME}</p>
      </body>
    </html>
    """.strip()

    message.set_content(plain_text)
    message.add_alternative(html_text, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_USE_TLS:
            server.starttls(context=context)
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)

    logger.info("Password reset email sent to %s", recipient_email)