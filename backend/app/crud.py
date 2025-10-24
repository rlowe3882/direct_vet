from datetime import date
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import models, schemas


def get_states(db: Session) -> list[models.State]:
    stmt = select(models.State).order_by(models.State.state)
    return list(db.scalars(stmt))


def find_hospital_duplicate(
    db: Session,
    hospital_name: str,
    address: str,
) -> Optional[models.Hospital]:
    pattern_name = f"%{hospital_name}%"
    pattern_address = f"%{address}%"
    stmt = (
        select(models.Hospital)
        .where(
            models.Hospital.isActive.is_(True),
            or_(
                func.lower(models.Hospital.hospital_name).like(func.lower(pattern_name)),
                func.lower(models.Hospital.address).like(func.lower(pattern_address)),
            ),
        )
        .limit(1)
    )
    return db.scalars(stmt).first()


def find_client_by_email(db: Session, email: str) -> Optional[models.Client]:
    stmt = (
        select(models.Client)
        .where(
            func.lower(models.Client.email) == func.lower(email),
            models.Client.isActive.is_(True),
        )
        .limit(1)
    )
    return db.scalars(stmt).first()


def create_registration(
    db: Session,
    payload: schemas.RegistrationCreate,
    password_hash: str,
    salt: str,
) -> tuple[models.Registration, models.Client, models.Hospital]:
    hospital = models.Hospital(
        hospital_name=payload.hospital_name,
        address=payload.address,
        city=payload.city,
        state=payload.state.upper(),
        zip=payload.zip_code,
        isActive=True,
    )
    db.add(hospital)
    db.flush()

    client = models.Client(
        email=payload.email.lower(),
        pwd=password_hash,
        salt=salt,
        hospital_id=hospital.hospital_id,
        phone=payload.phone,
        fax=payload.fax,
        fname=payload.first_name,
        lname=payload.last_name,
        date=date.today(),
        isActive=True,
    )
    db.add(client)
    db.flush()

    registration = models.Registration(
        hospital_id=hospital.hospital_id,
        hospital_name=payload.hospital_profile_name,
        state=payload.state.upper(),
        contact_name=payload.billing_contact_name,
        contact_number=payload.billing_contact_phone,
        contact_email=payload.invoice_email,
        contact_email2=payload.invoice_email_secondary,
        electronic_signature=payload.signature,
        registration_date=payload.signature_date,
        payment_type=payload.payment_type,
    )
    db.add(registration)

    return registration, client, hospital


def get_hospitals_for_client(db: Session, client_id: int) -> list[models.Hospital]:
    stmt = (
        select(models.Hospital)
        .where(
            models.Hospital.client_id == client_id,
            models.Hospital.isActive.is_(True),
        )
        .order_by(models.Hospital.hospital_name.asc())
    )
    return list(db.scalars(stmt))


def get_documents_for_hospital(db: Session, hospital_id: int) -> list[models.Document]:
    stmt = (
        select(models.Document)
        .where(models.Document.hospital_id == hospital_id)
        .order_by(models.Document.create_date.desc())
    )
    return list(db.scalars(stmt))


def get_all_active_hospitals(db: Session) -> list[models.Hospital]:
    stmt = (
        select(models.Hospital)
        .where(models.Hospital.isActive.is_(True))
        .order_by(models.Hospital.hospital_name.asc())
    )
    return list(db.scalars(stmt))


def get_hospital_by_id(db: Session, hospital_id: int) -> Optional[models.Hospital]:
    return db.get(models.Hospital, hospital_id)


def create_document_record(
    db: Session,
    *,
    hospital_id: int,
    file_name: str,
    stored_path: str,
    file_date: date,
) -> models.Document:
    document = models.Document(
        hospital_id=hospital_id,
        file_name=file_name,
        file_date=file_date,
        document=stored_path,
        is_read=False,
    )
    db.add(document)
    db.flush()
    db.refresh(document)
    return document
