

const searchInput =
    document.getElementById("courtSearch");

const tableBody =
    document.getElementById("courtTableBody");

const courtCount =
    document.getElementById("courtCount");

let courts = [];


/* LOAD COURTS */

async function loadCourts() {

    try {

        const response = await authFetch(
            `${API_BASE_URL}/courts/?skip=0&limit=100`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid court data received.");
        }

        courts = data;

        renderCourts(courts);

    } catch (error) {

        console.error(
            "Error loading courts:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center; padding:30px;"
                >
                    Unable to load court records from the server.
                </td>
            </tr>
        `;

        courtCount.textContent =
            "00 Courts";
    }
}


/* RENDER COURTS */

function renderCourts(data) {

    tableBody.innerHTML = "";

    courtCount.textContent =
        `${String(data.length).padStart(2, "0")} Courts`;


    if (data.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center; padding:30px;"
                >
                    No courts found.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(court => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                CRT-${String(
                    court.court_id
                ).padStart(3, "0")}
            </td>


            <td>
                <strong class="court-name">
                    ${court.court_name || "—"}
                </strong>
            </td>


            <td>
                ${court.court_type || "—"}
            </td>


            <td>
                ${court.address || "—"}
            </td>


            <td>
                ${court.city || "—"}
            </td>


            <td>
                ${court.state || "—"}
            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* SEARCH COURTS */

function filterCourts() {

    const searchValue =
        searchInput.value
            .trim()
            .toLowerCase();


    const filtered =
        courts.filter(court => {

            const searchableText = `

                ${court.court_id}

                ${court.court_name}

                ${court.court_type}

                ${court.address}

                ${court.city}

                ${court.state}

            `.toLowerCase();


            return searchableText.includes(
                searchValue
            );

        });


    renderCourts(filtered);
}


/* SEARCH EVENT */

searchInput.addEventListener(
    "input",
    filterCourts
);


/* START */

loadCourts();