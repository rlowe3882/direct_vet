import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchStates, submitRegistration, loginUser, fetchWorkspace, loginEmployee, fetchAdminHospitals, uploadDocuments, } from "./api";
const todayIso = new Date().toISOString().slice(0, 10);
const emptyForm = {
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
const emptyLogin = {
    email: "",
    password: "",
};
const REQUISITION_REQUIRED_IDS = new Set([149]);
export default function App() {
    const [viewMode, setViewMode] = useState("register");
    const [form, setForm] = useState(emptyForm);
    const [states, setStates] = useState([]);
    const [loadingStates, setLoadingStates] = useState(true);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginForm, setLoginForm] = useState(emptyLogin);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [workspaceData, setWorkspaceData] = useState(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [workspaceError, setWorkspaceError] = useState(null);
    const [selectedHospitalId, setSelectedHospitalId] = useState(null);
    const [staffToken, setStaffToken] = useState(null);
    const [staffName, setStaffName] = useState(null);
    const [staffHospitals, setStaffHospitals] = useState([]);
    const [staffHospitalsLoading, setStaffHospitalsLoading] = useState(false);
    const [staffSelectedHospital, setStaffSelectedHospital] = useState("");
    const [staffRequisitionNumber, setStaffRequisitionNumber] = useState("");
    const [staffFiles, setStaffFiles] = useState([]);
    const [staffError, setStaffError] = useState(null);
    const [staffUploadMessage, setStaffUploadMessage] = useState(null);
    const [staffUploadedDocs, setStaffUploadedDocs] = useState([]);
    const [staffIsUploading, setStaffIsUploading] = useState(false);
    const [staffIsLoggingIn, setStaffIsLoggingIn] = useState(false);
    const [staffFileInputKey, setStaffFileInputKey] = useState(0);
    const resetClientSession = (message) => {
        setAuthToken(null);
        setWorkspaceData(null);
        setSelectedHospitalId(null);
        setWorkspaceError(null);
        setWorkspaceLoading(false);
        setViewMode("login");
        setLoginForm(() => ({ ...emptyLogin }));
        setLoginError(message ?? null);
    };
    const handleStaffLogout = (message) => {
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
    const emailMismatch = useMemo(() => form.email.trim().length > 0 &&
        form.confirm_email.trim().length > 0 &&
        form.email.trim().toLowerCase() !== form.confirm_email.trim().toLowerCase(), [form.email, form.confirm_email]);
    const isFormInvalid = useMemo(() => {
        const requiredFields = [
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
    const handleChange = (event) => {
        const { name, value, type } = event.target;
        const nextValue = type === "checkbox"
            ? event.target.checked
            : value;
        setForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }));
    };
    const handlePaymentChange = (event) => {
        const { value } = event.target;
        setForm((prev) => ({
            ...prev,
            payment_type: value,
        }));
    };
    const loadWorkspace = async (token) => {
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
        }
        catch (error) {
            if (error instanceof Error) {
                const status = error.status;
                if (status === 401 || status === 403) {
                    resetClientSession("Session expired. Please log in again.");
                    return;
                }
                setWorkspaceError(error.message);
            }
            else {
                setWorkspaceError("Unable to load workspace data.");
            }
        }
        finally {
            setWorkspaceLoading(false);
        }
    };
    useEffect(() => {
        if (viewMode === "workspace" && authToken && !workspaceData && !workspaceLoading) {
            void loadWorkspace(authToken);
        }
    }, [viewMode, authToken, workspaceData, workspaceLoading]);
    const loadStaffHospitals = async (token) => {
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
        }
        catch (error) {
            const status = error.status;
            if (status === 401 || status === 403) {
                handleStaffLogout("Session expired. Please log in again.");
                return;
            }
            if (error instanceof Error) {
                setStaffError(error.message);
            }
            else {
                setStaffError("Unable to load hospitals.");
            }
        }
        finally {
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
    const handleViewChange = (mode) => {
        if (mode !== viewMode) {
            setViewMode(mode);
        }
    };
    const handleLoginChange = (event) => {
        const { name, value } = event.target;
        setLoginForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    const handleLoginSubmit = async (event) => {
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
        }
        catch (error) {
            if (error instanceof Error) {
                setLoginError(error.message);
            }
            else {
                setLoginError("An unexpected error occurred.");
            }
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    const handleStaffLoginSubmit = async (event) => {
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
        }
        catch (error) {
            if (error instanceof Error) {
                setStaffError(error.message);
            }
            else {
                setStaffError("Unable to log in at this time.");
            }
        }
        finally {
            setStaffIsLoggingIn(false);
        }
    };
    const handleStaffHospitalChange = (event) => {
        setStaffSelectedHospital(event.target.value);
    };
    const handleStaffRequisitionChange = (event) => {
        setStaffRequisitionNumber(event.target.value);
    };
    const handleStaffFileChange = (event) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        setStaffFiles(files);
    };
    const removeStaffFile = (index) => {
        setStaffFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    };
    const handleStaffUploadSubmit = async (event) => {
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
        }
        catch (error) {
            const status = error.status;
            if (status === 401 || status === 403) {
                handleStaffLogout("Session expired. Please log in again.");
                return;
            }
            if (error instanceof Error) {
                setStaffError(error.message);
            }
            else {
                setStaffError("Upload failed. Please try again.");
            }
        }
        finally {
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
    const unreadCount = useMemo(() => documents.filter((document) => !document.is_read).length, [documents]);
    const heroContent = (() => {
        switch (viewMode) {
            case "register":
                return {
                    eyebrow: "Client Services",
                    title: "PetLabs Diagnostics Registration",
                    subtitle: "Seamlessly onboard your practice, set up recurring payments, and gain secure access to lab records in one modern workflow.",
                    badgeLabel: "Trusted Partner",
                    badgeValue: "Since 2016",
                };
            case "login":
                return {
                    eyebrow: "Client Portal",
                    title: "Secure Login to PetLabs",
                    subtitle: "Sign in to review lab results, manage requisitions, and stay connected with the diagnostics team in real time.",
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
    const viewButtonClass = (mode) => mode === viewMode ? "view-toggle__button view-toggle__button--active" : "view-toggle__button";
    const isLoginDisabled = loginForm.email.trim() === "" || loginForm.password.trim().length < 6 || isLoggingIn;
    const isStaffLoginDisabled = loginForm.email.trim() === "" || loginForm.password.trim().length < 6 || staffIsLoggingIn;
    const staffSelectedHospitalOption = staffSelectedHospital
        ? staffHospitals.find((hospital) => hospital.hospital_id === Number(staffSelectedHospital))
        : undefined;
    const staffRequiresRequisition = staffSelectedHospitalOption
        ? REQUISITION_REQUIRED_IDS.has(staffSelectedHospitalOption.hospital_id)
        : false;
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);
        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                invoice_email_secondary: form.invoice_email_secondary?.trim() || undefined,
                fax: form.fax?.trim() || undefined,
            };
            await submitRegistration(payload);
            resetForm();
            setSubmitSuccess("Registration submitted successfully.");
        }
        catch (error) {
            if (error instanceof Error) {
                setSubmitError(error.message);
            }
            else {
                setSubmitError("An unexpected error occurred.");
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleHospitalSelect = (hospitalId) => {
        setSelectedHospitalId(hospitalId);
    };
    const formatDocumentDate = (value) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }
        return parsed.toLocaleDateString();
    };
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "hero", children: [_jsxs("div", { className: "hero__content", children: [_jsx("p", { className: "hero__eyebrow", children: heroContent.eyebrow }), _jsx("h1", { className: "hero__title", children: heroContent.title }), _jsx("p", { className: "hero__subtitle", children: heroContent.subtitle })] }), _jsxs("div", { className: "hero__badge", children: [_jsx("span", { className: "hero__badge-label", children: heroContent.badgeLabel }), _jsx("span", { className: "hero__badge-value", children: heroContent.badgeValue })] })] }), _jsxs("main", { className: "app", children: [viewMode !== "workspace" ? (_jsxs("nav", { className: "view-toggle", "aria-label": "Registration or login selection", children: [_jsx("button", { type: "button", className: viewButtonClass("register"), onClick: () => handleViewChange("register"), "aria-pressed": viewMode === "register", children: "Register" }), _jsx("button", { type: "button", className: viewButtonClass("login"), onClick: () => handleViewChange("login"), "aria-pressed": viewMode === "login", children: "Log in" }), _jsx("button", { type: "button", className: viewButtonClass("staff"), onClick: () => handleViewChange("staff"), "aria-pressed": viewMode === "staff", children: "Staff" })] })) : (_jsxs("div", { className: "workspace-toolbar", role: "region", "aria-label": "Workspace actions", children: [_jsxs("div", { className: "workspace-toolbar__meta", children: [_jsx("span", { children: "Signed in as\u00A0" }), _jsx("strong", { children: workspaceData?.client_name ?? "PetLabs Client" })] }), _jsx("div", { className: "workspace-toolbar__actions", children: _jsx("button", { type: "button", className: "link-button", onClick: () => resetClientSession(), children: "Log out" }) })] })), viewMode === "register" && (_jsxs("div", { className: "layout-grid", children: [_jsxs("section", { className: "form-card", children: [_jsxs("div", { className: "form-card__header", children: [_jsx("h2", { children: "Complete Your Practice Profile" }), _jsx("p", { children: "Please fill out each section so our onboarding specialists can get you live without delay." })] }), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Credit Policy" }), _jsxs("div", { className: "section-intro", children: [_jsx("h3", { className: "section-title", children: "Review and accept the policy" }), _jsx("p", { children: "Invoices are issued monthly for the previous month\u2019s requisitions. Automatic payments are processed on the first of each month via your preferred payment method on file." })] }), _jsxs("label", { className: "inline-checkbox", children: [_jsx("input", { type: "checkbox", name: "accept_policy", checked: form.accept_policy, onChange: handleChange }), _jsx("span", { children: "I have read and understand the PetLabs Diagnostic Laboratories Inc. Credit Policy." })] }), !form.accept_policy && (_jsx("p", { className: "error-text", children: "Please accept the credit policy to continue." }))] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Recurring Payment Authorization" }), _jsxs("div", { className: "section-intro", children: [_jsx("h3", { className: "section-title", children: "Payment preferences" }), _jsx("p", { children: "Choose how you would like to handle your monthly billing. Our team will follow up to collect the secure payment details." })] }), _jsxs("div", { className: "grid two-column", children: [_jsxs("label", { children: ["Practice display name", _jsx("input", { name: "hospital_profile_name", value: form.hospital_profile_name, onChange: handleChange, placeholder: "e.g. Northview Animal Clinic", required: true })] }), _jsxs("label", { children: ["Billing contact name", _jsx("input", { name: "billing_contact_name", value: form.billing_contact_name, onChange: handleChange, placeholder: "Full name", required: true })] }), _jsxs("label", { children: ["Billing contact phone", _jsx("input", { name: "billing_contact_phone", value: form.billing_contact_phone, onChange: handleChange, placeholder: "(000) 000-0000", required: true })] }), _jsxs("label", { children: ["Invoice email", _jsx("input", { name: "invoice_email", type: "email", value: form.invoice_email, onChange: handleChange, placeholder: "billing@yourpractice.com", required: true })] }), _jsxs("label", { children: ["Secondary invoice email (optional)", _jsx("input", { name: "invoice_email_secondary", type: "email", value: form.invoice_email_secondary, onChange: handleChange, placeholder: "finance@yourpractice.com" })] })] }), _jsxs("div", { className: "radio-cluster", children: [_jsx("span", { className: "radio-label", children: "I prefer to pay via:" }), _jsxs("div", { className: "radio-group", children: [_jsxs("label", { className: "radio-option", children: [_jsx("input", { type: "radio", name: "payment_type", value: "checking", checked: form.payment_type === "checking", onChange: handlePaymentChange }), _jsx("span", { children: "Bank draft from my checking account" })] }), _jsxs("label", { className: "radio-option", children: [_jsx("input", { type: "radio", name: "payment_type", value: "credit_card", checked: form.payment_type === "credit_card", onChange: handlePaymentChange }), _jsx("span", { children: "Credit card" })] })] }), _jsx("p", { className: "help-text", children: "A billing representative will contact you within one business day to securely gather payment information." })] }), _jsxs("div", { className: "grid two-column", children: [_jsxs("label", { children: ["Electronic signature", _jsx("input", { name: "signature", value: form.signature, onChange: handleChange, placeholder: "Type full name", required: true })] }), _jsxs("label", { children: ["Signature date", _jsx("input", { name: "signature_date", type: "date", value: form.signature_date, onChange: handleChange, required: true })] })] })] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Account Registration" }), _jsxs("div", { className: "section-intro", children: [_jsx("h3", { className: "section-title", children: "Practice contact details" }), _jsx("p", { children: "Provide the primary address and contact information for your practice. This ensures we connect the right team members with your diagnostic results." })] }), _jsxs("div", { className: "grid two-column", children: [_jsxs("label", { children: ["Hospital legal name", _jsx("input", { name: "hospital_name", value: form.hospital_name, onChange: handleChange, placeholder: "Registered hospital name", required: true })] }), _jsxs("label", { children: ["Street address", _jsx("input", { name: "address", value: form.address, onChange: handleChange, placeholder: "Street, suite, or unit", required: true })] }), _jsxs("label", { children: ["City", _jsx("input", { name: "city", value: form.city, onChange: handleChange, placeholder: "City", required: true })] }), _jsxs("label", { children: ["State", _jsxs("select", { name: "state", value: form.state, onChange: handleChange, disabled: loadingStates, required: true, children: [_jsx("option", { value: "", children: "Select" }), states.map((state) => (_jsxs("option", { value: state.state_abbr, children: [state.state, " (", state.state_abbr, ")"] }, state.state_abbr)))] })] }), _jsxs("label", { children: ["Zip / Postal code", _jsx("input", { name: "zip_code", value: form.zip_code, onChange: handleChange, placeholder: "Postal code", required: true })] }), _jsxs("label", { children: ["Main phone", _jsx("input", { name: "phone", value: form.phone, onChange: handleChange, placeholder: "(000) 000-0000", required: true })] }), _jsxs("label", { children: ["Fax (optional)", _jsx("input", { name: "fax", value: form.fax, onChange: handleChange, placeholder: "(000) 000-0000" })] }), _jsxs("label", { children: ["Primary contact first name", _jsx("input", { name: "first_name", value: form.first_name, onChange: handleChange, placeholder: "First name", required: true })] }), _jsxs("label", { children: ["Primary contact last name", _jsx("input", { name: "last_name", value: form.last_name, onChange: handleChange, placeholder: "Last name", required: true })] }), _jsxs("label", { children: ["Account email", _jsx("input", { name: "email", type: "email", value: form.email, onChange: handleChange, placeholder: "name@yourpractice.com", required: true })] }), _jsxs("label", { children: ["Confirm email", _jsx("input", { name: "confirm_email", type: "email", value: form.confirm_email, onChange: handleChange, placeholder: "Re-enter email", required: true })] }), _jsxs("label", { children: ["Create password (6-20 characters)", _jsx("input", { name: "password", type: "password", value: form.password, onChange: handleChange, minLength: 6, maxLength: 20, placeholder: "Choose a secure password", autoComplete: "new-password", required: true })] })] }), emailMismatch && (_jsx("p", { className: "error-text", children: "Email addresses do not match." }))] }), _jsxs("div", { className: "form-card__footer", children: [submitError && _jsx("div", { className: "banner banner--error", children: submitError }), submitSuccess && (_jsx("div", { className: "banner banner--success", children: submitSuccess })), _jsxs("div", { className: "actions", children: [_jsx("button", { type: "button", onClick: resetForm, disabled: isSubmitting, children: "Clear form" }), _jsx("button", { type: "submit", disabled: isSubmitting || isFormInvalid, children: isSubmitting ? "Submitting..." : "Submit registration" })] })] })] })] }), _jsxs("aside", { className: "insight-card", children: [_jsx("h2", { children: "Why partner with PetLabs" }), _jsxs("ul", { className: "insight-list", children: [_jsxs("li", { children: [_jsx("strong", { children: "Dedicated onboarding." }), " A diagnostics specialist guides every new partner through the first 30 days."] }), _jsxs("li", { children: [_jsx("strong", { children: "Real-time reporting." }), " Access finalized results the moment they are released in the portal."] }), _jsxs("li", { children: [_jsx("strong", { children: "Flexible billing." }), " Choose the payment cadence and contact preferences that keep your practice organized."] })] }), _jsxs("div", { className: "insight-cta", children: [_jsx("p", { children: "Have questions before submitting?" }), _jsx("a", { href: "tel:13302206435", children: "Call 330-220-6435" }), _jsx("span", { children: "Mon\u2013Fri \u00B7 8:00 AM \u2013 6:00 PM EST" })] })] })] })), viewMode === "login" && (_jsxs("div", { className: "layout-grid layout-grid--login", children: [_jsxs("section", { className: "form-card", children: [_jsxs("div", { className: "form-card__header", children: [_jsx("h2", { children: "Access Your Diagnostics Portal" }), _jsx("p", { children: "Enter your credentials to continue to the secure dashboard." })] }), _jsxs("form", { onSubmit: handleLoginSubmit, noValidate: true, children: [_jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Account Login" }), _jsxs("div", { className: "section-intro", children: [_jsx("h3", { className: "section-title", children: "Welcome back" }), _jsx("p", { children: "Use the email associated with your PetLabs account to sign in." })] }), _jsxs("div", { className: "grid", children: [_jsxs("label", { children: ["Account email", _jsx("input", { name: "email", type: "email", value: loginForm.email, onChange: handleLoginChange, placeholder: "name@yourpractice.com", autoComplete: "username", required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { name: "password", type: "password", value: loginForm.password, onChange: handleLoginChange, placeholder: "Enter your password", minLength: 6, autoComplete: "current-password", required: true })] })] }), _jsxs("div", { className: "help-links", children: [_jsx("button", { type: "button", className: "link-button", onClick: () => handleViewChange("register"), children: "Need an account? Start registration" }), _jsx("a", { className: "link-button", href: "mailto:info@petlabsdiagnostics.com", children: "Forgot password? Contact support" })] })] }), _jsxs("div", { className: "form-card__footer", children: [loginError && _jsx("div", { className: "banner banner--error", children: loginError }), _jsx("div", { className: "actions", children: _jsx("button", { type: "submit", disabled: isLoginDisabled, children: isLoggingIn ? "Signing in..." : "Sign in" }) })] })] })] }), _jsxs("aside", { className: "insight-card insight-card--login", children: [_jsx("h2", { children: "Security you can trust" }), _jsxs("ul", { className: "insight-list", children: [_jsxs("li", { children: [_jsx("strong", { children: "Encrypted access." }), " Industry-standard encryption keeps your laboratory data protected."] }), _jsxs("li", { children: [_jsx("strong", { children: "Unified records." }), " Review requisitions, invoices, and results from one intuitive dashboard."] }), _jsxs("li", { children: [_jsx("strong", { children: "Always available." }), " Secure availability across desktop, tablet, and mobile devices."] })] }), _jsxs("div", { className: "insight-cta", children: [_jsx("p", { children: "Need immediate assistance?" }), _jsx("a", { href: "tel:13302206435", children: "Call 330-220-6435" }), _jsx("span", { children: "Support \u00B7 Mon\u2013Fri \u00B7 8:00 AM \u2013 6:00 PM EST" })] })] })] })), viewMode === "staff" && (_jsx("div", { className: "staff-area", children: staffToken ? (_jsxs("section", { className: "staff-card", children: [_jsxs("div", { className: "staff-card__header", children: [_jsx("h2", { children: "Upload documents for clients" }), _jsx("p", { children: "Select a hospital and upload the files that should appear in the client workspace." }), _jsxs("div", { className: "staff-card__meta", children: [_jsx("span", { children: staffName ? `Signed in as ${staffName}` : "Staff session" }), _jsx("button", { type: "button", className: "link-button", onClick: () => handleStaffLogout(), children: "Log out" })] })] }), _jsxs("form", { onSubmit: handleStaffUploadSubmit, className: "staff-form", noValidate: true, children: [staffHospitalsLoading && _jsx("div", { className: "banner banner--info", children: "Loading hospitals\u2026" }), _jsxs("label", { children: ["Hospital", _jsxs("select", { name: "staff_hospital", value: staffSelectedHospital, onChange: handleStaffHospitalChange, disabled: staffHospitalsLoading, required: true, children: [_jsx("option", { value: "", children: "Select hospital" }), staffHospitals.map((hospital) => (_jsxs("option", { value: hospital.hospital_id, children: [hospital.hospital_name, hospital.state ? ` (${hospital.state})` : ""] }, hospital.hospital_id)))] }), !staffHospitalsLoading && staffHospitals.length === 0 && (_jsx("span", { className: "help-text", children: "No active hospitals available." }))] }), _jsxs("label", { children: ["Requisition number", _jsx("input", { type: "text", name: "staff_requisition", value: staffRequisitionNumber, onChange: handleStaffRequisitionChange, placeholder: "Required for select hospitals", className: staffRequiresRequisition ? "required" : "", required: staffRequiresRequisition }), staffRequiresRequisition ? (_jsx("span", { className: "help-text", children: "This hospital requires a requisition number (e.g., US12345-DR678)." })) : (_jsx("span", { className: "help-text", children: "Optional unless specified by the hospital." }))] }), _jsxs("label", { className: "staff-file-picker", children: ["Documents", _jsx("input", { type: "file", multiple: true, onChange: handleStaffFileChange }, staffFileInputKey), _jsx("span", { className: "help-text", children: "Accepted: PDF, DOC, DOCX, TXT, XLS, XLSX, RTF \u00B7 Max 2\u202FMB per file." })] }), staffFiles.length > 0 && (_jsx("ul", { className: "file-list", children: staffFiles.map((file, index) => (_jsxs("li", { children: [_jsx("span", { children: file.name }), _jsx("button", { type: "button", onClick: () => removeStaffFile(index), children: "Remove" })] }, `${file.name}-${index}`))) })), staffError && _jsx("div", { className: "banner banner--error", children: staffError }), staffUploadMessage && _jsx("div", { className: "banner banner--success", children: staffUploadMessage }), _jsx("div", { className: "actions", children: _jsx("button", { type: "submit", disabled: staffIsUploading, children: staffIsUploading ? "Uploading..." : "Upload documents" }) })] }), staffUploadedDocs.length > 0 && (_jsxs("div", { className: "staff-results", children: [_jsx("h3", { children: "Recent uploads" }), _jsx("ul", { children: staffUploadedDocs.map((doc) => {
                                                const downloadHref = staffToken
                                                    ? `${doc.download_url}?token=${encodeURIComponent(staffToken)}`
                                                    : doc.download_url;
                                                return (_jsxs("li", { children: [_jsx("span", { children: doc.file_name }), _jsxs("div", { className: "staff-results__actions", children: [_jsx("span", { children: formatDocumentDate(doc.file_date) }), _jsx("a", { href: downloadHref, download: doc.file_name, children: "Download" })] })] }, doc.id));
                                            }) })] }))] })) : (_jsxs("section", { className: "staff-login-card", children: [_jsx("h2", { children: "Staff access" }), _jsx("p", { children: "Enter your employee credentials to upload documents for clinics." }), _jsxs("form", { onSubmit: handleStaffLoginSubmit, className: "staff-login-form", noValidate: true, children: [_jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", value: loginForm.email, onChange: handleLoginChange, autoComplete: "username", required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { name: "password", type: "password", value: loginForm.password, onChange: handleLoginChange, autoComplete: "current-password", required: true })] }), staffError && _jsx("div", { className: "banner banner--error", children: staffError }), _jsx("div", { className: "actions", children: _jsx("button", { type: "submit", disabled: isStaffLoginDisabled, children: staffIsLoggingIn ? "Signing in..." : "Sign in" }) })] })] })) })), viewMode === "workspace" && (_jsxs("div", { className: "workspace-grid", children: [_jsxs("aside", { className: "workspace-locations", "aria-label": "Practice locations", children: [_jsxs("div", { className: "workspace-locations__header", children: [_jsx("h2", { children: "Practice Locations" }), _jsx("p", { children: "Choose a location to view its latest documents." })] }), workspaceError && _jsx("div", { className: "banner banner--error", children: workspaceError }), workspaceLoading ? (_jsx("div", { className: "workspace-empty", children: "Loading workspace\u2026" })) : hospitals.length === 0 ? (_jsx("div", { className: "workspace-empty", children: "No active locations are linked to this account yet." })) : (_jsx("ul", { className: "workspace-location-list", children: hospitals.map((hospital) => {
                                            const isActive = currentHospital?.hospital_id === hospital.hospital_id;
                                            const documentCount = hospital.documents.length;
                                            return (_jsx("li", { children: _jsxs("button", { type: "button", className: isActive
                                                        ? "workspace-location workspace-location--active"
                                                        : "workspace-location", onClick: () => handleHospitalSelect(hospital.hospital_id), children: [_jsx("span", { className: "workspace-location__name", children: hospital.hospital_name }), _jsxs("span", { className: "workspace-location__meta", children: [documentCount, " ", documentCount === 1 ? "document" : "documents"] })] }) }, hospital.hospital_id));
                                        }) }))] }), _jsx("section", { className: "workspace-documents", "aria-live": "polite", children: workspaceLoading ? (_jsx("div", { className: "workspace-empty", children: "Loading documents\u2026" })) : !currentHospital ? (_jsx("div", { className: "workspace-empty", children: "Select a practice location to see available documents." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "workspace-documents__header", children: [_jsxs("div", { children: [_jsx("h2", { children: currentHospital.hospital_name }), _jsxs("p", { children: [currentHospital.address, _jsx("br", {}), currentHospital.city, ", ", currentHospital.state, currentHospital.zip ? ` ${currentHospital.zip}` : ""] })] }), _jsxs("div", { className: "workspace-documents__summary", children: [_jsxs("span", { children: [documents.length, " ", documents.length === 1 ? "document" : "documents"] }), _jsxs("span", { children: [unreadCount, " unread"] })] })] }), documents.length === 0 ? (_jsx("div", { className: "workspace-empty workspace-empty--inner", children: "No documents available yet for this location." })) : (_jsxs("table", { className: "workspace-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "File name" }), _jsx("th", { children: "Date" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: documents.map((document) => {
                                                        const downloadHref = authToken
                                                            ? `${document.download_url}?token=${encodeURIComponent(authToken)}`
                                                            : document.download_url;
                                                        return (_jsxs("tr", { className: document.is_read ? "" : "workspace-table__row--unread", children: [_jsx("td", { children: document.file_name }), _jsx("td", { children: formatDocumentDate(document.file_date) }), _jsx("td", { children: _jsx("a", { className: "primary-link primary-link--inline", href: downloadHref, download: document.file_name, children: "Download" }) })] }, document.id));
                                                    }) })] }))] })) })] }))] })] }));
}
