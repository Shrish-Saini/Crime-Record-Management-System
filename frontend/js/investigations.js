

const searchInput =
    document.getElementById("investigationSearch");

const statusFilter =
    document.getElementById("investigationStatusFilter");

const tableBody =
    document.getElementById("investigationTableBody");

const investigationCount =
    document.getElementById("investigationCount");

let investigations = [];


/* LOAD INVESTIGATIONS */

async function loadInvestigations() {

    try {

        /* Get all cases first */

        const casesResponse = await authFetch(
            `${API_BASE_URL}/cases/`
        );

        if (!casesResponse.ok) {
            throw new Error(
                `HTTP error: ${casesResponse.status}`
            );
        }

        const cases = await casesResponse.json();


        /* Get investigations for every case */

        const investigationResults =
            await Promise.all(

                cases.map(async caseItem => {

                    try {

                        const response = await authFetch(
                            `${API_BASE_URL}/cases/${caseItem.case_id}/investigations`
                        );

                        if (!response.ok) {
                            return [];
                        }

                        const data = await response.json();

                        if (!Array.isArray(data)) {
                            return [];
                        }

                        return data.map(investigation => ({
    ...investigation,
    case_id: caseItem.case_id,
    case_title: caseItem.case_title,
    case_status: caseItem.status
}));

                    } catch (error) {

                        console.error(
                            `Error loading investigation for case ${caseItem.case_id}:`,
                            error
                        );

                        return [];
                    }

                })

            );


        /* Flatten investigation arrays */

        investigations =
            investigationResults.flat();


        renderInvestigations(investigations);

    } catch (error) {

        console.error(
            "Error loading investigations:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center; padding:30px;"
                >
                    Unable to load investigation records from the server.
                </td>
            </tr>
        `;

        investigationCount.textContent =
            "00 Investigations";
    }
}


/* RENDER INVESTIGATIONS */

function renderInvestigations(data) {

    tableBody.innerHTML = "";

    investigationCount.textContent =
        `${String(data.length).padStart(2, "0")} Investigations`;


    if (data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center; padding:30px;"
                >
                    No investigations found.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(investigation => {

        const row =
            document.createElement("tr");


        const status =
            investigation.case_status || "—";

        const statusClass =
            getStatusClass(status);


        const officerName =
            investigation.officer_name ||
            "—";

        const officerRank =
            investigation.officer_rank ||
            "";


        row.innerHTML = `

            <td>

                <a
                    href="case-details.html?case_id=${investigation.case_id}"
                    class="case-id-link"
                >
                    CASE-${String(
                        investigation.case_id
                    ).padStart(3, "0")}
                </a>

            </td>


            <td>

                ${officerName}

                ${
                    officerRank
                        ? `<br>
                           <span class="officer-rank">
                               ${officerRank}
                           </span>`
                        : ""
                }

            </td>


            <td>
                ${investigation.start_date || "—"}
            </td>


            <td>
                ${investigation.end_date || "—"}
            </td>


            <td>

                <span class="status ${statusClass}">
                    ${status}
                </span>

            </td>


            <td>
                ${investigation.findings || "—"}
            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* STATUS CLASS */

function getStatusClass(status) {

    if (!status) {
        return "";
    }

    const value =
        status.toLowerCase();


    if (
        value.includes("ongoing") ||
        value.includes("progress")
    ) {
        return "ongoing";
    }


    if (
        value.includes("complete") ||
        value.includes("closed")
    ) {
        return "closed";
    }


    return "";
}


/* FILTER INVESTIGATIONS */

function filterInvestigations() {

    const searchValue =
        searchInput.value
            .trim()
            .toLowerCase();


    const statusValue =
        statusFilter.value
            .trim()
            .toLowerCase();


    const filtered =
        investigations.filter(investigation => {

            const searchableText = `

                ${investigation.case_id}

                ${investigation.case_title}

                ${investigation.officer_name}

                ${investigation.officer_rank}

                ${investigation.start_date}

                ${investigation.end_date}

                ${investigation.status}

                ${investigation.findings}

                ${investigation.remarks}

            `.toLowerCase();


            const matchesSearch =
                searchableText.includes(searchValue);


            const matchesStatus =
    statusValue === "all" ||
    (investigation.case_status || "")
        .toLowerCase()
        .includes(statusValue);


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    renderInvestigations(filtered);
}


/* EVENTS */

searchInput.addEventListener(
    "input",
    filterInvestigations
);

statusFilter.addEventListener(
    "change",
    filterInvestigations
);


/* START */

loadInvestigations();