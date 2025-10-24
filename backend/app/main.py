import os
import re
from datetime import date as dt_date
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from . import crud, models, schemas, security
from .database import Base, engine, get_db


app = FastAPI(title="PetLabs Diagnostics Registration API")

DOCUMENT_STORAGE_ROOT = Path(os.getenv("DOCUMENT_STORAGE_ROOT", "files")).resolve()
DOCUMENT_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

EMPLOYEE_ALLOWED_EMAILS = {
    email.strip().lower()
    for email in os.getenv("EMPLOYEE_ALLOWED_EMAILS", "").split(",")
    if email.strip()
}

ALLOWED_UPLOAD_EXTENSIONS = {
    ext.lower()
    for ext in os.getenv(
        "ALLOWED_UPLOAD_EXTENSIONS",
        "pdf,doc,docx,txt,xlsx,xls,rtf",
    ).split(",")
    if ext.strip()
}

MAX_UPLOAD_SIZE_BYTES = int(os.getenv("DOCUMENT_MAX_BYTES", str(2 * 1024 * 1024)))

HOSPITALS_REQUIRE_REQUISITION = {
    int(value)
    for value in os.getenv("REQUISITION_REQUIRED_HOSPITAL_IDS", "149").split(",")
    if value.strip().isdigit()
}


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def _resolve_client(
    authorization: Optional[str],
    token_param: Optional[str],
    db: Session,
) -> models.Client:
    try:
        if token_param:
            client_id = security.verify_access_token(token_param)
        else:
            token = security.extract_bearer_token(authorization)
            client_id = security.verify_access_token(token)
    except security.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    client = db.get(models.Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return client


def _is_employee_authorized(email: str) -> bool:
    if not EMPLOYEE_ALLOWED_EMAILS:
        return True
    return email.lower() in EMPLOYEE_ALLOWED_EMAILS


def _resolve_employee(
    authorization: Optional[str],
    token_param: Optional[str],
    db: Session,
) -> str:
    try:
        if token_param:
            email = security.verify_employee_token(token_param)
        else:
            token = security.extract_bearer_token(authorization)
            email = security.verify_employee_token(token)
    except security.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if not _is_employee_authorized(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized employee account.")

    # Ensure the employee exists as a client for metadata (name, etc.) if available.
    client = crud.find_client_by_email(db, email=email)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee account not found.")

    return email


@app.get("/states", response_model=list[schemas.StateRead])
def list_states(db: Session = Depends(get_db)):
    return crud.get_states(db)


@app.post(
    "/registrations",
    response_model=schemas.RegistrationRead,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: schemas.RegistrationCreate, db: Session = Depends(get_db)):
    existing_hospital = crud.find_hospital_duplicate(
        db, hospital_name=payload.hospital_name, address=payload.address
    )
    if existing_hospital:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hospital already registered. Please contact support.",
        )

    existing_client = crud.find_client_by_email(db, email=payload.email)
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already registered. Please log in or reset the password.",
        )

    password_hash, salt = security.hash_password(payload.password)
    registration, client, hospital = crud.create_registration(
        db=db,
        payload=payload,
        password_hash=password_hash,
        salt=salt,
    )

    hospital.client_id = client.client_id
    db.add(hospital)
    db.commit()
    db.refresh(registration)

    return schemas.RegistrationRead(
        registration_id=registration.registration_id,
        message="Registration submitted. Please check your email for next steps.",
    )


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    client = crud.find_client_by_email(db, email=payload.email)
    if not client or not security.verify_password(payload.password, client.salt, client.pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not client.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    token = security.create_access_token(client.client_id)
    full_name = f"{client.fname} {client.lname}".strip() or client.email

    return schemas.LoginResponse(
        message=f"Welcome back, {full_name}!",
        token=token,
        client_name=full_name,
    )


@app.post("/auth/employee-login", response_model=schemas.EmployeeLoginResponse)
def employee_login(payload: schemas.EmployeeLoginRequest, db: Session = Depends(get_db)):
    client = crud.find_client_by_email(db, email=payload.email)
    if not client or not security.verify_password(payload.password, client.salt, client.pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not _is_employee_authorized(client.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized employee account.",
        )

    token = security.create_employee_token(client.email.lower())
    full_name = f"{client.fname} {client.lname}".strip() or client.email

    return schemas.EmployeeLoginResponse(
        message=f"Welcome, {full_name}!",
        token=token,
        employee_name=full_name,
    )


@app.get("/workspace", response_model=schemas.WorkspaceResponse)
def get_workspace(
    authorization: Optional[str] = Header(None),
    hospital_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    client = _resolve_client(authorization, None, db)
    hospitals = crud.get_hospitals_for_client(db, client.client_id)
    if hospital_id:
        hospitals = [hospital for hospital in hospitals if hospital.hospital_id == hospital_id]

    hospital_payloads: list[schemas.HospitalSummary] = []
    for hospital in hospitals:
        documents = crud.get_documents_for_hospital(db, hospital.hospital_id)
        document_payloads = [
            schemas.DocumentRead(
                id=document.id,
                file_name=document.file_name,
                file_date=document.file_date
                or (document.create_date.date() if document.create_date else dt_date.today()),
                is_read=document.is_read,
                download_url=f"/api/documents/{document.id}",
            )
            for document in documents
        ]
        hospital_payloads.append(
            schemas.HospitalSummary(
                hospital_id=hospital.hospital_id,
                hospital_name=hospital.hospital_name,
                address=hospital.address,
                city=hospital.city,
                state=hospital.state,
                zip=hospital.zip,
                documents=document_payloads,
            )
        )

    return schemas.WorkspaceResponse(
        client_name=f"{client.fname} {client.lname}".strip() or client.email,
        hospitals=hospital_payloads,
    )


@app.get("/admin/hospitals", response_model=list[schemas.HospitalOption])
def list_admin_hospitals(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _resolve_employee(authorization, token, db)
    hospitals = crud.get_all_active_hospitals(db)
    return [
        schemas.HospitalOption(
            hospital_id=hospital.hospital_id,
            hospital_name=hospital.hospital_name,
            state=hospital.state,
        )
        for hospital in hospitals
    ]


def _sanitize_filename(filename: str) -> str:
    name, dot, extension = filename.rpartition(".")
    base = name if dot else extension
    ext = extension if dot else ""
    sanitized_base = re.sub(r"[^A-Za-z0-9_-]+", "-", base).strip("-") or "document"
    sanitized_ext = re.sub(r"[^A-Za-z0-9]", "", ext)
    return f"{sanitized_base}.{sanitized_ext}" if sanitized_ext else sanitized_base


@app.post("/admin/documents", response_model=schemas.DocumentUploadResponse)
async def upload_documents(
    hospital_id: int = Form(...),
    requisition_number: Optional[str] = Form(None),
    files: list[UploadFile] = File(...),
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _resolve_employee(authorization, token, db)

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided.")

    hospital = crud.get_hospital_by_id(db, hospital_id)
    if hospital is None or not hospital.isActive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")

    if hospital_id in HOSPITALS_REQUIRE_REQUISITION and not (requisition_number or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requisition number is required for this hospital.",
        )

    stored_documents: list[schemas.UploadedDocument] = []
    for file in files:
        original_name = file.filename or "document"
        extension = (Path(original_name).suffix.lstrip(".") or "").lower()
        if extension not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed: {original_name}",
            )

        contents = await file.read()
        if len(contents) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large: {original_name}",
            )

        safe_name = _sanitize_filename(original_name)
        target_dir = DOCUMENT_STORAGE_ROOT / f"hospital-{hospital_id}"
        target_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{int(dt_date.today().strftime('%Y%m%d'))}_{safe_name}"
        destination = target_dir / stored_name
        destination.write_bytes(contents)

        relative_path = destination.relative_to(DOCUMENT_STORAGE_ROOT)
        document = crud.create_document_record(
            db,
            hospital_id=hospital_id,
            file_name=original_name,
            stored_path=str(relative_path),
            file_date=dt_date.today(),
        )

        stored_documents.append(
            schemas.UploadedDocument(
                id=document.id,
                file_name=document.file_name,
                file_date=document.file_date,
                download_url=f"/api/documents/{document.id}",
            )
        )

    db.commit()

    message = f"Uploaded {len(stored_documents)} file(s) for {hospital.hospital_name}."
    if requisition_number:
        message += f" Requisition: {requisition_number.strip()}"

    return schemas.DocumentUploadResponse(
        hospital_id=hospital.hospital_id,
        hospital_name=hospital.hospital_name,
        uploaded=stored_documents,
        message=message,
        requisition_number=requisition_number.strip() if requisition_number else None,
    )


@app.get("/documents/{document_id}")
def download_document(
    document_id: int,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    staff_access = False
    try:
        _resolve_employee(authorization, token, db)
        staff_access = True
    except HTTPException:
        staff_access = False

    if staff_access:
        hospitals = {hospital.hospital_id for hospital in crud.get_all_active_hospitals(db)}
    else:
        client = _resolve_client(authorization, token, db)
        hospitals = {hospital.hospital_id for hospital in crud.get_hospitals_for_client(db, client.client_id)}
    document = db.get(models.Document, document_id)
    if document is None or document.hospital_id not in hospitals:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if document.document and isinstance(document.document, (bytes, bytearray)):
        headers = {
            "Content-Disposition": f'attachment; filename="{document.file_name}"',
        }
        document.is_read = True
        db.add(document)
        db.commit()
        return Response(content=document.document, media_type="application/octet-stream", headers=headers)

    candidate_paths: list[Path] = []
    if document.document and isinstance(document.document, str):
        candidate_paths.append(Path(document.document))
    candidate_paths.append(DOCUMENT_STORAGE_ROOT / document.file_name)

    for candidate in candidate_paths:
        if not candidate:
            continue
        candidate_path = candidate if candidate.is_absolute() else DOCUMENT_STORAGE_ROOT / candidate
        try:
            resolved = candidate_path.resolve(strict=True)
        except FileNotFoundError:
            continue

        try:
            resolved.relative_to(DOCUMENT_STORAGE_ROOT)
        except ValueError:
            continue

        if resolved.is_file():
            document.is_read = True
            db.add(document)
            db.commit()
            return FileResponse(
                resolved,
                media_type="application/octet-stream",
                filename=document.file_name,
            )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document content unavailable.")
