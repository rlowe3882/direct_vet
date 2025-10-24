export interface StateOption {
  state_abbr: string;
  state: string;
}

export type PaymentType = "checking" | "credit_card";

export interface RegistrationPayload {
  accept_policy: boolean;
  hospital_profile_name: string;
  billing_contact_name: string;
  billing_contact_phone: string;
  invoice_email: string;
  invoice_email_secondary?: string;
  payment_type: PaymentType;
  signature: string;
  signature_date: string;
  hospital_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  fax?: string;
  first_name: string;
  last_name: string;
  email: string;
  confirm_email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  redirect_url: string;
  token: string;
  client_name: string;
}

export interface EmployeeLoginResponse {
  message: string;
  redirect_url: string;
  token: string;
  employee_name: string;
}

export interface DocumentRecord {
  id: number;
  file_name: string;
  file_date: string;
  is_read: boolean;
  download_url: string;
}

export interface HospitalWorkspace {
  hospital_id: number;
  hospital_name: string;
  address: string;
  city: string;
  state: string;
  zip?: string | null;
  documents: DocumentRecord[];
}

export interface WorkspaceResponse {
  client_name: string;
  hospitals: HospitalWorkspace[];
}

export interface HospitalOption {
  hospital_id: number;
  hospital_name: string;
  state?: string | null;
}

export interface UploadedDocument {
  id: number;
  file_name: string;
  file_date: string;
  download_url: string;
}

export interface DocumentUploadResponse {
  hospital_id: number;
  hospital_name: string;
  uploaded: UploadedDocument[];
  message: string;
  requisition_number?: string | null;
}
