const API_BASE_URL = "http://127.0.0.1:8000";

const searchInput = document.getElementById("caseSearch");
const statusFilter = document.getElementById("statusFilter");
const crimeFilter = document.getElementById("crimeFilter");
const tableBody = document.getElementById("caseTableBody");
const caseCount = document.getElementById("caseCount");

const addCaseBtn = document.getElementById("addCaseBtn");
const addCaseModal = document.getElementById("addCaseModal");
const closeAddCaseModal = document.getElementById("closeAddCaseModal");
const cancelAddCase = document.getElementById("cancelAddCase");
const addCaseForm = document.getElementById("addCaseForm");

const caseFir = document.getElementById("caseFir");
const caseOfficer = document.getElementById("caseOfficer");
const caseStatus = document.getElementById("caseStatus");
const caseStartDate = document.getElementById("caseStartDate");
const addCaseMessage = document.getElementById("addCaseMessage");

let cases = [];
let firRecords = [];
let officerRecords = [];


/* =========================================================
   LOAD CASES
   ========================================================= */

async function loadCases() {

    try {

        const response = await fetch(`${API_BASE_URL}/cases/`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        cases = await response.json();

        if (!Array.isArray(cases)) {
            cases = [];
        }


        /* Load FIR information for every case */

        await Promise.all(

            cases.map(async (caseItem) => {

                try {

                    const firResponse = await fetch(
                        `${API_BASE_URL}/cases/${caseItem.case_id}/fir`
                    );

                    if (firResponse.ok) {

                        const firData = await firResponse.json();

                        caseItem.crime_name =
                            firData.crime_name || "—";

                        caseItem.fir_number =
                            firData.fir_number || "—";

                    } else {

                        caseItem.crime_name = "—";
                        caseItem.fir_number =
                            `FIR-${caseItem.fir_id}`;

                    }

                } catch (error) {

                    console.error(
                        `Error loading FIR for case ${caseItem.case_id}:`,
                        error
                    );

                    caseItem.crime_name = "—";
                    caseItem.fir_number =
                        `FIR-${caseItem.fir_id}`;

                }

            })

        );


        populateCrimeFilter();
        renderCases(cases);

    } catch (error) {

        console.error("Error loading cases:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center; padding:30px;">
                    Unable to load case records from the server.
                </td>
            </tr>
        `;

        updateCaseCount(0);
    }
}


/* =========================================================
   RENDER CASES
   ========================================================= */

function renderCases(caseData) {

    tableBody.innerHTML = "";

    updateCaseCount(caseData.length);

    if (caseData.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center; padding:30px;">
                    No cases found.
                </td>
            </tr>
        `;

        return;
    }


    caseData.forEach(caseItem => {

        const row = document.createElement("tr");

        const statusClass =
            getStatusClass(caseItem.status);

        const formattedCaseId =
            `CASE-${String(caseItem.case_id).padStart(3, "0")}`;


        row.innerHTML = `

            <td>
                <a
                    href="case-details.html?case_id=${caseItem.case_id}"
                    class="case-id-link"
                >
                    ${formattedCaseId}
                </a>
            </td>

            <td>
                <div class="table-case-title">
                    ${escapeHTML(caseItem.case_title || "—")}
                </div>
            </td>

            <td>
                ${escapeHTML(caseItem.fir_number || "—")}
            </td>

            <td>
                ${escapeHTML(caseItem.crime_name || "—")}
            </td>

            <td>
                ${escapeHTML(
                    caseItem.investigating_officer_name ||
                    `Officer #${caseItem.investigating_officer_id || "—"}`
                )}
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${escapeHTML(caseItem.status || "—")}
                </span>
            </td>

            <td>
                ${escapeHTML(caseItem.start_date || "—")}
            </td>

            <td>
                ${escapeHTML(caseItem.outcome || "—")}
            </td>

        `;

        tableBody.appendChild(row);

    });
}


/* =========================================================
   CASE COUNT
   ========================================================= */

function updateCaseCount(count) {

    if (!caseCount) return;

    caseCount.textContent =
        `${String(count).padStart(2, "0")} Cases`;
}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    if (!status) return "";

    const value = status.toLowerCase();

    if (value === "closed") {
        return "closed";
    }

    if (
        value.includes("trial") ||
        value.includes("ongoing")
    ) {
        return "ongoing";
    }

    if (value.includes("investigation")) {
        return "investigation";
    }

    return "";
}


/* =========================================================
   CRIME FILTER
   ========================================================= */

function populateCrimeFilter() {

    if (!crimeFilter) return;

    const currentValue = crimeFilter.value;

    const crimes = [
        ...new Set(
            cases
                .map(caseItem => caseItem.crime_name)
                .filter(
                    crime =>
                        crime &&
                        crime !== "—"
                )
        )
    ].sort();


    crimeFilter.innerHTML = `
        <option value="all">
            All Crimes
        </option>
    `;


    crimes.forEach(crime => {

        const option =
            document.createElement("option");

        option.value = crime;
        option.textContent = crime;

        crimeFilter.appendChild(option);

    });


    if (
        crimes.includes(currentValue)
    ) {
        crimeFilter.value = currentValue;
    }
}


/* =========================================================
   FILTER CASES
   ========================================================= */

function filterCases() {

    const searchValue =
        searchInput.value
            .trim()
            .toLowerCase();

    const statusValue =
        statusFilter.value
            .trim()
            .toLowerCase();

    const crimeValue =
        crimeFilter.value
            .trim()
            .toLowerCase();


    const filteredCases =
        cases.filter(caseItem => {

            const searchableText = `

                ${caseItem.case_id}
                ${caseItem.case_title}
                ${caseItem.fir_id}
                ${caseItem.fir_number}
                ${caseItem.crime_name}
                ${caseItem.investigating_officer_id}
                ${caseItem.investigating_officer_name}
                ${caseItem.status}
                ${caseItem.start_date}
                ${caseItem.outcome}
                ${caseItem.remarks}

            `.toLowerCase();


            const matchesSearch =
                searchableText.includes(searchValue);


            const matchesStatus =
                statusValue === "all" ||
                (caseItem.status || "")
                    .toLowerCase() === statusValue;


            const matchesCrime =
                crimeValue === "all" ||
                (caseItem.crime_name || "")
                    .toLowerCase() === crimeValue;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesCrime
            );

        });


    renderCases(filteredCases);
}


/* =========================================================
   LOAD FIR OPTIONS
   ========================================================= */

async function loadFIRRecords() {

    try {

        const response =
            await fetch(`${API_BASE_URL}/fir/`);

        if (!response.ok) {
            throw new Error(
                `FIR request failed: ${response.status}`
            );
        }

        firRecords = await response.json();

        if (!Array.isArray(firRecords)) {
            firRecords = [];
        }


        caseFir.innerHTML = `
            <option value="">
                Select FIR
            </option>
        `;


        firRecords.forEach(fir => {

            const option =
                document.createElement("option");

            option.value = fir.fir_id;

            option.textContent =
                `${fir.fir_number || `FIR-${fir.fir_id}`}`;

            caseFir.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading FIR records:",
            error
        );

        caseFir.innerHTML = `
            <option value="">
                Unable to load FIR records
            </option>
        `;
    }
}


/* =========================================================
   LOAD POLICE OFFICERS
   ========================================================= */

async function loadOfficerRecords() {

    try {

        const response =
            await fetch(`${API_BASE_URL}/police-officers/`);

        if (!response.ok) {
            throw new Error(
                `Officer request failed: ${response.status}`
            );
        }

        officerRecords =
            await response.json();

        if (!Array.isArray(officerRecords)) {
            officerRecords = [];
        }


        caseOfficer.innerHTML = `
            <option value="">
                Select Officer
            </option>
        `;


        officerRecords.forEach(officer => {

            const option =
                document.createElement("option");

            option.value =
                officer.officer_id;

            option.textContent =
                `${officer.name || `Officer #${officer.officer_id}`}` +
                `${officer.rank ? ` · ${officer.rank}` : ""}`;

            caseOfficer.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading police officers:",
            error
        );

        caseOfficer.innerHTML = `
            <option value="">
                Unable to load officers
            </option>
        `;
    }
}


/* =========================================================
   OPEN MODAL
   ========================================================= */

async function openAddCaseModal() {

    addCaseMessage.textContent = "";
    addCaseMessage.className = "form-message";

    addCaseForm.reset();


    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    caseStartDate.value = today;


    addCaseModal.classList.add("show");


    await Promise.all([
        loadFIRRecords(),
        loadOfficerRecords()
    ]);
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

    addCaseModal.classList.remove("show");

}


/* =========================================================
   SUBMIT NEW CASE
   ========================================================= */

async function createCase(event) {

    event.preventDefault();


    addCaseMessage.textContent =
        "Creating case...";

    addCaseMessage.className =
        "form-message";


    const payload = {

        fir_id:
            Number(caseFir.value),

        case_title:
            document
                .getElementById("caseTitle")
                .value
                .trim(),

        investigating_officer_id:
            Number(caseOfficer.value),

        start_date:
            caseStartDate.value,

        status:
            caseStatus.value,

        outcome:
            document
                .getElementById("caseOutcome")
                .value
                .trim(),

        closing_date:
            document
                .getElementById("caseClosingDate")
                .value ||
            null,

        remarks:
            document
                .getElementById("caseRemarks")
                .value
                .trim()

    };


    try {

        const response =
            await fetch(`${API_BASE_URL}/cases/`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)

            });


        const responseData =
            await response.json()
                .catch(() => null);


        if (!response.ok) {

            const errorMessage =
                responseData?.detail
                    ? JSON.stringify(
                        responseData.detail
                    )
                    : `HTTP ${response.status}`;

            throw new Error(errorMessage);
        }


        addCaseMessage.textContent =
            "Case created successfully.";

        addCaseMessage.className =
            "form-message success";


        setTimeout(async () => {

            closeModal();

            await loadCases();

        }, 700);


    } catch (error) {

        console.error(
            "Error creating case:",
            error
        );

        addCaseMessage.textContent =
            `Unable to create case: ${error.message}`;

        addCaseMessage.className =
            "form-message error";
    }
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

searchInput.addEventListener(
    "input",
    filterCases
);

statusFilter.addEventListener(
    "change",
    filterCases
);

crimeFilter.addEventListener(
    "change",
    filterCases
);


addCaseBtn.addEventListener(
    "click",
    openAddCaseModal
);

closeAddCaseModal.addEventListener(
    "click",
    closeModal
);

cancelAddCase.addEventListener(
    "click",
    closeModal
);

addCaseForm.addEventListener(
    "submit",
    createCase
);


addCaseModal.addEventListener(
    "click",
    event => {

        if (
            event.target === addCaseModal
        ) {
            closeModal();
        }

    }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadCases();