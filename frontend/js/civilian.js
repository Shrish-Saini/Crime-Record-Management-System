const user = requireRole(["civilian"]);

if (!user) {
    throw new Error("Unauthorized");
}

// ----------------------------------------
// SEARCH BY AADHAAR
// ----------------------------------------

async function searchAadhaar() {

    const input = document.getElementById("aadhaarInput");
    const message = document.getElementById("searchMessage");

    const aadhaar = input.value.trim();


    // Validate Aadhaar

    if (!/^\d{12}$/.test(aadhaar)) {

        message.textContent =
            "Please enter a valid 12-digit Aadhaar number.";

        return;
    }


    message.textContent = "Searching...";


    document.getElementById("personSection").style.display = "none";
    document.getElementById("casesSection").style.display = "none";


    try {

        const response = await authFetch(
            `${API_BASE_URL}/person-search/aadhaar/${aadhaar}`
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail || "Unable to find records."
            );
        }


        displayPerson(data.person);

        displayCases(data.cases);

        message.textContent = "";


    } catch (error) {

        console.error(error);

        message.textContent =
            error.message || "Unable to search records.";
    }
}


// ----------------------------------------
// DISPLAY PERSON
// ----------------------------------------

function displayPerson(person) {

    document.getElementById("personSection").style.display = "block";


    document.getElementById("personName").textContent =
        person.full_name || "-";


    document.getElementById("personDOB").textContent =
        person.date_of_birth || "-";


    document.getElementById("personGender").textContent =
        person.gender || "-";


    document.getElementById("personCity").textContent =
        person.city || "-";
}


// ----------------------------------------
// DISPLAY CASES
// ----------------------------------------

function displayCases(cases) {

    const section =
        document.getElementById("casesSection");

    const results =
        document.getElementById("results");

    const count =
        document.getElementById("caseCount");


    section.style.display = "block";


    count.textContent =
        `${cases.length} ${
            cases.length === 1 ? "case" : "cases"
        }`;


    if (cases.length === 0) {

        results.innerHTML =
            "<p>No cases are associated with this Aadhaar number.</p>";

        return;
    }

results.innerHTML = `
    <div class="case-table-wrapper">
        <table class="case-table">
            <thead>
                <tr>
                    <th>Case ID</th>
                    <th>Case Title</th>
                    <th>Involvement</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Legal Outcome</th>
                    <th>Charges</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${cases.map(caseItem => {
                    const chargesHTML =
                        caseItem.charges && caseItem.charges.length > 0
                            ? caseItem.charges.map(charge => `
                                <div class="case-charge">
                                    <strong>${charge.section_code || "BNS Section"}</strong>
                                    <span>${charge.section_title || ""}</span>
                                </div>
                            `).join("")
                            : '<span class="case-no-charges">No charges recorded.</span>';

                    return `
                        <tr>
                            <td>${caseItem.case_id ?? "-"}</td>
                            <td class="case-title-cell">${caseItem.case_title || "Untitled Case"}</td>
                            <td>${caseItem.involvement || "N/A"}</td>
                            <td>${caseItem.start_date || "N/A"}</td>
                            <td><span class="case-status">${caseItem.status || "N/A"}</span></td>
                            <td>${caseItem.outcome || "Pending"}</td>
                            <td class="case-charges-cell">${chargesHTML}</td>
                            <td>
                                <button type="button" class="case-view-button"
                                    onclick="viewCase(${Number(caseItem.case_id)})">
                                    View Case
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    </div>
`;
}

async function loadAllCases() {

    const results =
        document.getElementById("results");

    const section =
        document.getElementById("casesSection");

    const count =
        document.getElementById("caseCount");


    results.innerHTML = "<p>Loading cases...</p>";

    section.style.display = "block";


    try {

        const response = await authFetch(
            `${API_BASE_URL}/cases/?skip=0&limit=100`
        );


        if (!response.ok) {

            throw new Error(
                "Unable to load case records."
            );
        }


        const cases = await response.json();


        count.textContent =
            `${cases.length} case${
                cases.length === 1 ? "" : "s"
            } found`;


        if (cases.length === 0) {

            results.innerHTML =
                "<p>No case records found.</p>";

            return;
        }


        displayCases(cases);


    } catch (error) {

        console.error(error);

        results.innerHTML =
            "<p>Unable to load case records.</p>";
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
// ENTER KEY
// ----------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById("aadhaarInput");


        input.addEventListener(
            "keypress",
            event => {

                if (event.key === "Enter") {
                    searchAadhaar();
                }

            }
        );

    }
);