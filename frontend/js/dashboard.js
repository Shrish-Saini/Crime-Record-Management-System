const API_BASE_URL = "http://127.0.0.1:8000";


/* LOAD DASHBOARD DATA */

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/cases/`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const cases = await response.json();


        /* CASE COUNTS */

        const totalCases = cases.length;

        const closedCases = cases.filter(
            caseItem =>
                (caseItem.status || "").toLowerCase() === "closed"
        ).length;

        const trialOngoing = cases.filter(
            caseItem =>
                (caseItem.status || "").toLowerCase().includes("trial")
        ).length;

        const investigationOngoing = cases.filter(
            caseItem =>
                (caseItem.status || "").toLowerCase().includes("investigation")
        ).length;
        /* STATUS DISTRIBUTION */

        const activeCases =
            totalCases - closedCases;

        const closedPercentage =
            totalCases > 0
            ? Math.round((closedCases / totalCases) * 100)
            : 0;

        const trialPercentage =
            totalCases > 0
            ? Math.round((trialOngoing / totalCases) * 100)
            : 0;


        /* OUTCOME COUNTS */

        const convictedCases = cases.filter(
            caseItem =>
                (caseItem.outcome || "")
                    .toLowerCase()
                    .includes("convicted")
        ).length;

        const acquittedCases = cases.filter(
            caseItem =>
                (caseItem.outcome || "")
                    .toLowerCase()
                    .includes("acquitted")
        ).length;


        /* UPDATE STAT CARDS */

        document.getElementById("totalCases").textContent =
            String(totalCases).padStart(2, "0");

        document.getElementById("investigationOngoing").textContent =
            String(investigationOngoing).padStart(2, "0");

        document.getElementById("trialOngoing").textContent =
            String(trialOngoing).padStart(2, "0");

        document.getElementById("closedCases").textContent =
            String(closedCases).padStart(2, "0");

        document.getElementById("convictedCases").textContent =
            String(convictedCases).padStart(2, "0");

                document.getElementById("acquittedCases").textContent =
            String(acquittedCases).padStart(2, "0");


        /* UPDATE CASE STATUS PANEL */

        document.getElementById("statusClosedCount").textContent =
            closedCases;

        document.getElementById("statusTrialCount").textContent =
            trialOngoing;

        document.getElementById("statusTotal").textContent =
            String(totalCases).padStart(2, "0");

        document.getElementById("statusClosedSummary").textContent =
            String(closedCases).padStart(2, "0");

        document.getElementById("statusActive").textContent =
            String(activeCases).padStart(2, "0");

        document.getElementById("closedProgress").style.width =
            `${closedPercentage}%`;

        document.getElementById("trialProgress").style.width =
            `${trialPercentage}%`;


    } catch (error) {

        console.error(
            "Error loading dashboard data:",
            error
        );

    }

}

/* START */

loadDashboard();
/* LOAD RECENT CASES */

async function loadRecentCases() {

    const recentCasesList =
        document.getElementById("recentCasesList");

    recentCasesList.innerHTML = `
        <div class="empty-record">
            <strong>Loading Recent Cases</strong>
            <span>Fetching the latest case records from the server.</span>
        </div>
    `;

    try {

        const response = await fetch(
            `${API_BASE_URL}/cases/`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const cases = await response.json();

        if (!Array.isArray(cases) || cases.length === 0) {

            recentCasesList.innerHTML = `
                <div class="empty-record">
                    <strong>No Cases Found</strong>
                    <span>No case records are currently available.</span>
                </div>
            `;

            return;
        }

        /* Sort newest cases first */

        cases.sort(
            (a, b) =>
                new Date(b.start_date) -
                new Date(a.start_date)
        );

        /* Show latest 3 cases */

        const recentCases = cases.slice(0, 3);

        recentCasesList.innerHTML = "";

        recentCases.forEach((caseItem, index) => {

            const row = document.createElement("div");
            row.className = "case-row";

            const status =
                caseItem.status || "—";

            const outcome =
                caseItem.outcome || "";

            let statusClass = "ongoing";

            if (status.toLowerCase() === "closed") {
                statusClass = "closed";
            }

            if (outcome.toLowerCase().includes("acquitted")) {
                statusClass = "acquitted";
            }

            row.innerHTML = `
                <div class="case-number">
                    ${String(index + 1).padStart(2, "0")}
                </div>

                <div class="case-info">

                    <strong>
                        ${caseItem.case_title || "Untitled Case"}
                    </strong>

                    <span>
                        Loading FIR...
                    </span>

                </div>

                <div class="case-crime">
                    —
                </div>

                <span class="status ${statusClass}">
                    ${status}
                </span>
            `;

            recentCasesList.appendChild(row);

            /* Load FIR information */

            loadRecentCaseFIR(caseItem, row);
        });

    } catch (error) {

        console.error(
            "Error loading recent cases:",
            error
        );

        recentCasesList.innerHTML = `
            <div class="empty-record">
                <strong>Unable to Load Recent Cases</strong>
                <span>
                    Case records could not be retrieved from the server.
                </span>
            </div>
        `;
    }
}
/* LOAD FIR INFORMATION FOR RECENT CASE */

async function loadRecentCaseFIR(caseItem, row) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/cases/${caseItem.case_id}/fir`
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const fir = await response.json();

        const caseInfo =
            row.querySelector(".case-info span");

        const caseCrime =
            row.querySelector(".case-crime");

        caseInfo.textContent =
            fir.fir_number || "—";

        caseCrime.textContent =
            fir.crime_name || "—";

    } catch (error) {

        console.error(
            `Error loading FIR for case ${caseItem.case_id}:`,
            error
        );

        const caseInfo =
            row.querySelector(".case-info span");

        const caseCrime =
            row.querySelector(".case-crime");

        caseInfo.textContent = "—";
        caseCrime.textContent = "—";
    }
}
loadRecentCases();