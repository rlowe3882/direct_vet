import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  fetchStates,
  submitRegistration,
  loginUser,
  fetchWorkspace,
  loginEmployee,
  fetchAdminHospitals,
  uploadDocuments,
} from "./api";
import type {
  LoginPayload,
  PaymentType,
  RegistrationPayload,
  StateOption,
  WorkspaceResponse,
  HospitalOption,
  UploadedDocument,
} from "./types";

const todayIso = new Date().toISOString().slice(0, 10);

type ViewMode = "register" | "login" | "workspace" | "staff";

const emptyForm: RegistrationPayload = {
  accept_policy: false,
  hospital_profile_name: "",
  billing_contact_name: "",
  billing_contact_phone: "",
  invoice_email: "",
  invoice_email_secondary: "",
  payment_type: "checking",
  signature: "",
  signature_date: todayIso,
  hospital_name: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  fax: "",
  first_name: "",
  last_name: "",
  email: "",
  confirm_email: "",
  password: "",
};

const emptyLogin: LoginPayload = {
  email: "",
  password: "",
};

const REQUISITION_REQUIRED_IDS = new Set<number>([149]);

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("register");
  const [form, setForm] = useState<RegistrationPayload>(emptyForm);
  const [states, setStates] = useState<StateOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginPayload>(emptyLogin);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceResponse | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);

  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffHospitals, setStaffHospitals] = useState<HospitalOption[]>([]);
  const [staffHospitalsLoading, setStaffHospitalsLoading] = useState(false);
  const [staffSelectedHospital, setStaffSelectedHospital] = useState<string>("");
  const [staffRequisitionNumber, setStaffRequisitionNumber] = useState<string>("");
  const [staffFiles, setStaffFiles] = useState<File[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffUploadMessage, setStaffUploadMessage] = useState<string | null>(null);
  const [staffUploadedDocs, setStaffUploadedDocs] = useState<UploadedDocument[]>([]);
  const [staffIsUploading, setStaffIsUploading] = useState(false);
  const [staffIsLoggingIn, setStaffIsLoggingIn] = useState(false);
  const [staffFileInputKey, setStaffFileInputKey] = useState(0);

  const resetClientSession = (message?: string) => {
    setAuthToken(null);
    setWorkspaceData(null);
    setSelectedHospitalId(null);
    setWorkspaceError(null);
    setWorkspaceLoading(false);
    setViewMode("login");
    setLoginForm(() => ({ ...emptyLogin }));
    setLoginError(message ?? null);
  };

  const handleStaffLogout = (message?: string) => {
    setViewMode("staff");
    setStaffToken(null);
    setStaffName(null);
    setStaffHospitals([]);
    setStaffSelectedHospital("");
    setStaffFiles([]);
    setStaffRequisitionNumber("");
    setStaffError(message ?? null);
    setStaffUploadMessage(null);
    setStaffUploadedDocs([]);
    setStaffIsUploading(false);
    setStaffHospitalsLoading(false);
  };

  useEffect(() => {
    fetchStates()
      .then((stateList) => {
        setStates(stateList);
        if (!form.state && stateList.length > 0) {
          setForm((prev) => ({
            ...prev,
            state: stateList[0].state_abbr,
          }));
        }
      })
      .catch((error) => {
        setSubmitError(error.message);
      })
      .finally(() => setLoadingStates(false));
  }, []);

  useEffect(() => {
    if (viewMode === "register") {
      setLoginError(null);
      setLoginForm(() => ({ ...emptyLogin }));
    }

    if (viewMode !== "register") {
      setSubmitError(null);
      setSubmitSuccess(null);
    }

    if (viewMode === "staff") {
      setLoginError(null);
      setStaffError(null);
      setStaffUploadMessage(null);
      setStaffUploadedDocs([]);
      if (!staffToken) {
        setLoginForm(() => ({ ...emptyLogin }));
      }
    }
  }, [viewMode, staffToken]);

  const emailMismatch = useMemo(
    () =>
      form.email.trim().length > 0 &&
      form.confirm_email.trim().length > 0 &&
      form.email.trim().toLowerCase() !== form.confirm_email.trim().toLowerCase(),
    [form.email, form.confirm_email],
  );

  const isFormInvalid = useMemo(() => {
    const requiredFields: Array<keyof RegistrationPayload> = [
      "hospital_profile_name",
      "billing_contact_name",
      "billing_contact_phone",
      "invoice_email",
      "payment_type",
      "signature",
      "signature_date",
      "hospital_name",
      "address",
      "city",
      "state",
      "zip_code",
      "phone",
      "first_name",
      "last_name",
      "email",
      "confirm_email",
      "password",
    ];
    const missing = requiredFields.some((field) => {
      const value = form[field];
      return typeof value === "string" ? value.trim() === "" : value === undefined;
    });
    return !form.accept_policy || missing || emailMismatch;
  }, [form, emailMismatch]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    const nextValue = type === "checkbox"
      ? (event.target as HTMLInputElement).checked
      : value;
    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handlePaymentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      payment_type: value as PaymentType,
    }));
  };

  const loadWorkspace = async (token: string) => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const data = await fetchWorkspace(token);
      setWorkspaceData(data);
      setSelectedHospitalId((previous) => {
        if (previous && data.hospitals.some((hospital) => hospital.hospital_id === previous)) {
          return previous;
        }
        return data.hospitals[0]?.hospital_id ?? null;
      });
    } catch (error) {
      if (error instanceof Error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) {
          resetClientSession("Session expired. Please log in again.");
          return;
        }
        setWorkspaceError(error.message);
      } else {
        setWorkspaceError("Unable to load workspace data.");
      }
    } finally {
      setWorkspaceLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "workspace" && authToken && !workspaceData && !workspaceLoading) {
      void loadWorkspace(authToken);
    }
  }, [viewMode, authToken, workspaceData, workspaceLoading]);

  const loadStaffHospitals = async (token: string) => {
    setStaffHospitalsLoading(true);
    setStaffError(null);
    try {
      const response = await fetchAdminHospitals(token);
      setStaffHospitals(response);
      if (response.length > 0) {
        setStaffSelectedHospital((previous) => {
          if (previous && response.some((hospital) => hospital.hospital_id === Number(previous))) {
            return previous;
          }
          return String(response[0].hospital_id);
        });
      }
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        handleStaffLogout("Session expired. Please log in again.");
        return;
      }
      if (error instanceof Error) {
        setStaffError(error.message);
      } else {
        setStaffError("Unable to load hospitals.");
      }
    } finally {
      setStaffHospitalsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "staff" && staffToken && !staffHospitalsLoading && staffHospitals.length === 0) {
      void loadStaffHospitals(staffToken);
    }
  }, [viewMode, staffToken, staffHospitalsLoading, staffHospitals.length]);

  const resetForm = () => {
    setForm({
      ...emptyForm,
      state: states.length > 0 ? states[0].state_abbr : "",
      signature_date: todayIso,
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleViewChange = (mode: ViewMode) => {
    if (mode !== viewMode) {
      setViewMode(mode);
    }
  };

  const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await loginUser({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      setAuthToken(response.token);
      await loadWorkspace(response.token);
      setViewMode("workspace");
      setLoginForm(() => ({ ...emptyLogin }));
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message);
      } else {
        setLoginError("An unexpected error occurred.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStaffError(null);
    setStaffUploadMessage(null);
    setStaffUploadedDocs([]);
    setStaffHospitals([]);
    setStaffHospitalsLoading(false);
    setStaffSelectedHospital("");
    setStaffToken(null);
    setStaffName(null);
    setStaffIsLoggingIn(true);

    try {
      const response = await loginEmployee({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      setStaffToken(response.token);
      setStaffName(response.employee_name);
      setViewMode("staff");
      setLoginForm(() => ({ ...emptyLogin }));
      await loadStaffHospitals(response.token);
      setStaffError(null);
    } catch (error) {
      if (error instanceof Error) {
        setStaffError(error.message);
      } else {
        setStaffError("Unable to log in at this time.");
      }
    } finally {
      setStaffIsLoggingIn(false);
    }
  };

  const handleStaffHospitalChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStaffSelectedHospital(event.target.value);
  };

  const handleStaffRequisitionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStaffRequisitionNumber(event.target.value);
  };

  const handleStaffFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setStaffFiles(files);
  };

  const removeStaffFile = (index: number) => {
    setStaffFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleStaffUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStaffError(null);
    setStaffUploadMessage(null);
    setStaffUploadedDocs([]);

    if (!staffToken) {
      setStaffError("Please log in first.");
      return;
    }

    const hospitalId = Number(staffSelectedHospital);
    if (!hospitalId || Number.isNaN(hospitalId)) {
      setStaffError("Select a hospital to continue.");
      return;
    }

    if (REQUISITION_REQUIRED_IDS.has(hospitalId) && !staffRequisitionNumber.trim()) {
      setStaffError("Requisition number is required for this hospital.");
      return;
    }

    if (staffFiles.length === 0) {
      setStaffError("Please choose at least one file to upload.");
      return;
    }

    setStaffIsUploading(true);

    try {
      const response = await uploadDocuments(staffToken, {
        hospital_id: hospitalId,
        requisition_number: staffRequisitionNumber.trim() || undefined,
        files: staffFiles,
      });
      setStaffError(null);
      setStaffUploadMessage(response.message);
      setStaffUploadedDocs(response.uploaded);
      setStaffFiles([]);
      setStaffRequisitionNumber("");
      setStaffFileInputKey((prev) => prev + 1);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        handleStaffLogout("Session expired. Please log in again.");
        return;
      }
      if (error instanceof Error) {
        setStaffError(error.message);
      } else {
        setStaffError("Upload failed. Please try again.");
      }
    } finally {
      setStaffIsUploading(false);
    }
  };

  const hospitals = workspaceData?.hospitals ?? [];
  const currentHospital = useMemo(() => {
    if (!hospitals.length) {
      return null;
    }
    const targetId = selectedHospitalId ?? hospitals[0].hospital_id;
    return hospitals.find((hospital) => hospital.hospital_id === targetId) ?? hospitals[0];
  }, [hospitals, selectedHospitalId]);

  const documents = currentHospital?.documents ?? [];
  const unreadCount = useMemo(
    () => documents.filter((document) => !document.is_read).length,
    [documents],
  );

  const heroContent = (() => {
    switch (viewMode) {
      case "register":
        return {
          eyebrow: "Client Services",
          title: "PetLabs Diagnostics Registration",
          subtitle:
            "Seamlessly onboard your practice, set up recurring payments, and gain secure access to lab records in one modern workflow.",
          badgeLabel: "Trusted Partner",
          badgeValue: "Since 2016",
        };
      case "login":
        return {
          eyebrow: "Client Portal",
          title: "Secure Login to PetLabs",
          subtitle:
            "Sign in to review lab results, manage requisitions, and stay connected with the diagnostics team in real time.",
          badgeLabel: "Security First",
          badgeValue: "24/7 Access",
        };
      case "workspace": {
        const locationCount = hospitals.length;
        return {
          eyebrow: "Client Workspace",
          title: workspaceData
            ? `Welcome back, ${workspaceData.client_name}`
            : "PetLabs Client Workspace",
          subtitle: locationCount
            ? "Select a location to review lab documents, requisitions, and updates."
            : "Add a practice location or contact support to get started.",
          badgeLabel: "Active Locations",
          badgeValue: locationCount ? `${locationCount} ${locationCount === 1 ? "Location" : "Locations"}` : "Getting Started",
        };
      }
      case "staff": {
        const locationCount = staffHospitals.length;
        return {
          eyebrow: "Staff Workspace",
          title: staffName ? `Hello, ${staffName}` : "PetLabs Staff Uploads",
          subtitle: locationCount
            ? "Select a hospital to upload new requisitions, reports, or announcements."
            : "Authenticate to access client hospitals and manage their documents.",
          badgeLabel: "Hospitals",
          badgeValue: locationCount ? `${locationCount} available` : "Awaiting login",
        };
      }
      default:
        return {
          eyebrow: "PetLabs Diagnostics",
          title: "Client Portal",
          subtitle: "Access the tools you need to run your practice efficiently.",
          badgeLabel: "Diagnostics Partner",
          badgeValue: "Always On",
        };
    }
  })();

  const viewButtonClass = (mode: ViewMode) =>
    mode === viewMode ? "view-toggle__button view-toggle__button--active" : "view-toggle__button";

  const isLoginDisabled =
    loginForm.email.trim() === "" || loginForm.password.trim().length < 6 || isLoggingIn;

  const isStaffLoginDisabled =
    loginForm.email.trim() === "" || loginForm.password.trim().length < 6 || staffIsLoggingIn;

  const staffSelectedHospitalOption = staffSelectedHospital
    ? staffHospitals.find((hospital) => hospital.hospital_id === Number(staffSelectedHospital))
    : undefined;

  const staffRequiresRequisition = staffSelectedHospitalOption
    ? REQUISITION_REQUIRED_IDS.has(staffSelectedHospitalOption.hospital_id)
    : false;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: RegistrationPayload = {
        ...form,
        invoice_email_secondary: form.invoice_email_secondary?.trim() || undefined,
        fax: form.fax?.trim() || undefined,
      };
      await submitRegistration(payload);
      resetForm();
      setSubmitSuccess("Registration submitted successfully.");
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHospitalSelect = (hospitalId: number) => {
    setSelectedHospitalId(hospitalId);
  };

  const formatDocumentDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">{heroContent.eyebrow}</p>
          <h1 className="hero__title">{heroContent.title}</h1>
          <p className="hero__subtitle">{heroContent.subtitle}</p>
        </div>
        <div className="hero__badge">
          <span className="hero__badge-label">{heroContent.badgeLabel}</span>
          <span className="hero__badge-value">{heroContent.badgeValue}</span>
        </div>
      </header>

      <main className="app">
        {viewMode !== "workspace" ? (
          <nav className="view-toggle" aria-label="Registration or login selection">
            <button
              type="button"
              className={viewButtonClass("register")}
              onClick={() => handleViewChange("register")}
              aria-pressed={viewMode === "register"}
            >
              Register
            </button>
            <button
              type="button"
              className={viewButtonClass("login")}
              onClick={() => handleViewChange("login")}
              aria-pressed={viewMode === "login"}
            >
              Log in
            </button>
            <button
              type="button"
              className={viewButtonClass("staff")}
              onClick={() => handleViewChange("staff")}
              aria-pressed={viewMode === "staff"}
            >
              Staff
            </button>
          </nav>
        ) : (
          <div className="workspace-toolbar" role="region" aria-label="Workspace actions">
            <div className="workspace-toolbar__meta">
              <span>Signed in as&nbsp;</span>
              <strong>{workspaceData?.client_name ?? "PetLabs Client"}</strong>
            </div>
            <div className="workspace-toolbar__actions">
              <button type="button" className="link-button" onClick={() => resetClientSession()}>
                Log out
              </button>
            </div>
          </div>
        )}

        {viewMode === "register" && (
          <div className="layout-grid">
            <section className="form-card">
              <div className="form-card__header">
                <h2>Complete Your Practice Profile</h2>
                <p>
                  Please fill out each section so our onboarding specialists can get you
                  live without delay.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <fieldset className="form-section">
                  <legend>Credit Policy</legend>
                  <div className="section-intro">
                    <h3 className="section-title">Review and accept the policy</h3>
                    <p>
                      Invoices are issued monthly for the previous month’s requisitions.
                      Automatic payments are processed on the first of each month via your
                      preferred payment method on file.
                    </p>
                  </div>
                  <label className="inline-checkbox">
                    <input
                      type="checkbox"
                      name="accept_policy"
                      checked={form.accept_policy}
                      onChange={handleChange}
                    />
                    <span>
                      I have read and understand the PetLabs Diagnostic Laboratories Inc.
                      Credit Policy.
                    </span>
                  </label>
                  {!form.accept_policy && (
                    <p className="error-text">Please accept the credit policy to continue.</p>
                  )}
                </fieldset>

                <fieldset className="form-section">
                  <legend>Recurring Payment Authorization</legend>
                  <div className="section-intro">
                    <h3 className="section-title">Payment preferences</h3>
                    <p>
                      Choose how you would like to handle your monthly billing. Our team will
                      follow up to collect the secure payment details.
                    </p>
                  </div>
                  <div className="grid two-column">
                    <label>
                      Practice display name
                      <input
                        name="hospital_profile_name"
                        value={form.hospital_profile_name}
                        onChange={handleChange}
                        placeholder="e.g. Northview Animal Clinic"
                        required
                      />
                    </label>
                    <label>
                      Billing contact name
                      <input
                        name="billing_contact_name"
                        value={form.billing_contact_name}
                        onChange={handleChange}
                        placeholder="Full name"
                        required
                      />
                    </label>
                    <label>
                      Billing contact phone
                      <input
                        name="billing_contact_phone"
                        value={form.billing_contact_phone}
                        onChange={handleChange}
                        placeholder="(000) 000-0000"
                        required
                      />
                    </label>
                    <label>
                      Invoice email
                      <input
                        name="invoice_email"
                        type="email"
                        value={form.invoice_email}
                        onChange={handleChange}
                        placeholder="billing@yourpractice.com"
                        required
                      />
                    </label>
                    <label>
                      Secondary invoice email (optional)
                      <input
                        name="invoice_email_secondary"
                        type="email"
                        value={form.invoice_email_secondary}
                        onChange={handleChange}
                        placeholder="finance@yourpractice.com"
                      />
                    </label>
                  </div>

                  <div className="radio-cluster">
                    <span className="radio-label">I prefer to pay via:</span>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="payment_type"
                          value="checking"
                          checked={form.payment_type === "checking"}
                          onChange={handlePaymentChange}
                        />
                        <span>Bank draft from my checking account</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="payment_type"
                          value="credit_card"
                          checked={form.payment_type === "credit_card"}
                          onChange={handlePaymentChange}
                        />
                        <span>Credit card</span>
                      </label>
                    </div>
                    <p className="help-text">
                      A billing representative will contact you within one business day to
                      securely gather payment information.
                    </p>
                  </div>

                  <div className="grid two-column">
                    <label>
                      Electronic signature
                      <input
                        name="signature"
                        value={form.signature}
                        onChange={handleChange}
                        placeholder="Type full name"
                        required
                      />
                    </label>
                    <label>
                      Signature date
                      <input
                        name="signature_date"
                        type="date"
                        value={form.signature_date}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend>Account Registration</legend>
                  <div className="section-intro">
                    <h3 className="section-title">Practice contact details</h3>
                    <p>
                      Provide the primary address and contact information for your practice.
                      This ensures we connect the right team members with your diagnostic
                      results.
                    </p>
                  </div>
                  <div className="grid two-column">
                    <label>
                      Hospital legal name
                      <input
                        name="hospital_name"
                        value={form.hospital_name}
                        onChange={handleChange}
                        placeholder="Registered hospital name"
                        required
                      />
                    </label>
                    <label>
                      Street address
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Street, suite, or unit"
                        required
                      />
                    </label>
                    <label>
                      City
                      <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="City"
                        required
                      />
                    </label>
                    <label>
                      State
                      <select
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        disabled={loadingStates}
                        required
                      >
                        <option value="">Select</option>
                        {states.map((state) => (
                          <option key={state.state_abbr} value={state.state_abbr}>
                            {state.state} ({state.state_abbr})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Zip / Postal code
                      <input
                        name="zip_code"
                        value={form.zip_code}
                        onChange={handleChange}
                        placeholder="Postal code"
                        required
                      />
                    </label>
                    <label>
                      Main phone
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="(000) 000-0000"
                        required
                      />
                    </label>
                    <label>
                      Fax (optional)
                      <input
                        name="fax"
                        value={form.fax}
                        onChange={handleChange}
                        placeholder="(000) 000-0000"
                      />
                    </label>
                    <label>
                      Primary contact first name
                      <input
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                        placeholder="First name"
                        required
                      />
                    </label>
                    <label>
                      Primary contact last name
                      <input
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                        placeholder="Last name"
                        required
                      />
                    </label>
                    <label>
                      Account email
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="name@yourpractice.com"
                        required
                      />
                    </label>
                    <label>
                      Confirm email
                      <input
                        name="confirm_email"
                        type="email"
                        value={form.confirm_email}
                        onChange={handleChange}
                        placeholder="Re-enter email"
                        required
                      />
                    </label>
                    <label>
                      Create password (6-20 characters)
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength={6}
                      maxLength={20}
                      placeholder="Choose a secure password"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </div>
                  {emailMismatch && (
                    <p className="error-text">Email addresses do not match.</p>
                  )}
                </fieldset>

                <div className="form-card__footer">
                  {submitError && <div className="banner banner--error">{submitError}</div>}
                  {submitSuccess && (
                    <div className="banner banner--success">{submitSuccess}</div>
                  )}

                  <div className="actions">
                    <button type="button" onClick={resetForm} disabled={isSubmitting}>
                      Clear form
                    </button>
                    <button type="submit" disabled={isSubmitting || isFormInvalid}>
                      {isSubmitting ? "Submitting..." : "Submit registration"}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <aside className="insight-card">
              <h2>Why partner with PetLabs</h2>
              <ul className="insight-list">
                <li>
                  <strong>Dedicated onboarding.</strong> A diagnostics specialist guides every
                  new partner through the first 30 days.
                </li>
                <li>
                  <strong>Real-time reporting.</strong> Access finalized results the moment
                  they are released in the portal.
                </li>
                <li>
                  <strong>Flexible billing.</strong> Choose the payment cadence and contact
                  preferences that keep your practice organized.
                </li>
              </ul>
              <div className="insight-cta">
                <p>Have questions before submitting?</p>
                <a href="tel:13302206435">Call 330-220-6435</a>
                <span>Mon–Fri · 8:00 AM – 6:00 PM EST</span>
              </div>
            </aside>
          </div>
        )}

        {viewMode === "login" && (
          <div className="layout-grid layout-grid--login">
            <section className="form-card">
              <div className="form-card__header">
                <h2>Access Your Diagnostics Portal</h2>
                <p>Enter your credentials to continue to the secure dashboard.</p>
              </div>
              <form onSubmit={handleLoginSubmit} noValidate>
                <fieldset className="form-section">
                  <legend>Account Login</legend>
                  <div className="section-intro">
                    <h3 className="section-title">Welcome back</h3>
                    <p>Use the email associated with your PetLabs account to sign in.</p>
                  </div>
                  <div className="grid">
                    <label>
                      Account email
                      <input
                        name="email"
                        type="email"
                        value={loginForm.email}
                        onChange={handleLoginChange}
                        placeholder="name@yourpractice.com"
                        autoComplete="username"
                        required
                      />
                    </label>
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        placeholder="Enter your password"
                        minLength={6}
                        autoComplete="current-password"
                        required
                      />
                    </label>
                  </div>
                  <div className="help-links">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleViewChange("register")}
                    >
                      Need an account? Start registration
                    </button>
                    <a className="link-button" href="mailto:info@petlabsdiagnostics.com">
                      Forgot password? Contact support
                    </a>
                  </div>
                </fieldset>
                <div className="form-card__footer">
                  {loginError && <div className="banner banner--error">{loginError}</div>}
                  <div className="actions">
                    <button type="submit" disabled={isLoginDisabled}>
                      {isLoggingIn ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                </div>
              </form>
            </section>
            <aside className="insight-card insight-card--login">
              <h2>Security you can trust</h2>
              <ul className="insight-list">
                <li>
                  <strong>Encrypted access.</strong> Industry-standard encryption keeps your
                  laboratory data protected.
                </li>
                <li>
                  <strong>Unified records.</strong> Review requisitions, invoices, and results
                  from one intuitive dashboard.
                </li>
                <li>
                  <strong>Always available.</strong> Secure availability across desktop,
                  tablet, and mobile devices.
                </li>
              </ul>
              <div className="insight-cta">
                <p>Need immediate assistance?</p>
                <a href="tel:13302206435">Call 330-220-6435</a>
                <span>Support · Mon–Fri · 8:00 AM – 6:00 PM EST</span>
              </div>
            </aside>
          </div>
        )}

        {viewMode === "staff" && (
          <div className="staff-area">
            {staffToken ? (
              <section className="staff-card">
                <div className="staff-card__header">
                  <h2>Upload documents for clients</h2>
                  <p>Select a hospital and upload the files that should appear in the client workspace.</p>
                  <div className="staff-card__meta">
                    <span>{staffName ? `Signed in as ${staffName}` : "Staff session"}</span>
                    <button type="button" className="link-button" onClick={() => handleStaffLogout()}>
                      Log out
                    </button>
                  </div>
                </div>
                <form onSubmit={handleStaffUploadSubmit} className="staff-form" noValidate>
                  {staffHospitalsLoading && <div className="banner banner--info">Loading hospitals…</div>}
                  <label>
                    Hospital
                    <select
                      name="staff_hospital"
                      value={staffSelectedHospital}
                      onChange={handleStaffHospitalChange}
                      disabled={staffHospitalsLoading}
                      required
                    >
                      <option value="">Select hospital</option>
                      {staffHospitals.map((hospital) => (
                        <option key={hospital.hospital_id} value={hospital.hospital_id}>
                          {hospital.hospital_name}
                          {hospital.state ? ` (${hospital.state})` : ""}
                        </option>
                      ))}
                    </select>
                    {!staffHospitalsLoading && staffHospitals.length === 0 && (
                      <span className="help-text">No active hospitals available.</span>
                    )}
                  </label>

                  <label>
                    Requisition number
                    <input
                      type="text"
                      name="staff_requisition"
                      value={staffRequisitionNumber}
                      onChange={handleStaffRequisitionChange}
                      placeholder="Required for select hospitals"
                      className={staffRequiresRequisition ? "required" : ""}
                      required={staffRequiresRequisition}
                    />
                    {staffRequiresRequisition ? (
                      <span className="help-text">This hospital requires a requisition number (e.g., US12345-DR678).</span>
                    ) : (
                      <span className="help-text">Optional unless specified by the hospital.</span>
                    )}
                  </label>

                  <label className="staff-file-picker">
                    Documents
                    <input key={staffFileInputKey} type="file" multiple onChange={handleStaffFileChange} />
                    <span className="help-text">Accepted: PDF, DOC, DOCX, TXT, XLS, XLSX, RTF · Max 2 MB per file.</span>
                  </label>

                  {staffFiles.length > 0 && (
                    <ul className="file-list">
                      {staffFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <span>{file.name}</span>
                          <button type="button" onClick={() => removeStaffFile(index)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {staffError && <div className="banner banner--error">{staffError}</div>}
                  {staffUploadMessage && <div className="banner banner--success">{staffUploadMessage}</div>}

                  <div className="actions">
                    <button type="submit" disabled={staffIsUploading}>
                      {staffIsUploading ? "Uploading..." : "Upload documents"}
                    </button>
                  </div>
                </form>

                {staffUploadedDocs.length > 0 && (
                  <div className="staff-results">
                    <h3>Recent uploads</h3>
                    <ul>
                      {staffUploadedDocs.map((doc) => {
                        const downloadHref = staffToken
                          ? `${doc.download_url}?token=${encodeURIComponent(staffToken)}`
                          : doc.download_url;
                        return (
                          <li key={doc.id}>
                            <span>{doc.file_name}</span>
                            <div className="staff-results__actions">
                              <span>{formatDocumentDate(doc.file_date)}</span>
                              <a href={downloadHref} download={doc.file_name}>
                                Download
                              </a>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            ) : (
              <section className="staff-login-card">
                <h2>Staff access</h2>
                <p>Enter your employee credentials to upload documents for clinics.</p>
                <form onSubmit={handleStaffLoginSubmit} className="staff-login-form" noValidate>
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {staffError && <div className="banner banner--error">{staffError}</div>}
                  <div className="actions">
                    <button type="submit" disabled={isStaffLoginDisabled}>
                      {staffIsLoggingIn ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        )}

        {viewMode === "workspace" && (
          <div className="workspace-grid">
            <aside className="workspace-locations" aria-label="Practice locations">
              <div className="workspace-locations__header">
                <h2>Practice Locations</h2>
                <p>Choose a location to view its latest documents.</p>
              </div>
              {workspaceError && <div className="banner banner--error">{workspaceError}</div>}
              {workspaceLoading ? (
                <div className="workspace-empty">Loading workspace…</div>
              ) : hospitals.length === 0 ? (
                <div className="workspace-empty">
                  No active locations are linked to this account yet.
                </div>
              ) : (
                <ul className="workspace-location-list">
                  {hospitals.map((hospital) => {
                    const isActive = currentHospital?.hospital_id === hospital.hospital_id;
                    const documentCount = hospital.documents.length;
                    return (
                      <li key={hospital.hospital_id}>
                        <button
                          type="button"
                          className={
                            isActive
                              ? "workspace-location workspace-location--active"
                              : "workspace-location"
                          }
                          onClick={() => handleHospitalSelect(hospital.hospital_id)}
                        >
                          <span className="workspace-location__name">{hospital.hospital_name}</span>
                          <span className="workspace-location__meta">
                            {documentCount} {documentCount === 1 ? "document" : "documents"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            <section className="workspace-documents" aria-live="polite">
              {workspaceLoading ? (
                <div className="workspace-empty">Loading documents…</div>
              ) : !currentHospital ? (
                <div className="workspace-empty">
                  Select a practice location to see available documents.
                </div>
              ) : (
                <>
                  <div className="workspace-documents__header">
                    <div>
                      <h2>{currentHospital.hospital_name}</h2>
                      <p>
                        {currentHospital.address}
                        <br />
                        {currentHospital.city}, {currentHospital.state}
                        {currentHospital.zip ? ` ${currentHospital.zip}` : ""}
                      </p>
                    </div>
                    <div className="workspace-documents__summary">
                      <span>
                        {documents.length} {documents.length === 1 ? "document" : "documents"}
                      </span>
                      <span>{unreadCount} unread</span>
                    </div>
                  </div>

                  {documents.length === 0 ? (
                    <div className="workspace-empty workspace-empty--inner">
                      No documents available yet for this location.
                    </div>
                  ) : (
                    <table className="workspace-table">
                      <thead>
                        <tr>
                          <th>File name</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((document) => {
                          const downloadHref = authToken
                            ? `${document.download_url}?token=${encodeURIComponent(authToken)}`
                            : document.download_url;
                          return (
                            <tr
                              key={document.id}
                              className={document.is_read ? "" : "workspace-table__row--unread"}
                            >
                              <td>{document.file_name}</td>
                              <td>{formatDocumentDate(document.file_date)}</td>
                              <td>
                                <a
                                  className="primary-link primary-link--inline"
                                  href={downloadHref}
                                  download={document.file_name}
                                >
                                  Download
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
