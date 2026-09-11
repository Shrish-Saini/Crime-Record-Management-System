const API_BASE_URL = "http://127.0.0.1:8000";

const searchInput =
    document.getElementById("evidenceSearch");

const statusFilter =
    document.getElementById("evidenceStatusFilter");

const tableBody =
    document.getElementById("evidenceTableBody");

const evidenceCount =
    document.getElementById("evidenceCount");

let evidenceRecords = [];


/* LOAD EVIDENCE */

async function loadEvidence() {

    try {

        /* Get all cases */

        const casesResponse = await fetch(
            `${API_BASE_URL}/cases/`
        );

        if (!casesResponse.ok) {
            throw new Error(
                `HTTP error: ${casesResponse.status}`
            );
        }

        const cases = await casesResponse.json();


        /* Get evidence for every case */

        const evidenceResults =
            await Promise.all(

                cases.map(async caseItem => {

                    try {

                        const response = await fetch(
                            `${API_BASE_URL}/cases/${caseItem.case_id}/evidence`
                        );

                        if (!response.ok) {
                            return [];
                        }

                        const data = await response.json();

                        if (!Array.isArray(data)) {
                            return [];
                        }

                        return data.map(evidence => ({
                            ...evidence,
                            case_id: caseItem.case_id,
                            case_title: caseItem.case_title
                        }));

                    } catch (error) {

                        console.error(
                            `Error loading evidence for case ${caseItem.case_id}:`,
                            error
                        );

                        return [];
                    }

                })

            );


        /* Combine all evidence records */

        evidenceRecords =
            evidenceResults.flat();


        renderEvidence(evidenceRecords);

    } catch (error) {

        console.error(
            "Error loading evidence:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="text-align:center; padding:30px;"
                >
                    Unable to load evidence records from the server.
                </td>
            </tr>
        `;

        evidenceCount.textContent =
            "00 Evidence Records";
    }
}


/* RENDER EVIDENCE */

function renderEvidence(data) {

    tableBody.innerHTML = "";

    evidenceCount.textContent =
        `${String(data.length).padStart(2, "0")} Evidence Records`;


    if (data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="text-align:center; padding:30px;"
                >
                    No evidence records found.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(evidence => {

        const row =
            document.createElement("tr");


        const status =
            evidence.status || "—";

        const statusClass =
            getStatusClass(status);


        const collectedBy =
            evidence.collected_by_name || "—";

        const collectedByRank =
            evidence.collected_by_rank || "";


        row.innerHTML = `

            <td>
                EVD-${String(
                    evidence.evidence_id
                ).padStart(3, "0")}
            </td>


            <td>

                <a
                    href="case-details.html?case_id=${evidence.case_id}"
                    class="case-id-link"
                >
                    CASE-${String(
                        evidence.case_id
                    ).padStart(3, "0")}
                </a>

            </td>


            <td>
                ${evidence.evidence_type || "—"}
            </td>


            <td class="evidence-description">
                ${evidence.description || "—"}
            </td>


            <td class="evidence-date">
                ${evidence.collection_date || "—"}
            </td>


            <td>
                ${evidence.location_found || "—"}
            </td>


            <td>

                <span class="status ${statusClass}">
                    ${status}
                </span>

            </td>


            <td>

                ${collectedBy}

                ${
                    collectedByRank
                        ? `<br>
                           <span class="officer-rank">
                               ${collectedByRank}
                           </span>`
                        : ""
                }

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
        value.includes("collect")
    ) {
        return "ongoing";
    }


    if (
        value.includes("examin")
    ) {
        return "closed";
    }


    if (
        value.includes("store")
    ) {
        return "investigation";
    }


    return "";
}


/* FILTER EVIDENCE */

function filterEvidence() {

    const searchValue =
        searchInput.value
            .trim()
            .toLowerCase();


    const statusValue =
        statusFilter.value
            .trim()
            .toLowerCase();


    const filtered =
        evidenceRecords.filter(evidence => {

            const searchableText = `

                ${evidence.evidence_id}

                ${evidence.case_id}

                ${evidence.case_title}

                ${evidence.evidence_type}

                ${evidence.description}

                ${evidence.collection_date}

                ${evidence.location_found}

                ${evidence.status}

                ${evidence.collected_by_name}

                ${evidence.collected_by_rank}

                ${evidence.collected_by_badge_number}

            `.toLowerCase();


            const matchesSearch =
                searchableText.includes(searchValue);


            const matchesStatus =
                statusValue === "all" ||
                (evidence.status || "")
                    .toLowerCase()
                    .includes(statusValue);


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    renderEvidence(filtered);
}


/* EVENTS */

searchInput.addEventListener(
    "input",
    filterEvidence
);

statusFilter.addEventListener(
    "change",
    filterEvidence
);


/* START */

loadEvidence();