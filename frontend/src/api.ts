import {
  DocumentUploadResponse,
  ClientAdminSummary,
  ClientDocumentSummary,
  EmployeeAccountStatus,
  HospitalOption,
  LoginPayload,
  LoginResponse,
  RegistrationPayload,
  StateOption,
  WorkspaceResponse,
  EmployeeLoginResponse,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export async function fetchStates(): Promise<StateOption[]> {
  const response = await fetch(`${API_BASE}/states`);
  if (!response.ok) {
    throw new Error("Unable to load states.");
  }
  return response.json() as Promise<StateOption[]>;
}

export async function submitRegistration(payload: RegistrationPayload): Promise<void> {
  const response = await fetch(`${API_BASE}/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Registration failed.";
    throw new Error(message);
  }
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Login failed.";
    throw new Error(message);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function fetchWorkspace(
  token: string,
  hospitalId?: number,
): Promise<WorkspaceResponse> {
  const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
  const response = await fetch(`${API_BASE}/workspace${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to load workspace.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<WorkspaceResponse>;
}

export async function loginEmployee(payload: LoginPayload): Promise<EmployeeLoginResponse> {
  const response = await fetch(`${API_BASE}/auth/employee-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Login failed.";
    throw new Error(message);
  }

  return response.json() as Promise<EmployeeLoginResponse>;
}

export async function fetchAdminHospitals(token: string): Promise<HospitalOption[]> {
  const response = await fetch(`${API_BASE}/admin/hospitals`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to load hospitals.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<HospitalOption[]>;
}

export async function uploadDocuments(
  token: string,
  payload: { hospital_id: number; requisition_number?: string; files: File[] },
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("hospital_id", String(payload.hospital_id));
  if (payload.requisition_number) {
    formData.append("requisition_number", payload.requisition_number);
  }
  payload.files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/admin/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Upload failed.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<DocumentUploadResponse>;
}

export async function fetchAdminClients(token: string): Promise<ClientAdminSummary[]> {
  const response = await fetch(`${API_BASE}/admin/clients`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to load clients.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<ClientAdminSummary[]>;
}

export async function fetchClientDocuments(
  token: string,
  clientId: number,
): Promise<ClientDocumentSummary[]> {
  const response = await fetch(`${API_BASE}/admin/clients/${clientId}/documents`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to load client documents.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<ClientDocumentSummary[]>;
}

export async function grantEmployeeAccess(
  token: string,
  clientId: number,
): Promise<EmployeeAccountStatus> {
  const response = await fetch(`${API_BASE}/admin/clients/${clientId}/employee`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to grant employee access.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<EmployeeAccountStatus>;
}

export async function revokeEmployeeAccess(
  token: string,
  clientId: number,
): Promise<EmployeeAccountStatus> {
  const response = await fetch(`${API_BASE}/admin/clients/${clientId}/employee`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.detail) || "Unable to revoke employee access.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<EmployeeAccountStatus>;
}
