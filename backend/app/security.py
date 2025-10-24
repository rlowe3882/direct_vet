import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional, Tuple

from secrets import compare_digest


SECRET_KEY = os.getenv("APP_SECRET_KEY", "petlabs-dev-secret-change-me")
ACCESS_TOKEN_TTL = int(os.getenv("ACCESS_TOKEN_TTL", "3600"))
EMPLOYEE_TOKEN_TTL = int(os.getenv("EMPLOYEE_TOKEN_TTL", str(ACCESS_TOKEN_TTL)))


class InvalidTokenError(Exception):
    """Raised when a bearer token is invalid or expired."""

    pass


def _digest(raw_password: str, salt: str) -> str:
    return hashlib.sha1((raw_password + salt).encode("utf-8")).hexdigest()


def hash_password(raw_password: str) -> Tuple[str, str]:
    salt = secrets.token_hex(8)
    digest = _digest(raw_password, salt)
    return digest, salt


def verify_password(raw_password: str, salt: str, expected_hash: str) -> bool:
    candidate = _digest(raw_password, salt)
    return compare_digest(candidate, expected_hash)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _create_token(data: dict, expires_in: Optional[int] = None) -> str:
    ttl = expires_in if expires_in is not None else ACCESS_TOKEN_TTL
    payload = data.copy()
    payload["exp"] = int(time.time()) + ttl
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_bytes, hashlib.sha256).digest()
    return f"{_b64encode(payload_bytes)}.{_b64encode(signature)}"


def _decode_token_parts(token: str) -> tuple[bytes, bytes]:
    try:
        payload_part, signature_part = token.split(".", 1)
    except ValueError as exc:
        raise InvalidTokenError("Malformed token") from exc
    return _b64decode(payload_part), _b64decode(signature_part)


def _verify_token(token: str) -> dict:
    payload_bytes, signature_bytes = _decode_token_parts(token)
    expected_signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).digest()
    if not compare_digest(signature_bytes, expected_signature):
        raise InvalidTokenError("Invalid token signature")

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
        expiry = int(payload["exp"])
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        raise InvalidTokenError("Invalid token payload") from exc

    if expiry < int(time.time()):
        raise InvalidTokenError("Token expired")

    return payload


def create_access_token(client_id: int, expires_in: Optional[int] = None) -> str:
    ttl = expires_in if expires_in is not None else ACCESS_TOKEN_TTL
    return _create_token({"cid": client_id}, ttl)


def verify_access_token(token: str) -> int:
    payload = _verify_token(token)
    try:
        client_id = int(payload["cid"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("Invalid token payload") from exc
    return client_id


def create_employee_token(email: str, expires_in: Optional[int] = None) -> str:
    ttl = expires_in if expires_in is not None else EMPLOYEE_TOKEN_TTL
    return _create_token({"emp": email}, ttl)


def verify_employee_token(token: str) -> str:
    payload = _verify_token(token)
    email = payload.get("emp")
    if not isinstance(email, str) or not email:
        raise InvalidTokenError("Invalid token payload")
    return email.lower()


def extract_bearer_token(header_value: Optional[str]) -> str:
    if not header_value:
        raise InvalidTokenError("Missing authorization header")
    scheme, _, token = header_value.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise InvalidTokenError("Invalid authorization header")
    return token
