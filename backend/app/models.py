from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from .database import Base


class State(Base):
    __tablename__ = "state"

    state_abbr = Column(String(2), primary_key=True, nullable=False)
    state = Column(String(64), nullable=False)


class Hospital(Base):
    __tablename__ = "hospital"

    hospital_id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(128), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(128), nullable=False)
    state = Column(String(2), nullable=False)
    zip = Column(String(10), nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    client_id = Column(Integer, ForeignKey("client.client_id"), nullable=True)


class Client(Base):
    __tablename__ = "client"

    client_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(128), nullable=False, unique=True, index=True)
    pwd = Column(String(128), nullable=False)
    salt = Column(String(32), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospital.hospital_id"), nullable=False)
    phone = Column(String(32), nullable=False)
    fax = Column(String(32), nullable=True)
    fname = Column(String(64), nullable=False)
    lname = Column(String(64), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)


class Registration(Base):
    __tablename__ = "registration"

    registration_id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(128), nullable=False)
    state = Column(String(2), nullable=False)
    contact_name = Column(String(128), nullable=False)
    contact_number = Column(String(32), nullable=False)
    contact_email = Column(String(128), nullable=False)
    contact_email2 = Column(String(128), nullable=True)
    electronic_signature = Column(String(128), nullable=False)
    registration_date = Column(Date, nullable=False)
    payment_type = Column(String(32), nullable=False)
    insert_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospital.hospital_id"), nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id = Column("Id", Integer, primary_key=True, index=True)
    file_name = Column("FileName", String(255), nullable=False)
    file_date = Column("FileDate", Date, nullable=False)
    document = Column("Document", String(512), nullable=True)
    is_read = Column("isRead", Boolean, default=False, nullable=False)
    hospital_id = Column("HospitalId", Integer, ForeignKey("hospital.hospital_id"), nullable=False)
    create_date = Column("CreateDate", DateTime, default=datetime.utcnow, nullable=False)
