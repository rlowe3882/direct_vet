from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, constr, validator


class StateRead(BaseModel):
    state_abbr: constr(min_length=2, max_length=2)
    state: str

    class Config:
        orm_mode = True


class ClientAdminSummary(BaseModel):
    client_id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: str
    hospital_name: str
    address: str
    city: str
    state: str
    zip: Optional[str]
    is_employee: bool


class EmployeeAccountStatus(BaseModel):
    client_id: int
    email: EmailStr
    is_employee: bool
    created_at: Optional[datetime] = None


class RegistrationCreate(BaseModel):
    accept_policy: bool = Field(..., description="User acknowledgement of the credit policy.")
    hospital_profile_name: constr(strip_whitespace=True, min_length=1, max_length=128)
    billing_contact_name: constr(strip_whitespace=True, min_length=1, max_length=128)
    billing_contact_phone: constr(strip_whitespace=True, min_length=7, max_length=32)
    invoice_email: EmailStr
    invoice_email_secondary: Optional[EmailStr] = None
    payment_type: Literal["checking", "credit_card"]
    signature: constr(strip_whitespace=True, min_length=1, max_length=128)
    signature_date: date

    hospital_name: constr(strip_whitespace=True, min_length=1, max_length=128)
    address: constr(strip_whitespace=True, min_length=1, max_length=255)
    city: constr(strip_whitespace=True, min_length=1, max_length=128)
    state: constr(strip_whitespace=True, min_length=2, max_length=2)
    zip_code: constr(strip_whitespace=True, min_length=5, max_length=10)
    phone: constr(strip_whitespace=True, min_length=7, max_length=32)
    fax: Optional[constr(strip_whitespace=True, min_length=7, max_length=32)] = None

    first_name: constr(strip_whitespace=True, min_length=1, max_length=64)
    last_name: constr(strip_whitespace=True, min_length=1, max_length=64)
    email: EmailStr
    confirm_email: EmailStr
    password: constr(min_length=6, max_length=20)

    @validator("confirm_email")
    def emails_match(cls, value: EmailStr, values) -> EmailStr:
        if "email" in values and value.lower() != values["email"].lower():
            raise ValueError("Email addresses do not match.")
        return value

    @validator("accept_policy")
    def policy_must_be_accepted(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Policy must be accepted.")
        return value


class RegistrationRead(BaseModel):
    registration_id: int
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=128)


class DocumentRead(BaseModel):
    id: int
    file_name: str
    file_date: date
    is_read: bool
    download_url: str


class ClientDocumentSummary(BaseModel):
    document_id: int
    hospital_id: int
    hospital_name: str
    file_name: str
    file_date: date
    assigned_at: datetime
    download_url: str


class HospitalSummary(BaseModel):
    hospital_id: int
    hospital_name: str
    address: str
    city: str
    state: str
    zip: Optional[str]
    documents: List[DocumentRead]


class WorkspaceResponse(BaseModel):
    client_name: str
    hospitals: List[HospitalSummary]


class LoginResponse(BaseModel):
    message: str
    redirect_url: str = "/workspace"
    token: str
    client_name: str


class EmployeeLoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=128)


class EmployeeLoginResponse(BaseModel):
    message: str
    redirect_url: str = "/employee"
    token: str
    employee_name: str


class HospitalOption(BaseModel):
    hospital_id: int
    hospital_name: str
    state: Optional[str] = None


class UploadedDocument(BaseModel):
    id: int
    file_name: str
    file_date: date
    download_url: str


class DocumentUploadResponse(BaseModel):
    hospital_id: int
    hospital_name: str
    uploaded: List[UploadedDocument]
    message: str
    requisition_number: Optional[str] = None
