const API_BASE_URL = "http://127.0.0.1:8000";

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
        return null;
    }
}

function getCurrentRole() {
    const user = getCurrentUser();

    if (!user) return "";

    let role = String(user.role || "").trim().toLowerCase();

    if (role === "admin" || role === "administrator") {
        return "superintendent";
    }

    if (role === "police officer" || role === "police-officer") {
        return "police_officer";
    }

    if (role === "user") {
        return "civilian";
    }

    return role;
}

function requireRole(allowedRoles) {

    const token = localStorage.getItem("access_token");
    const user = getCurrentUser();

    if (!token || !user) {
        window.location.href = "index.html";
        return false;
    }

    const role = getCurrentRole();

    const allowed = allowedRoles.map(r => {
        r = String(r).toLowerCase();

        if (r === "admin") return "superintendent";
        if (r === "police officer") return "police_officer";
        if (r === "user") return "civilian";

        return r;
    });

    if (!allowed.includes(role)) {
        console.error("ROLE NOT ALLOWED:", role);
        return false;
    }

    return true;
}

async function authFetch(url, options = {}) {

    const token = localStorage.getItem("access_token");

    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set("Authorization", "Bearer " + token);
    }

    return fetch(url, {
        ...options,
        headers: headers
    });
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}