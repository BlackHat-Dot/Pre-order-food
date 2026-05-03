# auth.py
from pwdlib import PasswordHash
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "change_this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_hash=PasswordHash.recommended()

def password_hasher(plaintext):
    pass_hash=password_hash.hash(plaintext)
    return pass_hash

def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(Seconds=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)