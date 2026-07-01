from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "BursarOS"
    VERSION: str = "1.0.0"
    
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 
    # Nomba API Credentials (Sandbox)
    NOMBA_CLIENT_ID: str
    NOMBA_CLIENT_SECRET: str
    NOMBA_ACCOUNT_ID: str 
    NOMBA_WEBHOOK_SECRET: str
    SUB_ACCOUNT_ID: str
    PLATFORM_FEE: float
    GATEWAY_FEE: float 
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str = "BursarOS"
    SMTP_USE_TLS: bool = True
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    # Base URL defaults to sandbox for safe testing
    NOMBA_BASE_URL: str 
    
    # Database Configuration (Defaults to local SQLite for fast prototyping)
    DATABASE_URL: str 
    FRONTEND_URL: str
    class Config:
        # Tells Pydantic to look for these variables in the .env file
        env_file = ".env"
        # Ignore extra variables in the .env file (like frontend Vite vars)
        extra = "ignore"

# Instantiate the settings object to be imported across your app 
settings = Settings()