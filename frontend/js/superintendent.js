
const superintendentUser = requireRole(["superintendent"]);

if (!superintendentUser) {
    throw new Error("Unauthorized: Superintendent access required.");
}

let casesData = [];
let officersData = [];
let stationsData = [];

const $ = id => document.getElementById(id);

function notice(message, success = false) {
    const el = $("notice");
    el.textContent = message;
    el.className = success ? "super-notice success" : "super-notice";
    el.hidden = false;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function asArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.records)) return data.records;
    return [];
}

async function api(path, options = {}) {
    const response = await authFetch(`${API_BASE_URL}${path}`, options);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            typeof data?.detail === "string"
                ? data.detail
                : `HTTP ${response.status} for ${path}`
        );
    }

    return data;
}

function officerLabel(officer) {
    return `${officer.name || `Officer ${officer.officer_id}`}` +
        `${officer.rank ? " · " + officer.rank : ""}` +
        `${officer.badge_number ? " · " + officer.badge_number : ""}`;
}

// -------------------- CASE MANAGEMENT --------------------

async function loadCases() {
    try {
        casesData = asArray(
            await api("/cases/?skip=0&limit=500")
        );

        $("caseCount").textContent = casesData.length;

        $("pendingCount").textContent = casesData.filter(c =>
            /pending|ongoing|open/i.test(c.status || "")
        ).length;

        renderCases();

    } catch (error) {
        $("casesBody").innerHTML =
            `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;

        notice("Cases could not be loaded: " + error.message);
    }
}

function renderCases() {
    const search = $("caseSearch").value.toLowerCase().trim();
    const status = $("statusFilter").value.toLowerCase();

    const filtered = casesData.filter(c => {
        const title = String(c.case_title || "").toLowerCase();
        const id = String(c.case_id);
        const caseStatus = String(c.status || "").toLowerCase();

        return (!search || title.includes(search) || id.includes(search)) &&
            (!status || caseStatus.includes(status));
    });

    $("casesBody").innerHTML = filtered.length
        ? filtered.map(c => `
            <tr>
                <td>
                    ${escapeHtml(c.case_title || "Untitled case")}
                    <br><small>Case ID: ${escapeHtml(c.case_id)}</small>
                </td>
                <td>${escapeHtml(c.status || "Unknown")}</td>
                <td>${escapeHtml(c.start_date || "—")}</td>
                <td>${escapeHtml(c.outcome || "Pending")}</td>
                <td>${escapeHtml(
                    c.investigating_officer_name ||
                    c.officer_name ||
                    "Not returned"
                )}</td>
                <td>
                    <button type="button"
                        onclick="assignCase(${Number(c.case_id)})">
                        Assign / Reassign
                    </button>
                    <button type="button" class="remove-assignment"
                        onclick="removeAssignment(${Number(c.case_id)})">
                        Remove
                    </button>
                    
                    <button type="button" class="view-btn"
                        onclick="viewCase(${Number(c.case_id)})">
                        View
                    </button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="6">No cases match.</td></tr>';
}

async function assignCase(caseId) {
    const activeOfficers = officersData.filter(o =>
        String(o.status || "active").toLowerCase() === "active"
    );

    if (!activeOfficers.length) {
        notice("No active officers were returned by the API.");
        return;
    }

    const options = activeOfficers.map(o =>
        `${o.officer_id}: ${officerLabel(o)}`
    ).join("\n");

    const input = prompt(
        `Enter officer ID to assign to case ${caseId}:\n\n${options}`
    );

    if (input === null) return;

    const officerId = Number(input);

    if (
        !Number.isInteger(officerId) ||
        !activeOfficers.some(o => Number(o.officer_id) === officerId)
    ) {
        notice("Enter a valid active officer ID.");
        return;
    }

    try {
        await api(
            `/cases/${caseId}/assign?officer_id=${encodeURIComponent(officerId)}`,
            { method: "PUT" }
        );

        notice("Case assignment updated.", true);
        await loadCases();

    } catch (error) {
        notice("Assignment failed: " + error.message);
    }
}

async function removeAssignment(caseId) {
    if (!confirm(`Remove the investigating officer from case ${caseId}?`)) {
        return;
    }

    try {
        await api(`/cases/${caseId}/assign`, { method: "DELETE" });
        notice("Case assignment removed.", true);
        await loadCases();

    } catch (error) {
        notice("Could not remove assignment: " + error.message);
    }
}

function viewCase(caseId) {
    window.location.href =
        `case-details.html?case_id=${encodeURIComponent(caseId)}`;
}

// -------------------- OFFICER DIRECTORY --------------------

async function loadOfficers() {
    try {
        officersData = asArray(
            await api("/police-officers/?skip=0&limit=500")
        );

        $("officerCount").textContent = officersData.length;

        $("officersBody").innerHTML = officersData.length
            ? officersData.map(o => `
                <tr>
                    <td>
                        ${escapeHtml(o.name || "—")}
                        <br><small>ID: ${escapeHtml(o.officer_id)}</small>
                    </td>
                    <td>${escapeHtml(o.rank || "—")}</td>
                    <td>${escapeHtml(o.badge_number || "—")}</td>
                    <td>${escapeHtml(o.station_name || o.station_id || "—")}</td>
                    <td>${escapeHtml(o.status || "Unknown")}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="5">No officers returned.</td></tr>';

        $("transferOfficer").innerHTML =
            '<option value="">Select officer</option>' +
            officersData.map(o => `
                <option value="${escapeHtml(o.officer_id)}">
                    ${escapeHtml(officerLabel(o))}
                </option>
            `).join("");

        filterOfficers();

    } catch (error) {
        $("officerCount").textContent = "—";
        $("officersBody").innerHTML =
            `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;

        notice("Officer directory could not be loaded: " + error.message);
    }
}

function filterOfficers() {
    const query = $("officerSearch").value.toLowerCase().trim();

    document.querySelectorAll("#officersBody tr").forEach(row => {
        row.hidden = Boolean(
            query && !row.textContent.toLowerCase().includes(query)
        );
    });
}

// -------------------- STATIONS AND TRANSFER HISTORY --------------------

async function loadStations() {
    try {
        stationsData = asArray(
            await api("/police-stations/?skip=0&limit=500")
        );

        $("stationCount").textContent = stationsData.length;

        $("transferStation").innerHTML =
            '<option value="">Select destination station</option>' +
            stationsData.map(s => `
                <option value="${escapeHtml(s.station_id)}">
                    ${escapeHtml(s.station_name || s.name || s.station_id)}
                </option>
            `).join("");

    } catch (error) {
        $("stationCount").textContent = "—";
        $("transferStation").innerHTML =
            '<option value="">Station API unavailable</option>';
    }
}

async function loadTransfers() {
    try {
        const transfers = asArray(
            await api("/officer-transfers/?skip=0&limit=500")
        );

        $("transfersBody").innerHTML = transfers.length
            ? transfers.map(t => `
                <tr>
                    <td>${escapeHtml(t.officer_name || t.officer_id || "—")}</td>
                    <td>${escapeHtml(t.from_station_name || t.from_station_id || "—")}</td>
                    <td>${escapeHtml(t.to_station_name || t.to_station_id || "—")}</td>
                    <td>${escapeHtml(t.transfer_date || "—")}</td>
                    <td>${escapeHtml(t.remarks || "—")}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="5">No transfer records found.</td></tr>';

    } catch (error) {
        $("transfersBody").innerHTML = `
            <tr>
                <td colspan="5">
                    Transfer history API is not available yet.
                    Backend endpoint GET /officer-transfers/ is required.
                </td>
            </tr>
        `;
    }
}

async function recordTransfer() {
    const officerId = $("transferOfficer").value;
    const stationId = $("transferStation").value;
    const transferDate = $("transferDate").value;
    const remarks = $("transferRemarks").value.trim();

    if (!officerId || !stationId || !transferDate) {
        notice("Select an officer, destination station and transfer date.");
        return;
    }

    const officer = officersData.find(
        o => Number(o.officer_id) === Number(officerId)
    );

    if (officer && Number(officer.station_id) === Number(stationId)) {
        notice("Officer is already at that station.");
        return;
    }

    if (!confirm("Record this transfer and update the officer's current station?")) {
        return;
    }

    try {
        await api("/officer-transfers/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                officer_id: Number(officerId),
                to_station_id: Number(stationId),
                transfer_date: transferDate,
                remarks
            })
        });

        notice("Transfer recorded.", true);
        $("transferRemarks").value = "";

        await Promise.all([loadOfficers(), loadTransfers()]);

    } catch (error) {
        notice(
            "Transfer could not be saved: " + error.message +
            ". Backend must expose POST /officer-transfers/ and update the current station."
        );
    }
}

// -------------------- LOGOUT AND INITIALIZATION --------------------

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    $("caseSearch").addEventListener("input", renderCases);
    $("statusFilter").addEventListener("change", renderCases);
    $("officerSearch").addEventListener("input", filterOfficers);

    $("refreshBtn").addEventListener("click", async () => {
        await Promise.all([
            loadCases(),
            loadOfficers(),
            loadStations(),
            loadTransfers()
        ]);
    });

    $("recordTransferBtn").addEventListener("click", recordTransfer);

    await Promise.all([
        loadCases(),
        loadOfficers(),
        loadStations(),
        loadTransfers()
    ]);
});
