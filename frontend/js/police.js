const user = requireRole(["police_officer"]);

if (!user) {
    throw new Error("Unauthorized");
}


// ----------------------------------------
// LOAD OFFICER INFORMATION
// ----------------------------------------

async function loadOfficer() {

    try {

        const response = await authFetch(
            `${API_BASE_URL}/auth/officer-profile`
        );

        if (!response.ok) {
            throw new Error("Unable to load officer information.");
        }

        const officer = await response.json();
        document.getElementById("previousStation").textContent =
            officer.transferred_from || "No transfer recorded";

        document.getElementById("lastTransferDate").textContent =
            officer.transfer_date || "Not available";

        document.getElementById("officerName").textContent =
            officer.name || "-";

        document.getElementById("officerId").textContent =
            officer.badge_number || "-";

        document.getElementById("officerRank").textContent =
            officer.rank || "-";

        document.getElementById("joiningDate").textContent =
            officer.joining_date || "-";

        document.getElementById("stationName").textContent =
            officer.station_name || "-";

    } catch (error) {

        console.error("Officer profile error:", error);

        document.getElementById("officerName").textContent =
            "Unable to load";

        document.getElementById("officerId").textContent =
            "-";

        document.getElementById("officerRank").textContent =
            "-";

        document.getElementById("joiningDate").textContent =
            "-";

        document.getElementById("stationName").textContent =
            "Unable to load";
    }
}
// ----------------------------------------
// LOAD POLICE STATION
// ----------------------------------------

async function loadStation(stationId) {

    if (!stationId) {

        document.getElementById("stationName").textContent =
            "Not assigned";

        return;
    }

    try {

        const response = await authFetch(
            `${API_BASE_URL}/police-stations/${stationId}`
        );

        if (!response.ok) {
            throw new Error("Unable to load station.");
        }

        const station = await response.json();

        document.getElementById("stationName").textContent =
            station.station_name || "-";

    } catch (error) {

        console.error(error);

        document.getElementById("stationName").textContent =
            "Unable to load";
    }
}

// ----------------------------------------
// LOAD STATION CASES
// ----------------------------------------

async function loadCases() {

    const container =
        document.getElementById("caseResults");

    try {

        const response = await authFetch(
            `${API_BASE_URL}/cases/?skip=0&limit=100`
        );

        if (!response.ok) {
            throw new Error("Unable to load cases.");
        }

        const cases = await response.json();


        if (cases.length === 0) {

            container.innerHTML =
                "<p>No cases found for your station.</p>";

            return;
        }


        container.innerHTML = cases.map(caseItem => `

            <div class="civilian-case">

                <h3>
                    ${caseItem.case_title || "Untitled Case"}
                </h3>

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

                <p>
                    <strong>Outcome:</strong>
                    ${caseItem.outcome || "Pending"}
                </p>

                <button
                    type="button"
                    onclick="viewCase(${caseItem.case_id})">
                    View Case
                </button>

            </div>

        `).join("");


    } catch (error) {

        console.error(error);

        container.innerHTML =
            "<p>Unable to load station cases.</p>";
    }
}


// ----------------------------------------
// VIEW CASE
// ----------------------------------------

function viewCase(caseId) {

    window.location.href =
        `case-details.html?case_id=${caseId}`;
}


// ----------------------------------------
// LOGOUT
// ----------------------------------------

function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    window.location.href = "index.html";
}


// ----------------------------------------
// INITIALIZE
// ----------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    loadOfficer();
    loadCases();
    loadAssignedCases();
});

async function loadAssignedCases() {
    const container = document.getElementById("assignedCaseResults");

    try {
        const response = await authFetch(
            `${API_BASE_URL}/cases/?skip=0&limit=100&assigned_to_me=true`
        );

        if (!response.ok) {
            throw new Error("Unable to load assigned cases.");
        }

        const cases = await response.json();

        if (cases.length === 0) {
            container.innerHTML = "<p>No cases assigned to you as IO.</p>";
            return;
        }

        container.innerHTML = cases.map(caseItem => `
            <div class="civilian-case">
                <h3>${caseItem.case_title || "Untitled Case"}</h3>
                <p><strong>Case ID:</strong> ${caseItem.case_id}</p>
                <p><strong>Status:</strong> ${caseItem.status || "N/A"}</p>
                <p><strong>Start Date:</strong> ${caseItem.start_date || "N/A"}</p>
                <p><strong>Outcome:</strong> ${caseItem.outcome || "Pending"}</p>
                <button type="button"
                    onclick="viewCase(${caseItem.case_id})">
                    View Case
                </button>
            </div>
        `).join("");

    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Unable to load assigned cases.</p>";
    }
}
