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

/* =========================================================
   LOAD POLICE STATIONS
   ========================================================= */

async function loadStationRecords() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/police-stations/?skip=0&limit=100`
            );

        if (!response.ok) {
            throw new Error(
                `Police station request failed: ${response.status}`
            );
        }

        const stationRecords =
            await response.json();

        const stations =
            Array.isArray(stationRecords)
                ? stationRecords
                : [];


        caseStation.innerHTML = `
            <option value="">
                Select police station
            </option>
        `;


        stations.forEach(station => {

            const option =
                document.createElement("option");

            option.value =
                station.station_id;

            option.textContent =
                station.station_name ||
                `Station #${station.station_id}`;

            caseStation.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading police stations:",
            error
        );

        caseStation.innerHTML = `
            <option value="">
                Unable to load police stations
            </option>
        `;
    }
}


/* =========================================================
   LOAD COMPLAINANTS
   ========================================================= */

async function loadPersonRecords() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/persons/?skip=0&limit=100`
            );

        if (!response.ok) {
            throw new Error(
                `Person request failed: ${response.status}`
            );
        }

        const personRecords =
            await response.json();

        const persons =
            Array.isArray(personRecords)
                ? personRecords
                : [];

        window.personRecords = persons;


        const datalist =
            document.getElementById("complainantOptions");

        datalist.innerHTML = "";


        persons.forEach(person => {

            const option =
                document.createElement("option");

            option.value =
                person.full_name;

            datalist.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading complainants:",
            error
        );

    }
}
/* =========================================================
   LOAD CRIME TYPES
   ========================================================= */

async function loadCrimeRecords() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/crimes/?skip=0&limit=100`
            );

        if (!response.ok) {
            throw new Error(
                `Crime request failed: ${response.status}`
            );
        }

        const crimeRecords =
            await response.json();

        const crimes =
            Array.isArray(crimeRecords)
                ? crimeRecords
                : [];

        window.crimeRecords = crimes;


        const datalist =
            document.getElementById("crimeOptions");

        datalist.innerHTML = "";


        crimes.forEach(crime => {

            const option =
                document.createElement("option");

            option.value =
                crime.crime_name;

            datalist.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading crime types:",
            error
        );

    }
}
/* =========================================================
   LOAD POLICE OFFICERS
   ========================================================= */

async function loadOfficerRecords() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/police-officers/?skip=0&limit=100`
            );

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

        window.officerRecords =
            officerRecords;


        const datalist =
            document.getElementById("officerOptions");

        datalist.innerHTML = "";


        officerRecords.forEach(officer => {

            const option =
                document.createElement("option");

            option.value =
                officer.name ||
                `Officer #${officer.officer_id}`;

            datalist.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading police officers:",
            error
        );

    }
}

/* OPEN MODAL */

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
        loadOfficerRecords(),
        loadStationRecords(),
        loadPersonRecords(),
        loadCrimeRecords()
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


    const submitButton =
        document.getElementById("submitCaseBtn");

    const message =
        document.getElementById("addCaseMessage");


    message.textContent = "";
    message.className = "form-message";


    // =========================================
    // GET FORM VALUES
    // =========================================
const firNumber =
    document.getElementById("firNumber")
        .value
        .trim();

const crimeName =
    document.getElementById("caseCrime")
        .value
        .trim();

const stationId =
    Number(
        document.getElementById("caseStation").value
    );

const complainantName =
    document.getElementById("complainant")
        .value
        .trim();

const incidentDate =
    document.getElementById("incidentDate").value;

const incidentTime =
    document.getElementById("incidentTime").value;

const incidentLocation =
    document.getElementById("incidentLocation")
        .value
        .trim();

const description =
    document.getElementById("firDescription")
        .value
        .trim();


const caseTitle =
    document.getElementById("caseTitle")
        .value
        .trim();

const officerName =
    document.getElementById("caseOfficer")
        .value
        .trim();

const caseStartDate =
    document.getElementById("caseStartDate").value;

const caseStatus =
    document.getElementById("caseStatus").value;

const outcome =
    document.getElementById("caseOutcome").value ||
    null;

const closingDate =
    document.getElementById("caseClosingDate").value ||
    null;

const remarks =
    document.getElementById("caseRemarks")
        .value
        .trim() || null;


/* Resolve typed names to their database IDs */

const selectedCrime =
    (window.crimeRecords || []).find(
        crime =>
            crime.crime_name &&
            crime.crime_name.toLowerCase() ===
            crimeName.toLowerCase()
    );

