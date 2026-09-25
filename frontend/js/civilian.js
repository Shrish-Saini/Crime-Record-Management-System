const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user || user.role !== "civilian") {
    window.location.href = "index.html";
}

async function searchCases() {
    const search = document.getElementById("searchCase").value.trim().toLowerCase();

    try {
        const response = await authFetch(`${API_BASE_URL}/cases/?skip=0&limit=100`);

        if (!response.ok) {
            throw new Error("Unable to load cases");
        }

        const cases = await response.json();

        const filteredCases = cases.filter(caseItem =>
            (caseItem.case_title || "").toLowerCase().includes(search) ||
            String(caseItem.case_id).includes(search)
        );

        displayCases(filteredCases);

    } catch (error) {
        console.error(error);

        document.getElementById("results").innerHTML =
            "<p>Unable to load case records.</p>";
    }
}

function displayCases(cases) {
    const results = document.getElementById("results");

    if (cases.length === 0) {
        results.innerHTML = "<p>No cases found.</p>";
        return;
    }

    results.innerHTML = cases.map(caseItem => `
        <div class="civilian-case">
            <h3>${caseItem.case_title || "Untitled Case"}</h3>

            <p>
                <strong>Case ID:</strong>
                ${caseItem.case_id}
            </p>

            <p>
                <strong>Status:</strong>
                ${caseItem.status || "N/A"}
            </p>

            <p>
                <strong>Start Date:</strong>
                ${caseItem.start_date || "N/A"}
            </p>

            <button onclick="viewCase(${caseItem.case_id})">
                View Case
            </button>
        </div>

        <hr>
    `).join("");
}

function viewCase(caseId) {
    window.location.href = `case-details.html?case_id=${caseId}`;
}

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    searchCases();
});