const API_BASE_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("crms_token");

function authFetch(url, options = {}) {
    const token = localStorage.getItem("access_token");

    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
        ...options,
        headers: headers
    });
}

function getCurrentUser() {
    const user = localStorage.getItem("crms_user");
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem("crms_token");
    localStorage.removeItem("crms_user");
    window.location.href = "index.html";
}