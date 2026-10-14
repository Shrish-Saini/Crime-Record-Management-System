const API_BASE_URL = "http://127.0.0.1:8000";


/* =========================================================
   LOGIN
========================================================= */

document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;


    if (!username || !password) {

        alert("Please enter username and password.");

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                "Invalid username or password."
            );

            return;
        }


        /* SAVE LOGIN SESSION */

        localStorage.setItem(
            "access_token",
            data.access_token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );


        console.log("Login successful");
        console.log("User:", data.user);


        /* REDIRECT BASED ON ROLE */

        redirectUser(data.user.role);


    } catch (error) {

        console.error("Login error:", error);

        alert(
            "Cannot connect to CRMS backend."
        );
    }

});


/* =========================================================
   ROLE REDIRECTION
========================================================= */

function redirectUser(role) {
    const normalizedRole = String(role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (normalizedRole === "civilian") {
        window.location.href = "civilian.html";
    } else if (normalizedRole === "police_officer") {
        window.location.href = "police.html";
    } else if (normalizedRole === "superintendent") {
        window.location.href = "superintendent.html";
    } else if (normalizedRole === "admin") {
        window.location.href = "cases.html";
    } else {
        alert("Unrecognized user role. Please contact the administrator.");
    }
}