const selectedComplainant =
    (window.personRecords || []).find(
        person => {

            const personName =
                (person.full_name || "")
                    .trim()
                    .replace(/\s+/g, " ");

            const enteredName =
                complainantName
                    .trim()
                    .replace(/\s+/g, " ");

            return (
                personName.toLowerCase() ===
                enteredName.toLowerCase()
            );
        }
    );

const selectedOfficer =
    (window.officerRecords || []).find(
        officer => {

            const officerDisplayName =
                officer.name ||
                officer.full_name ||
                "";

            return (
                officerDisplayName.toLowerCase() ===
                officerName.toLowerCase()
            );
        }
    );


/* Validate selected records */

if (!selectedCrime) {

    message.textContent =
        "Please select a valid crime type from the suggestions.";

    message.className =
        "form-message error";

    return;
}

if (!selectedComplainant) {

    message.textContent =
        "Please select a valid complainant from the suggestions.";

    message.className =
        "form-message error";

    return;
}

if (!selectedOfficer) {

    message.textContent =
        "Please select a valid investigating officer from the suggestions.";

    message.className =
        "form-message error";

    return;
}


/* Get database IDs */

const crimeId =
    selectedCrime.crime_id;

const complainantId =
    selectedComplainant.person_id;

const officerId =
    selectedOfficer.officer_id;
    
    

    // =========================================
    // EXTRA VALIDATION
    // =========================================

    if (
        !firNumber ||
        !crimeId ||
        !stationId ||
        !complainantId ||
        !incidentDate ||
        !incidentTime ||
        !incidentLocation ||
        !description ||
        !caseTitle ||
        !officerId ||
        !caseStartDate
    ) {

        message.textContent =
            "Please complete all required fields.";

        message.className =
            "form-message error";

        return;
    }


    if (
        closingDate &&
        closingDate < caseStartDate
    ) {

        message.textContent =
            "Closing date cannot be earlier than the case start date.";

        message.className =
            "form-message error";

        return;
    }


    // =========================================
    // DISABLE BUTTON
    // =========================================

    submitButton.disabled = true;

    submitButton.textContent =
        "Registering...";


    try {

        // =====================================
        // STEP 1
        // CREATE NEW FIR
        // =====================================

        const firPayload = {

            fir_number: firNumber,

            station_id: stationId,

            complainant_id: complainantId,

            crime_id: crimeId,

            incident_date: incidentDate,

            incident_time: `${incidentTime}:00`,

            incident_location: incidentLocation,

            description: description,

            registration_date: caseStartDate,

            status: "Registered"

        };


        console.log(
            "Creating FIR:",
            firPayload
        );


        const firResponse =
            await fetch(
                `${API_BASE_URL}/fir/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            firPayload
                        )
                }
            );


        if (!firResponse.ok) {

            let errorMessage =
                "Unable to register the FIR.";

            try {

                const errorData =
                    await firResponse.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (_) {}

            throw new Error(errorMessage);
        }


        const createdFir =
            await firResponse.json();


        console.log(
            "FIR created:",
            createdFir
        );


        // =====================================
        // GET GENERATED FIR ID
        // =====================================

        const firId =
            createdFir.fir_id;


        if (!firId) {

            throw new Error(
                "FIR was created, but no FIR ID was returned."
            );

        }


        // =====================================
        // STEP 2
        // CREATE CASE
        // =====================================

        const casePayload = {

            fir_id: firId,

            case_title: caseTitle,

            investigating_officer_id:
                officerId,

            start_date:
                caseStartDate,

            status:
                caseStatus,

            outcome:
                outcome,

            closing_date:
                closingDate,

            remarks:
                remarks

        };


        console.log(
            "Creating Case:",
            casePayload
        );


        const caseResponse =
            await fetch(
                `${API_BASE_URL}/cases/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            casePayload
                        )
                }
            );


        if (!caseResponse.ok) {

            let errorMessage =
                "FIR was registered, but the case could not be created.";

            try {

                const errorData =
                    await caseResponse.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (_) {}

            throw new Error(errorMessage);
        }


        const createdCase =
            await caseResponse.json();


        console.log(
            "Case created:",
            createdCase
        );


        // =====================================
        // SUCCESS
        // =====================================

        message.textContent =
            "FIR and case registered successfully.";

        message.className =
            "form-message success";


        submitButton.textContent =
            "Registered";


        // =====================================
        // REFRESH CASE TABLE
        // =====================================

        await loadCases();


        // Close after short success message

        setTimeout(() => {

            closeModal();

        }, 1000);


    } catch (error) {

        console.error(
            "Error registering case:",
            error
        );


        message.textContent =
            error.message ||
            "Unable to register the case.";

        message.className =
            "form-message error";


        submitButton.disabled = false;

        submitButton.textContent =
            "Register Case";

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