const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
export async function fetchStates() {
    const response = await fetch(`${API_BASE}/states`);
    if (!response.ok) {
        throw new Error("Unable to load states.");
    }
    return response.json();
}
export async function submitRegistration(payload) {
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
export async function loginUser(payload) {
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
    return response.json();
}
export async function fetchWorkspace(token, hospitalId) {
    const query = hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : "";
    const response = await fetch(`${API_BASE}/workspace${query}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to load workspace.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function loginEmployee(payload) {
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
    return response.json();
}
export async function fetchAdminHospitals(token) {
    const response = await fetch(`${API_BASE}/admin/hospitals`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to load hospitals.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function uploadDocuments(token, payload) {
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
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function fetchAdminClients(token) {
    const response = await fetch(`${API_BASE}/admin/clients`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to load clients.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function fetchClientDocuments(token, clientId) {
    const response = await fetch(`${API_BASE}/admin/clients/${clientId}/documents`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to load client documents.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function grantEmployeeAccess(token, clientId) {
    const response = await fetch(`${API_BASE}/admin/clients/${clientId}/employee`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to grant employee access.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export async function revokeEmployeeAccess(token, clientId) {
    const response = await fetch(`${API_BASE}/admin/clients/${clientId}/employee`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody && errorBody.detail) || "Unable to revoke employee access.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
