
const API_BASE_URL = "http://127.0.0.1:8000";

let verifiedEmail = "";
let registrationToken = "";
let expiryTime = 0;
let timerInterval = null;

const registrationForm = document.getElementById("registrationForm");
const emailInput = document.getElementById("email");
const otpInput = document.getElementById("otp");
const sendOtpButton = document.getElementById("sendOtpButton");
const verifyButton = document.getElementById("verifyButton");
const resendOtpButton = document.getElementById("resendOtpButton");
const profileSection = document.getElementById("profileSection");
const otpSection = document.getElementById("otpSection");
const otpTimer = document.getElementById("otpTimer");
const statusMessage = document.getElementById("statusMessage");

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = isError ? "status error" : "status";
}

async function readResponse(response) {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            typeof data.detail === "string"
                ? data.detail
                : "Request failed. Please try again."
        );
    }

    return data;
}

function setProfileEnabled(enabled) {
    profileSection.querySelectorAll("input, button").forEach(element => {
        element.disabled = !enabled;
    });
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    expiryTime = Date.now() + seconds * 1000;

    sendOtpButton.disabled = true;
    verifyButton.disabled = false;
    otpInput.disabled = false;
    resendOtpButton.disabled = true;

    function updateTimer() {
        const remaining = Math.max(
            0,
            Math.ceil((expiryTime - Date.now()) / 1000)
        );

        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;

        otpTimer.textContent =
            `Code expires in ${minutes}:${String(secs).padStart(2, "0")}`;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            otpTimer.textContent = "Code expired. Request a new OTP.";
            verifyButton.disabled = true;
            resendOtpButton.disabled = false;
        }
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

async function sendOtp() {
    const email = emailInput.value.trim().toLowerCase();

    if (!emailInput.checkValidity() || !email) {
        emailInput.reportValidity();
        return;
    }

    sendOtpButton.disabled = true;
    showStatus("Sending verification email...");

    try {
        const response = await fetch(
            `${API_BASE_URL}/registration/email/send-otp`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            }
        );

        const data = await readResponse(response);

        emailInput.value = email;
        emailInput.readOnly = true;
        otpSection.style.display = "block";
        otpInput.value = "";
        otpInput.focus();

        startTimer(data.expires_in || 300);
        showStatus(data.message || "OTP sent. Check your inbox.");
    } catch (error) {
        sendOtpButton.disabled = false;
        showStatus(error.message || "Could not send OTP.", true);
    }
}

async function verifyOtp() {
    const email = emailInput.value.trim().toLowerCase();
    const otp = otpInput.value.trim();

    if (!/^\d{6}$/.test(otp)) {
        showStatus("Enter the six-digit OTP from your email.", true);
        return;
    }

    if (Date.now() >= expiryTime) {
        showStatus("OTP expired. Request a new code.", true);
        return;
    }

    verifyButton.disabled = true;
    showStatus("Verifying email...");

    try {
        const response = await fetch(
            `${API_BASE_URL}/registration/email/verify-otp`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp })
            }
        );

        const data = await readResponse(response);

        verifiedEmail = email;
        registrationToken = data.registration_token;

        clearInterval(timerInterval);
        otpTimer.textContent = "Email verified successfully.";
        otpInput.disabled = true;
        resendOtpButton.style.display = "none";
        verifyButton.style.display = "none";

        document.getElementById("verifiedEmailMessage").textContent =
            `Verified email: ${verifiedEmail}`;

        profileSection.style.display = "block";
        setProfileEnabled(true);

        showStatus("Email verified! Complete your profile.");
        document.getElementById("fullName").focus();
    } catch (error) {
        showStatus(error.message || "OTP verification failed.", true);
        verifyButton.disabled = Date.now() >= expiryTime;
    }
}

async function completeRegistration(event) {
    event.preventDefault();

    if (!verifiedEmail || !registrationToken) {
        showStatus("Verify your email before creating an account.", true);
        return;
    }

    const createButton = document.getElementById("createAccountButton");
    createButton.disabled = true;
    showStatus("Creating your account...");

    const payload = {
        email: verifiedEmail,
        registration_token: registrationToken,
        full_name: document.getElementById("fullName").value.trim(),
        date_of_birth: document.getElementById("dateOfBirth").value || null,
        gender: document.getElementById("gender").value.trim() || null,
        address: document.getElementById("address").value.trim() || null,
        city: document.getElementById("city").value.trim() || null,
        state: document.getElementById("state").value.trim() || null,
        pincode: document.getElementById("pincode").value.trim() || null,
        password: document.getElementById("password").value
    };

    try {
        const response = await fetch(
            `${API_BASE_URL}/registration/email/complete`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        const data = await readResponse(response);

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showStatus("Account created! Redirecting...");
        window.location.href = "civilian.html";
    } catch (error) {
        createButton.disabled = false;
        showStatus(error.message || "Registration failed.", true);
    }
}

sendOtpButton.addEventListener("click", sendOtp);
verifyButton.addEventListener("click", verifyOtp);
resendOtpButton.addEventListener("click", sendOtp);
registrationForm.addEventListener("submit", completeRegistration);

emailInput.addEventListener("input", () => {
    if (!emailInput.readOnly) {
        sendOtpButton.disabled = false;
    }
});
