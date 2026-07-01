import httpx
import uuid
import time
from app.core.config import settings

class NombaClient:
    def __init__(self):
        self.base_url = settings.NOMBA_BASE_URL

        self.account_id = settings.NOMBA_ACCOUNT_ID
        self.client_id = settings.NOMBA_CLIENT_ID
        self.client_secret = settings.NOMBA_CLIENT_SECRET
        
        # In-memory cache for the token
        self._access_token = None
        self._token_expiry = 0

    async def get_access_token(self) -> str:
        """
        Fetches a new Bearer token or returns the cached one if it's still valid.
        """
        # If we have a token and it hasn't expired, return it
        if self._access_token and time.time() < (self._token_expiry - 300):  # 5-minute buffer
            return self._access_token

        auth_url = f"{self.base_url}/v1/auth/token/issue"
        
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        headers = {
            "Content-Type": "application/json",
            "accountId": self.account_id
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(auth_url, json=payload, headers=headers)
            
            # If the auth fails, we need to know immediately
            response.raise_for_status() 
            
            data = response.json().get("data", {})
            self._access_token = data.get("access_token")
            
            # Nomba typically returns expires_in in seconds (e.g., 3600 for 1 hour)
            expires_in = data.get("expires_in", 3600) 
            self._token_expiry = time.time() + expires_in

            return self._access_token

    async def _get_auth_headers(self) -> dict:
        """Helper to generate headers for protected routes."""
        token = await self.get_access_token()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "accountId": self.account_id
        }
    
    async def create_checkout_order(self, order_reference: str, parent_email: str, base_fee: float, platform_fee: float, gateway_fee: float, school_slug: str) -> dict:
        token = await self.get_access_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "accountId": self.account_id,
            "Content-Type": "application/json"
        }

        total_charged = base_fee + platform_fee + gateway_fee
        total_user_share = platform_fee + gateway_fee

        payload = {
            "order": {
                "orderReference": order_reference,
                "amount": f"{total_charged:.2f}",
                "currency": "NGN",
                "customerEmail": parent_email,
                "callbackUrl": f"{settings.FRONTEND_URL}/success?schoolSlug={school_slug}&orderReference={order_reference}",
                
                "split": {
                    "type": "flat", 
                    "subAccounts": [
                        {
                            "subAccountId": settings.SUB_ACCOUNT_ID, 
                            "share": f"{total_user_share:.2f}"
                        }
                    ]
                }
            }
        }    
        url = f"{self.base_url}/v1/checkout/order"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers # Pass the secure headers here
            )
            
            response.raise_for_status()
            return response.json()
   
    
  
        