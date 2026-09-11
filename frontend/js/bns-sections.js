/* =========================================================
   BNS SECTIONS
   ========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";

let bnsSections = [];

const searchInput =
    document.getElementById("bnsSearch");

const tableBody =
    document.getElementById("bnsTableBody");

const bnsCount =
    document.getElementById("bnsCount");


/* =========================================================
   LOAD BNS SECTIONS
   ========================================================= */

async function loadBnsSections() {
    try {

        let allSections = [];
        let skip = 0;
        const limit = 100;

        while (true) {

            const response =
                await fetch(
                    `${API_BASE_URL}/bns-sections/?skip=${skip}&limit=${limit}`
                );

            if (!response.ok) {

                throw new Error(
                    `BNS request failed: ${response.status}`
                );

            }

            const data =
                await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                break;
            }

            allSections.push(...data);

            if (data.length < limit) {
                break;
            }

            skip += limit;
        }


        bnsSections = allSections;

        renderBnsSections(bnsSections);

    } catch (error) {

        console.error(
            "Error loading BNS sections:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="text-align:center; padding:30px;">
                    Unable to load BNS section records.
                </td>
            </tr>
        `;

        bnsCount.textContent =
            "0 Sections";
    }

}


/* =========================================================
   RENDER BNS SECTIONS
   ========================================================= */

function renderBnsSections(records) {

    tableBody.innerHTML = "";

    bnsCount.textContent =
        `${records.length} Sections`;


    if (records.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="text-align:center; padding:30px;">
                    No BNS sections found.
                </td>
            </tr>
        `;

        return;
    }


    records.forEach(section => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHTML(
                        section.section_number
                    )}
                </strong>
            </td>

            <td>
                ${escapeHTML(
                    section.section_title
                )}
            </td>

            <td>
                Chapter ${escapeHTML(
                    section.chapter
                )}

                <br>

                <span class="bns-muted">
                    ${escapeHTML(
                        section.chapter_name
                    )}
                </span>
            </td>

            <td>
                ${escapeHTML(
                    section.chapter_subtype
                )}
            </td>

            <td class="bns-description">
                ${escapeHTML(
                    section.description
                )}
            </td>

        `;


        tableBody.appendChild(row);

    });
}


/* =========================================================
   SEARCH BNS SECTIONS
   ========================================================= */

function searchBnsSections() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    if (!query) {

        renderBnsSections(
            bnsSections
        );

        return;
    }


    const filtered =
        bnsSections.filter(
            section => {

                return (

                    String(
                        section.section_number || ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    String(
                        section.section_title || ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    String(
                        section.chapter || ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    String(
                        section.chapter_name || ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    String(
                        section.chapter_subtype || ""
                    )
                    .toLowerCase()
                    .includes(query)

                    ||

                    String(
                        section.description || ""
                    )
                    .toLowerCase()
                    .includes(query)

                );

            }
        );


    renderBnsSections(filtered);
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
    searchBnsSections
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadBnsSections();