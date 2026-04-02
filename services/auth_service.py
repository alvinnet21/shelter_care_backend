from typing import Optional
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from models.user import User, ShelterSeeker, Provider, Verificator, Admin
from repositories.user_repository import UserRepository


SECRET_KEY = "sheltercare_secret_key_2024_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service following Clean Architecture"""

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def hash_password(self, password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict) -> str:
        """Create JWT token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

    async def register(self, email: str, full_name: str, password: str, role: str, question_answer: Optional[str] = None, id_document: Optional[str] = None) -> Optional[User]:
        """Register a new user"""
        existing_user = await self.user_repository.find_by_email(email)
        if existing_user:
            return None

        hashed_password = self.hash_password(password)

        if role == "SEEKER":
            user = ShelterSeeker(
                email=email,
                full_name=full_name,
                password=hashed_password,
                question_answer=question_answer
            )
        elif role == "PROVIDER":
            user = Provider(
                email=email,
                full_name=full_name,
                password=hashed_password,
                id_document=id_document,
                is_verified=False,
                verification_status="PENDING"
            )
        elif role == "VERIFICATOR":
            user = Verificator(
                email=email,
                full_name=full_name,
                password=hashed_password
            )
        elif role == "ADMIN":
            user = Admin(
                email=email,
                full_name=full_name,
                password=hashed_password
            )
        else:
            return None

        return await self.user_repository.create_user(user)

    async def login(self, email: str, password: str) -> Optional[dict]:
        """Login user"""
        user = await self.user_repository.find_by_email(email)
        if not user:
            return None

        if not self.verify_password(password, user["password"]):
            return None

        token = self.create_access_token({
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"]
        })

        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"]
            }
        }
