const API_BASE_URL = "http://127.0.0.1:8000";

let pendingToken = null;
let pendingUser = null;
let otpTimer = null;
let otpSeconds = 60;


/* =========================================================
   NORMAL LOGIN
========================================================= */

document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Please enter username and password.");
        return;
    }

    try {

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Invalid username or password.");
            return;
        }

        /*
         * Keep token temporarily.
         * Do NOT save it to localStorage until OTP is verified.
         */
        pendingToken = data.access_token;
        pendingUser = data.user;

        await requestOTP();

    } catch (error) {

        console.error("Login error:", error);

        alert("Cannot connect to CRMS backend.");
    }
});


/* =========================================================
   REQUEST OTP
========================================================= */

async function requestOTP() {

    try {

        const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${pendingToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {

            alert(data.detail || "Unable to generate OTP.");

            return;
        }

        showOTPSection(data.simulated_otp);

    } catch (error) {

        console.error("OTP request error:", error);

        alert("Unable to generate OTP.");
    }
}


/* =========================================================
   SHOW OTP SCREEN
========================================================= */

function showOTPSection(otp) {

    const loginSection = document.getElementById("loginSection");
    const otpSection = document.getElementById("otpSection");

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (otpSection) {
        otpSection.style.display = "block";
    }

    document.getElementById("demoOTP").textContent = otp;

    document.getElementById("otpInput").value = "";

    startOTPTimer();
}


/* =========================================================
   VERIFY OTP
========================================================= */

async function verifyOTP() {

    const otpInput = document.getElementById("otpInput");

    const otp = otpInput.value.trim();

    if (!otp) {

        alert("Please enter the OTP.");

        return;
    }

    if (!pendingToken || !pendingUser) {

        alert("Login session expired. Please login again.");

        return;
    }

    try {

        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${pendingToken}`
            },

            body: JSON.stringify({
                username: pendingUser.username,
                otp: otp
            })
        });

        const data = await response.json();

        if (!response.ok) {

            alert(data.detail || "Invalid OTP.");

            return;
        }

        if (data.verified) {

            /*
             * Save authentication ONLY after OTP verification.
             */
            localStorage.setItem(
                "access_token",
                pendingToken
            );

            localStorage.setItem(
                "user",
                JSON.stringify(pendingUser)
            );

            clearInterval(otpTimer);

            redirectUser(pendingUser.role);
        }

    } catch (error) {

        console.error("OTP verification error:", error);

        alert("Cannot connect to CRMS backend.");
    }
}


/* =========================================================
   REDIRECT
========================================================= */

function redirectUser(role) {

    if (role === "civilian") {

        window.location.href = "civilian.html";

    } else {

        window.location.href = "cases.html";
    }
}


/* =========================================================
   OTP TIMER
========================================================= */

function startOTPTimer() {

    clearInterval(otpTimer);

    otpSeconds = 60;

    updateOTPTimer();

    otpTimer = setInterval(() => {

        otpSeconds--;

        updateOTPTimer();

        if (otpSeconds <= 0) {

            clearInterval(otpTimer);

            document.getElementById("otpTimer").textContent =
                "OTP expired";
        }

    }, 1000);
}


function updateOTPTimer() {

    const timer = document.getElementById("otpTimer");

    if (timer) {

        timer.textContent =
            `Expires in ${otpSeconds} seconds`;
    }
}


/* =========================================================
   RESEND OTP
========================================================= */

async function resendOTP() {

    if (!pendingToken) {

        alert("Please login again.");

        return;
    }

    await requestOTP();
}