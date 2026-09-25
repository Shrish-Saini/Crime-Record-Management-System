

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
   LOAD OFFICER NAMES FOR CASES
   ========================================================= */

async function loadOfficerNamesForCases() {

    try {

        const response =
            await authFetch(
                `${API_BASE_URL}/police-officers/?skip=0&limit=100`
            );

        if (!response.ok) {

            throw new Error(
                `Officer request failed: ${response.status}`
            );
        }

        const records =
            await response.json();

        const officers =
            Array.isArray(records)
                ? records
                : [];

        window.caseOfficerRecords =
            officers;

        console.log(
            "Officers loaded for cases:",
            officers
        );

    } catch (error) {

        console.error(
            "Error loading officer names:",
            error
        );

        window.caseOfficerRecords = [];
    }
}
/* =========================================================
   LOAD CASES
   ========================================================= */

async function loadCases() {

    try {

        const response = await authFetch(`${API_BASE_URL}/cases/`);

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

                    const firResponse = await authFetch(
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
    document.getElementById("caseOfficer").dispatchEvent(
        new Event("input")
    );


        await loadOfficerNamesForCases();
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
        (
            window.caseOfficerRecords || []
        ).find(
            officer =>
                officer.officer_id ===
                caseItem.investigating_officer_id
        )?.name ||
        caseItem.investigating_officer_name ||
        `Officer #${caseItem.investigating_officer_id || ""}`
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
   LOAD station records
   ========================================================= */

async function loadStationRecords() {

    try {

        const response =
            await authFetch(
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

        window.stationRecords =
            stations;

        const datalist =
            document.getElementById("stationOptions");

        datalist.innerHTML = "";

        stations.forEach(station => {

            const option =
                document.createElement("option");

            option.value =
                station.station_name ||
                `Station #${station.station_id}`;

            datalist.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loading police stations:",
            error
        );

        window.stationRecords = [];
    }
}
   
/* =========================================================
   LOAD COMPLAINANTS
   ========================================================= */

async function loadPersonRecords() {

    try {

        const response =
            await authFetch(
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
            await authFetch(
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
            await authFetch (
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
    document.getElementById("newStationFields").style.display = "none";
document.getElementById("newOfficerFields").style.display = "none";
document.getElementById("newComplainantFields").style.display = "none";
document.getElementById("newCrimeFields").style.display = "none";


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
   SHOW / HIDE NEW RECORD FIELDS
   ========================================================= */
function setupNewRecordDetection() {

    function normalize(value) {
        return (value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }


    /* -----------------------------------------------------
       POLICE STATION
       ----------------------------------------------------- */

    const stationInput =
        document.getElementById("caseStation");

    const newStationFields =
        document.getElementById("newStationFields");


    stationInput.addEventListener("input", function () {

        const enteredName =
            normalize(this.value);

        const existingStation =
            (window.stationRecords || []).some(
                station =>
                    normalize(station.station_name) ===
                    enteredName
            );

        newStationFields.style.display =
            enteredName && !existingStation
                ? "block"
                : "none";
    });


    /* -----------------------------------------------------
       COMPLAINANT
       ----------------------------------------------------- */

    const complainantInput =
        document.getElementById("complainant");

    const newComplainantFields =
        document.getElementById("newComplainantFields");


    complainantInput.addEventListener("input", function () {

        const enteredName =
            normalize(this.value);

        const existingPerson =
            (window.personRecords || []).some(
                person =>
                    normalize(person.full_name) ===
                    enteredName
            );

        newComplainantFields.style.display =
            enteredName && !existingPerson
                ? "block"
                : "none";
    });


    /* -----------------------------------------------------
       INVESTIGATING OFFICER
       ----------------------------------------------------- */
const officerInput =
    document.getElementById("caseOfficer");

const newOfficerFields =
    document.getElementById("newOfficerFields");


officerInput.addEventListener("input", () => {

    const enteredName =
        officerInput.value
            .trim()
            .replace(/\s+/g, " ");

    const existingOfficer =
        (window.officerRecords || []).find(
            officer => {

                const existingName =
                    (
                        officer.name ||
                        officer.full_name ||
                        ""
                    )
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    enteredName.toLowerCase()
                );
            }
        );


    if (enteredName && !existingOfficer) {

        newOfficerFields.style.display =
            "block";

    } else {

        newOfficerFields.style.display =
            "none";
    }

});

    /* -----------------------------------------------------
       CRIME TYPE
       ----------------------------------------------------- */

    const crimeInput =
        document.getElementById("caseCrime");

    const newCrimeFields =
        document.getElementById("newCrimeFields");


    crimeInput.addEventListener("input", function () {

        const enteredName =
            normalize(this.value);

        const existingCrime =
            (window.crimeRecords || []).some(
                crime =>
                    normalize(crime.crime_name) ===
                    enteredName
            );

        newCrimeFields.style.display =
            enteredName && !existingCrime
                ? "block"
                : "none";
    });

}
/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

    addCaseModal.classList.remove("show");

}

/* =========================================================
   GET OR CREATE PERSON
   ========================================================= */

async function getOrCreatePerson() {

    const name =
        document.getElementById("complainant")
            .value
            .trim();

    if (!name) {
        throw new Error("Please enter a complainant name.");
    }


    /* Check whether person already exists */

    const existingPerson =
        (window.personRecords || []).find(
            person => {

                const existingName =
                    (person.full_name || "")
                        .trim()
                        .replace(/\s+/g, " ");

                const enteredName =
                    name
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    enteredName.toLowerCase()
                );
            }
        );


    /* Existing person */

    if (existingPerson) {

        console.log(
            "Using existing complainant:",
            existingPerson
        );

        return existingPerson.person_id;
    }


    /* New person */

    const personPayload = {

        full_name: name,

        date_of_birth:
            document.getElementById("complainantDob")
                ?.value || null,

        gender:
            document.getElementById("complainantGender")
                ?.value
                .trim() || null,

        phone:
            document.getElementById("complainantPhone")
                ?.value
                .trim() || null,

        email:
            document.getElementById("complainantEmail")
                ?.value
                .trim() || null,

        address:
            document.getElementById("complainantAddress")
                ?.value
                .trim() || null,

        city:
            document.getElementById("complainantCity")
                ?.value
                .trim() || null,

        state:
            document.getElementById("complainantState")
                ?.value
                .trim() || null,

        pincode:
            document.getElementById("complainantPincode")
                ?.value
                .trim() || null

    };


    console.log(
        "Creating new complainant:",
        personPayload
    );


    const response =
        await authFetch(
            `${API_BASE_URL}/persons/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(personPayload)
            }
        );


    if (!response.ok) {

        let errorMessage =
            "Unable to create the new complainant.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (_) {}

        throw new Error(errorMessage);
    }


    const createdPerson =
        await response.json();


    console.log(
        "New complainant created:",
        createdPerson
    );


    /* Add new person to local records */

    window.personRecords =
        window.personRecords || [];

    window.personRecords.push(
        createdPerson
    );


    return createdPerson.person_id;
}
/* =========================================================
   GET OR CREATE CRIME
   ========================================================= */

async function getOrCreateCrime() {

    const crimeName =
        document.getElementById("caseCrime")
            .value
            .trim();

    if (!crimeName) {
        throw new Error("Please enter a crime type.");
    }


    /* Check whether crime already exists */

    const existingCrime =
        (window.crimeRecords || []).find(
            crime => {

                const existingName =
                    (crime.crime_name || "")
                        .trim()
                        .replace(/\s+/g, " ");

                const enteredName =
                    crimeName
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    enteredName.toLowerCase()
                );
            }
        );


    /* Existing crime */

    if (existingCrime) {

        console.log(
            "Using existing crime:",
            existingCrime
        );

        return existingCrime.crime_id;
    }


    /* New crime */

    const crimePayload = {

        crime_name: crimeName,

        description:
            document.getElementById("crimeDescription")
                ?.value
                .trim() || null,

        severity:
            document.getElementById("crimeSeverity")
                ?.value
                .trim() || null

    };


    console.log(
        "Creating new crime:",
        crimePayload
    );


    const response =
        await authFetch(
            `${API_BASE_URL}/crimes/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(crimePayload)
            }
        );


    if (!response.ok) {

        let errorMessage =
            "Unable to create the new crime type.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (_) {}

        throw new Error(errorMessage);
    }


    const createdCrime =
        await response.json();


    console.log(
        "New crime created:",
        createdCrime
    );


    /* Add new crime to local records */

    window.crimeRecords =
        window.crimeRecords || [];

    window.crimeRecords.push(
        createdCrime
    );


    return createdCrime.crime_id;
}
/* =========================================================
   GET OR CREATE POLICE STATION
   ========================================================= */

async function getOrCreateStation() {

    const stationName =
        document.getElementById("caseStation")
            .value
            .trim();

    if (!stationName) {
        throw new Error("Please enter a police station.");
    }


    /* Check whether station already exists */

    const existingStation =
        (window.stationRecords || []).find(
            station => {

                const existingName =
                    (station.station_name || "")
                        .trim()
                        .replace(/\s+/g, " ");

                const enteredName =
                    stationName
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    enteredName.toLowerCase()
                );
            }
        );


    /* Existing station */

    if (existingStation) {

        console.log(
            "Using existing police station:",
            existingStation
        );

        return existingStation.station_id;
    }


    /* New station */

    const stationPayload = {

        station_name: stationName,

        address:
            document.getElementById("stationAddress")
                ?.value
                .trim() || "",

        city:
            document.getElementById("stationCity")
                ?.value
                .trim() || "",

        state:
            document.getElementById("stationState")
                ?.value
                .trim() || "",

        pincode:
            document.getElementById("stationPincode")
                ?.value
                .trim() || "",

        phone:
            document.getElementById("stationPhone")
                ?.value
                .trim() || ""

    };


    /* Basic validation for a new station */

    if (
        !stationPayload.address ||
        !stationPayload.city ||
        !stationPayload.state ||
        !stationPayload.pincode ||
        !stationPayload.phone
    ) {

        throw new Error(
            "Please complete all new police station details."
        );
    }


    console.log(
        "Creating new police station:",
        stationPayload
    );


    const response =
        await authFetch(
            `${API_BASE_URL}/police-stations/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(stationPayload)
            }
        );


    if (!response.ok) {

        let errorMessage =
            "Unable to create the new police station.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (_) {}

        throw new Error(errorMessage);
    }


    const createdStation =
        await response.json();


    console.log(
        "New police station created:",
        createdStation
    );


    /* Add new station to local records */

    window.stationRecords =
        window.stationRecords || [];

    window.stationRecords.push(
        createdStation
    );


    return createdStation.station_id;
}
/* =========================================================
   GET OR CREATE POLICE OFFICER
   ========================================================= */

async function getOrCreateOfficer(stationId) {

    const officerName =
        document.getElementById("caseOfficer")
            .value
            .trim();

    if (!officerName) {
        throw new Error(
            "Please enter an investigating officer."
        );
    }


    /* Check whether officer already exists */

    const existingOfficer =
        (window.officerRecords || []).find(
            officer => {

                const existingName =
                    (
                        officer.name ||
                        officer.full_name ||
                        ""
                    )
                        .trim()
                        .replace(/\s+/g, " ");

                const enteredName =
                    officerName
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    enteredName.toLowerCase()
                );
            }
        );


    /* Existing officer */

    if (existingOfficer) {

        console.log(
            "Using existing officer:",
            existingOfficer
        );

        return existingOfficer.officer_id;
    }


    /* New officer */

    if (!stationId) {
        throw new Error(
            "A police station is required before creating a new officer."
        );
    }


    const officerPayload = {

        station_id: stationId,

        name: officerName,

        rank:
            document.getElementById("officerRank")
                ?.value
                .trim() || "",

        badge_number:
            document.getElementById("officerBadge")
                ?.value
                .trim() || "",

        phone:
            document.getElementById("officerPhone")
                ?.value
                .trim() || null,

        email:
            document.getElementById("officerEmail")
                ?.value
                .trim() || null,

        joining_date:
            document.getElementById("officerJoiningDate")
                ?.value || null,

        status: "Active"
    };


    /* Required fields for a new officer */

    if (
        !officerPayload.rank ||
        !officerPayload.badge_number
    ) {

        throw new Error(
            "Please enter the rank and badge number for the new officer."
        );
    }


    console.log(
        "Creating new police officer:",
        officerPayload
    );


    const response =
        await authFetch(
            `${API_BASE_URL}/police-officers/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(officerPayload)
            }
        );


    if (!response.ok) {

        let errorMessage =
            "Unable to create the new investigating officer.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (_) {}

        throw new Error(errorMessage);
    }


    const createdOfficer =
        await response.json();


    console.log(
        "New police officer created:",
        createdOfficer
    );


    /* Add new officer to local records */

    window.officerRecords =
        window.officerRecords || [];

    window.officerRecords.push(
        createdOfficer
    );


    return createdOfficer.officer_id;
}
/* =========================================================
   GET OR CREATE CRIMINAL
   ========================================================= */

async function getOrCreateCriminal() {

    const criminalName =
        document.getElementById("caseCriminal")
            ?.value
            .trim() || "";


    /* Accused / suspect is optional */

    if (!criminalName) {
        return null;
    }


    const normalizedName =
        criminalName
            .trim()
            .replace(/\s+/g, " ");


    /* =====================================================
       CHECK WHETHER THIS PERSON ALREADY EXISTS
       ===================================================== */

    let person =
        (window.personRecords || []).find(
            record => {

                const existingName =
                    (record.full_name || "")
                        .trim()
                        .replace(/\s+/g, " ");

                return (
                    existingName.toLowerCase() ===
                    normalizedName.toLowerCase()
                );
            }
        );


    /* =====================================================
       CREATE PERSON IF NECESSARY
       ===================================================== */

    if (!person) {

        const personPayload = {

            full_name:
                normalizedName,

            date_of_birth: null,
            gender: null,
            phone: null,
            email: null,
            address: null,
            city: null,
            state: null,
            pincode: null

        };


        console.log(
            "Creating person for criminal:",
            personPayload
        );


        const personResponse =
            await authFetch(
                `${API_BASE_URL}/persons/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(personPayload)
                }
            );


        if (!personResponse.ok) {

            let errorMessage =
                "Unable to create the person record.";

            try {

                const errorData =
                    await personResponse.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (_) {}

            throw new Error(errorMessage);
        }


        person =
            await personResponse.json();


        window.personRecords =
            window.personRecords || [];

        window.personRecords.push(person);


        console.log(
            "New person created:",
            person
        );
    }


    /* =====================================================
       CHECK WHETHER PERSON IS ALREADY A CRIMINAL
       ===================================================== */

    let criminal = null;


    try {

        const response =
            await authFetch(
                `${API_BASE_URL}/criminals/?skip=0&limit=100`
            );


        if (response.ok) {

            const criminalRecords =
                await response.json();

            const criminals =
                Array.isArray(criminalRecords)
                    ? criminalRecords
                    : [];


            criminal =
                criminals.find(
                    record =>
                        record.person_id ===
                        person.person_id
                );
        }

    } catch (error) {

        console.error(
            "Error checking criminal records:",
            error
        );
    }


    /* =====================================================
       RETURN EXISTING CRIMINAL
       ===================================================== */

    if (criminal) {

        console.log(
            "Using existing criminal:",
            criminal
        );

        return criminal.criminal_id;
    }


    /* =====================================================
       CREATE NEW CRIMINAL
       ===================================================== */

    const criminalPayload = {

        person_id:
            person.person_id,

        criminal_status:
            document.getElementById("criminalStatus")
                ?.value
                .trim() || "Suspect",

        identification_details:
            document.getElementById("criminalIdentification")
                ?.value
                .trim() || null,

        remarks: null

    };


    console.log(
        "Creating new criminal:",
        criminalPayload
    );


    const criminalResponse =
        await authFetch(
            `${API_BASE_URL}/criminals/`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(criminalPayload)
            }
        );


    if (!criminalResponse.ok) {

        let errorMessage =
            "Unable to create the criminal record.";

        try {

            const errorData =
                await criminalResponse.json();

            if (errorData.detail) {
                errorMessage =
                    errorData.detail;
            }

        } catch (_) {}

        throw new Error(errorMessage);
    }


    criminal =
        await criminalResponse.json();


    console.log(
        "New criminal created:",
        criminal
    );


    return criminal.criminal_id;
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


    /* =====================================================
       READ FORM VALUES
       ===================================================== */

    const firNumber =
        document.getElementById("firNumber")
            .value
            .trim();

    const incidentDate =
        document.getElementById("incidentDate")
            .value;

    const incidentTime =
        document.getElementById("incidentTime")
            .value;

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

    const caseStartDate =
        document.getElementById("caseStartDate")
            .value;

    const caseStatus =
        document.getElementById("caseStatus")
            .value;

    const outcome =
        document.getElementById("caseOutcome")
            .value || null;

    const closingDate =
        document.getElementById("caseClosingDate")
            .value || null;

    const remarks =
        document.getElementById("caseRemarks")
            .value
            .trim() || null;


    /* =====================================================
       BASIC VALIDATION
       ===================================================== */

    if (
        !firNumber ||
        !incidentDate ||
        !incidentTime ||
        !incidentLocation ||
        !description ||
        !caseTitle ||
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


    /* =====================================================
       START SUBMISSION
       ===================================================== */

    submitButton.disabled = true;

    submitButton.textContent =
        "Registering...";


    try {

        /* =================================================
           1. GET OR CREATE POLICE STATION
           ================================================= */

        const stationId =
            await getOrCreateStation();


        /* =================================================
           2. GET OR CREATE COMPLAINANT
           ================================================= */

        const complainantId =
            await getOrCreatePerson();


        /* =================================================
           3. GET OR CREATE CRIME
           ================================================= */

        const crimeId =
            await getOrCreateCrime();


        /* =================================================
           4. GET OR CREATE INVESTIGATING OFFICER
           ================================================= */

        const officerId =
            await getOrCreateOfficer(stationId);


        /* =================================================
           5. CREATE FIR
           ================================================= */

        const firPayload = {

            fir_number:
                firNumber,

            station_id:
                stationId,

            complainant_id:
                complainantId,

            crime_id:
                crimeId,

            incident_date:
                incidentDate,

            incident_time:
                `${incidentTime}:00`,

            incident_location:
                incidentLocation,

            description:
                description,

            registration_date:
                caseStartDate,

            status:
                "Registered"
        };


        console.log(
            "Creating FIR:",
            firPayload
        );


        const firResponse =
            await authFetch(
                `${API_BASE_URL}/fir/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(firPayload)
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


        const firId =
            createdFir.fir_id;


        console.log(
            "FIR created:",
            createdFir
        );


        /* =================================================
           6. CREATE CASE
           ================================================= */

        const casePayload = {

            fir_id:
                firId,

            case_title:
                caseTitle,

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
            "Creating case:",
            casePayload
        );


        const caseResponse =
            await authFetch(
                `${API_BASE_URL}/cases/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(casePayload)
                }
            );


        if (!caseResponse.ok) {

            let errorMessage =
                "Unable to create the case.";

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


        const caseId =
            createdCase.case_id;


        console.log(
            "Case created:",
            createdCase
        );


        /* =================================================
           7. OPTIONAL: GET OR CREATE CRIMINAL
           ================================================= */

        const criminalId =
            await getOrCreateCriminal();


        /* =================================================
           8. LINK CRIMINAL TO CASE
           ================================================= */

        if (criminalId) {

            const criminalStatus =
                document.getElementById("criminalStatus")
                    ?.value
                    .trim() || "Suspect";


            const caseCriminalPayload = {

                case_id:
                    caseId,

                criminal_id:
                    criminalId,

                involvement:
                    criminalStatus,

                remarks:
                    null
            };


            console.log(
                "Linking criminal to case:",
                caseCriminalPayload
            );


            const linkResponse =
                await authFetch(
                    `${API_BASE_URL}/case-criminals/`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                caseCriminalPayload
                            )
                    }
                );


            if (!linkResponse.ok) {

                let errorMessage =
                    "Case was created, but the accused/suspect could not be linked.";

                try {

                    const errorData =
                        await linkResponse.json();

                    if (errorData.detail) {
                        errorMessage =
                            errorData.detail;
                    }

                } catch (_) {}

                throw new Error(errorMessage);
            }


            console.log(
                "Criminal linked to case successfully."
            );
        }


        /* =================================================
           SUCCESS
           ================================================= */

        message.textContent =
            "FIR and case registered successfully.";

        message.className =
            "form-message success";


        submitButton.textContent =
            "Registered";


        /* Refresh case table */

        await loadCases();


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
   NEW RECORD DETECTION
   ========================================================= */

setupNewRecordDetection();


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadCases();