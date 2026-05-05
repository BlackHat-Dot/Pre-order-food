from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password


def test_password_hash_and_verify():
    pwd = "StrongPass123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_creation():
    token = create_access_token("user-1", "customer")
    assert isinstance(token, str)
    assert token.count(".") == 2


def test_refresh_token_creation():
    token = create_refresh_token("user-2", "shop_owner")
    assert isinstance(token, str)
    assert token.count(".") == 2

