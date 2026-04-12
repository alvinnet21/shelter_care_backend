from typing import Optional
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import string
import random
from models.user import User, ShelterSeeker, Provider, Verificator, Admin
from repositories.user_repository import UserRepository
from services.email_service import EmailService


SECRET_KEY = "sheltercare_secret_key_2024_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service following Clean Architecture"""

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
        self.email_service = EmailService()

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

    def generate_random_password(self, length: int = 10) -> str:
        """Generate a random password"""
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

    async def register(self, email: str, full_name: str, password: str, role: str, question_answer: Optional[str] = None, id_document: Optional[str] = None, police_check: Optional[str] = None) -> Optional[User]:
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
                police_check=police_check,
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
        """Login user - checks verification status for providers"""
        user = await self.user_repository.find_by_email(email)
        if not user:
            return None

        if not self.verify_password(password, user["password"]):
            return None

        # Check if provider is verified
        if user["role"] == "PROVIDER" and not user.get("is_verified", False):
            verification_status = user.get("verification_status", "PENDING")
            if verification_status == "PENDING":
                return {"error": "not_verified", "message": "Your account is pending verification. Please wait for a verificator to approve your account."}
            elif verification_status == "REJECTED":
                reason = user.get("verification_reason", "No reason provided")
                return {"error": "rejected", "message": f"Your account verification was rejected. Reason: {reason}"}

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

    async def forgot_password(self, email: str) -> dict:
        """Reset password and send email with new random password"""
        user = await self.user_repository.find_by_email(email)
        if not user:
            # Return success even if user not found (security best practice)
            return {"success": True, "message": "If the email exists in our system, a new password has been sent."}

        new_password = self.generate_random_password()
        hashed_password = self.hash_password(new_password)

        await self.user_repository.update_user(user["id"], {"password": hashed_password})

        email_sent = await self.email_service.send_password_reset_email(
            to_email=user["email"],
            full_name=user["full_name"],
            new_password=new_password
        )

        if email_sent:
            return {"success": True, "message": "A new password has been sent to your email address."}
        else:
            return {"success": False, "message": "Failed to send email. Please try again later."}
