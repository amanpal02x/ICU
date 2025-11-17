from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from decouple import config
from models import TokenData

# JWT configuration
SECRET_KEY = config('SECRET_KEY', default='your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing - using scrypt which has no length limit
pwd_context = CryptContext(schemes=["scrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Truncate password to exactly 72 bytes max to avoid bcrypt limit
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# AUTH BYPASS CONFIGURATION
AUTH_BYPASS_ENABLED = True  # Set to True to enable auth bypass

def set_auth_bypass(enabled: bool):
    """Enable or disable authentication bypass"""
    global AUTH_BYPASS_ENABLED
    AUTH_BYPASS_ENABLED = enabled
    print(f"🔓 AUTH BYPASS {'ENABLED' if enabled else 'DISABLED'}")

def verify_token(token: str, credentials_exception):
    """Verify JWT token and return token data"""
    # Check if auth bypass is enabled
    if AUTH_BYPASS_ENABLED:
        print("🔓 AUTH BYPASS: Skipping token verification")
        return TokenData(email="bypass@example.com")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
        return token_data
    except JWTError:
        raise credentials_exception
