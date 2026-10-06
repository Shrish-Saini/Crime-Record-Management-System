const API_BASE_URL = "http://127.0.0.1:8000";

let confirmationResult = null;
let recaptchaVerifier = null;

const phoneInput = document.getElementById("phone");
const otpInput = document.getElementById("otp");
const sendOtpButton = document.getElementById("sendOtpButton");
const verifyButton = document.getElementById("verifyButton");
const registrationForm = document.getElementById("registrationForm");
const statusMessage = document.getElementById("statusMessage");

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = isError ? "status error" : "status";
}

function normalizePhone(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) return "+91" + digits;
    if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
    return value.trim();
}

function setupRecaptcha() {
    if (recaptchaVerifier) return;

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
        "recaptcha-container",
        { size: "normal" }
    );

    recaptchaVerifier.render();
}

sendOtpButton.addEventListener("click", async () => {
    const phone = normalizePhone(phoneInput.value);

    if (!/^\+91\d{10}$/.test(phone)) {
        showStatus("Enter a valid Indian mobile number.", true);
        return;
    }

    try {
        setupRecaptcha();

        confirmationResult = await firebase.auth().signInWithPhoneNumber(
            phone,
            recaptchaVerifier
        );

        otpInput.disabled = false;
        verifyButton.disabled = false;
        sendOtpButton.disabled = true;

        showStatus("OTP sent. Enter the 6-digit code.");
    } catch (error) {
        console.error(error);
        showStatus(error.message || "Unable to send OTP.", true);

        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
        }
    }
});

verifyButton.addEventListener("click", async () => {
    if (!confirmationResult) {
        showStatus("Send an OTP first.", true);
        return;
    }

    try {
        await confirmationResult.confirm(otpInput.value.trim());
        showStatus("Phone verified. You can now create your CRMS profile.");
        registrationForm.querySelectorAll("input, select, button").forEach(el => {
            if (el !== sendOtpButton && el !== verifyButton) el.disabled = false;
        });
        document.getElementById("profileSection").style.display = "block";
    } catch (error) {
        console.error(error);
        showStatus("Invalid OTP. Please try again.", true);
    }
});

registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = firebase.auth().currentUser;

    if (!user) {
        showStatus("Verify your phone number first.", true);
        return;
    }

    try {
        const idToken = await user.getIdToken(true);

        const response = await fetch(
            API_BASE_URL + "/registration/phone/complete",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_token: idToken,
                    full_name: document.getElementById("fullName").value.trim(),
                    date_of_birth: document.getElementById("dateOfBirth").value || null,
                    gender: document.getElementById("gender").value || null,
                    address: document.getElementById("address").value.trim() || null,
                    city: document.getElementById("city").value.trim() || null,
                    state: document.getElementById("state").value.trim() || null,
                    pincode: document.getElementById("pincode").value.trim() || null,
                    password: document.getElementById("password").value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showStatus(data.detail || "Registration failed.", true);
            return;
        }

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        window.location.href = "civilian.html";
    } catch (error) {
        console.error(error);
        showStatus("Cannot connect to CRMS backend.", true);
    }
});
