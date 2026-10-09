#!/usr/bin/env python3
"""
scripts/create_admin.py

Administrative CLI utility to provision the initial system Administrator
or Shop Owner accounts. Admin accounts cannot be created via public APIs.
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys

# Ensure application root is in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from dotenv import load_dotenv
load_dotenv()

import pyotp
from sqlalchemy import select

from app.core.security import (
    encrypt_totp_secret,
    generate_totp_secret,
    hash_password,
)
from app.crud.user import get_user_by_phone
from app.db.session import AsyncSessionLocal, engine
from app.models.user import User
from app.utils.ids import new_id
from app.utils.phone import normalize_e164


async def create_user(
    *,
    role: str,
    phone: str,
    name: str,
    password: str,
) -> None:
    try:
        norm_phone = normalize_e164(phone)
    except ValueError as err:
        print(f"Error: Invalid phone format: {err}", file=sys.stderr)
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        existing = await get_user_by_phone(db, norm_phone)
        if existing:
            print(f"Error: Account with phone {norm_phone} already exists (role={existing.role}).", file=sys.stderr)
            sys.exit(1)

        hashed = hash_password(password)

        provisioning_uri: str | None = None
        totp_secret_enc: str | None = None
        totp_enabled: bool = False

        if role == "admin":
            raw_totp_secret = generate_totp_secret()
            totp_secret_enc = encrypt_totp_secret(raw_totp_secret)
            totp_enabled = True

            totp = pyotp.TOTP(raw_totp_secret)
            provisioning_uri = totp.provisioning_uri(
                name=norm_phone,
                issuer_name="PreOrder Food",
            )

        user = User(
            id=new_id(),
            role=role,
            name=name,
            phone=norm_phone,
            password_hash=hashed,
            phone_verified=True,
            is_active=True,
            totp_secret_encrypted=totp_secret_enc,
            totp_enabled=totp_enabled,
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        print("=" * 60)
        print(f"User provisioned successfully!")
        print(f"User ID: {user.id}")
        print(f"Role:    {user.role}")
        print(f"Name:    {user.name}")
        print(f"Phone:   {user.phone}")
        print("=" * 60)

        if role == "admin" and provisioning_uri:
            print("\n[IMPORTANT] 2FA TOTP Provisioning:")
            print("Scan the following URI with your Authenticator app (Google Authenticator, Authy, 1Password):")
            print(f"\n{provisioning_uri}\n")
            print("[NOTICE] This provisioning URI is displayed only once during account creation.")
            print("=" * 60)

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create administrative or owner user for PreOrder")
    parser.add_argument("--role", choices=["admin", "shop_owner"], default="admin", help="Role to assign (default: admin)")
    parser.add_argument("--phone", help="Phone number with country code (e.g. +919876543210)")
    parser.add_argument("--name", help="Display name for the user")
    parser.add_argument("--password", help="Password for the user (prompted if omitted)")

    args = parser.parse_args()

    role = args.role
    phone = args.phone
    while not phone or not phone.strip():
        phone = input("Enter phone number (+91...): ").strip()

    name = args.name
    while not name or not name.strip():
        default_name = "System Administrator" if role == "admin" else "Kitchen Owner"
        name = input(f"Enter display name [{default_name}]: ").strip() or default_name

    password = args.password
    while not password or not password.strip():
        password = getpass.getpass("Enter password: ").strip()
        confirm = getpass.getpass("Confirm password: ").strip()
        if password != confirm:
            print("Passwords do not match. Please try again.", file=sys.stderr)
            password = None

    asyncio.run(create_user(role=role, phone=phone, name=name, password=password))


if __name__ == "__main__":
    main()
