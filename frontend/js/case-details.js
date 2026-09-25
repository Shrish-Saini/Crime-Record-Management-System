

const params = new URLSearchParams(window.location.search);
const caseId = params.get("case_id");

/*basic helpers */

function byId(id) {
    return document.getElementById(id);
}

function valueOrDash(value) {
    return value !== null && value !== undefined && value !== ""
        ? value
        : "—";
}

function showEmpty(container, title, message) {
    if (!container) return;

    container.innerHTML = `
        <div class="empty-record">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
    `;
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchJSON(endpoint, fallback) {
    try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(
            `http://127.0.0.1:8000${endpoint}`,
            {
                method: "GET",
                headers: token
                    ? {
                        "Authorization": `Bearer ${token}`
                    }
                    : {}
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error(`Failed to load ${endpoint}:`, error);
        return fallback;
    }
}


/* validate case ID */

if (!caseId || !/^\d+$/.test(caseId)) {

    byId("caseId").textContent = "—";
    byId("caseTitle").textContent = "Invalid Case ID";
    byId("caseOutcome").textContent = "—";
    byId("statusText").textContent = "Unable to load case";

} else {

    loadCaseDetails(caseId);
}


/* load case details */

async function loadCaseDetails(caseId) {

    /*
     * Fetch all case-related information.
     * This is completely dynamic and works for
     * every case returned by the database.
     */

    const [
        caseList,
        fir,
        timelineData,
        accusedData,
        victimData,
        evidenceData,
        investigationData,
        arrestData,
        bailData,
        chargesData,
        chargesheetData,
        proceedingsData,
        judgmentData,
        sentenceData,
        imprisonmentData
    ] = await Promise.all([

        fetchJSON(`/cases/?skip=0&limit=100`, []),

        fetchJSON(`/cases/${caseId}/fir`, null),

        fetchJSON(`/cases/${caseId}/timeline`, []),

        fetchJSON(`/cases/${caseId}/criminals`, []),

        fetchJSON(`/cases/${caseId}/victims`, []),

        fetchJSON(`/cases/${caseId}/evidence`, []),

        fetchJSON(`/cases/${caseId}/investigations`, []),

        fetchJSON(`/cases/${caseId}/arrests`, []),

        fetchJSON(`/cases/${caseId}/bail`, []),

        fetchJSON(`/cases/${caseId}/charges`, []),

        fetchJSON(`/cases/${caseId}/chargesheet`, null),

        fetchJSON(`/cases/${caseId}/proceedings`, []),

        fetchJSON(`/cases/${caseId}/judgment`, null),

        fetchJSON(`/cases/${caseId}/sentences`, []),

        fetchJSON(`/cases/${caseId}/imprisonment`, [])
    ]);
    const caseData = Array.isArray(caseList)
    ? caseList.find(c => String(c.case_id) === String(caseId))
    : null;


    /* case information */

    if (!caseData) {

        byId("caseId").textContent = "—";
        byId("caseTitle").textContent = "Case Not Found";
        byId("caseOutcome").textContent = "—";
        byId("statusText").textContent =
            "No case record was found for this ID.";

        return;
    }

    byId("caseId").textContent =
        `CASE-${String(caseData.case_id).padStart(3, "0")}`;

    byId("caseTitle").textContent =
        valueOrDash(caseData.case_title);

    byId("caseOutcome").textContent =
        valueOrDash(caseData.outcome);

    byId("statusText").textContent =
        valueOrDash(caseData.status);


    const caseStatus = byId("caseStatus");

    caseStatus.textContent =
        valueOrDash(caseData.status);

    const status = (caseData.status || "").toLowerCase();

    if (status === "closed") {
        caseStatus.className = "status closed";
    } else if (
        status.includes("trial") ||
        status.includes("ongoing")
    ) {
        caseStatus.className = "status ongoing";
    } else if (
        status.includes("investigation")
    ) {
        caseStatus.className = "status investigation";
    } else {
        caseStatus.className = "status ongoing";
    }



    loadFIRData(fir);



    loadInvestigationData(
        investigationData,
        fir
    );
    const officerElement = byId("officer");

if (
    Array.isArray(investigationData) &&
    investigationData.length > 0
) {
    const investigation = investigationData[0];

    const officerName =
        investigation.officer_name || "Unknown Officer";

    const officerRank =
        investigation.officer_rank || "";

    const badge =
        investigation.officer_badge_number || "";

    officerElement.textContent =
        `${officerName}` +
        `${officerRank ? ` · ${officerRank}` : ""}` +
        `${badge ? ` · Badge ${badge}` : ""}`;

} else if (caseData.investigating_officer_id) {

    officerElement.textContent =
        `Officer #${caseData.investigating_officer_id}`;

} else {

    officerElement.textContent = "—";
}


    loadTimelineData(timelineData);


    loadAccusedData(accusedData);



    loadVictimsData(victimData);



    loadEvidenceData(evidenceData);



    loadArrestsData(arrestData);



    loadBailData(bailData);


    loadChargesData(chargesData);


    loadChargesheetData(chargesheetData);



    loadProceedingsData(proceedingsData);


    loadJudgmentData(judgmentData);



    loadSentencesData(sentenceData);



    loadImprisonmentData(imprisonmentData);
}


/* fir */

function loadFIRData(fir) {

    if (!fir) {

        byId("firNumber").textContent = "—";
        byId("firInfo").textContent = "No FIR recorded";
        byId("firStation").textContent = "—";
        byId("firCrime").textContent = "—";
        byId("crime").textContent = "—";
        byId("policeStation").textContent = "—";

        return;
    }

    byId("firNumber").textContent =
        valueOrDash(fir.fir_number);

    byId("firInfo").textContent =
        valueOrDash(fir.fir_number);

    byId("firStation").textContent =
        valueOrDash(fir.station_name);

    byId("firCrime").textContent =
        valueOrDash(fir.crime_name);

    byId("crime").textContent =
        valueOrDash(fir.crime_name);

    byId("policeStation").textContent =
        valueOrDash(fir.station_name);
}


/* INVESTIGATION */

function loadInvestigationData(
    investigations,
    fir
) {

    const officerElement =
        byId("investigationOfficer");

    const stationElement =
        byId("investigationStation");

    if (
        !Array.isArray(investigations) ||
        investigations.length === 0
    ) {

        officerElement.textContent =
            "No investigation records";

        stationElement.textContent =
            "No investigation information available.";

        return;
    }

    const investigation =
        [...investigations].sort(
            (a, b) =>
                new Date(b.start_date || 0) -
                new Date(a.start_date || 0)
        )[0];

    const officerName =
        investigation.officer_name ||
        "Unknown Officer";

    const officerRank =
        investigation.officer_rank || "";

    const badge =
        investigation.officer_badge_number || "";

    officerElement.innerHTML = `
        ${escapeHTML(officerName)}
        ${officerRank
            ? ` · ${escapeHTML(officerRank)}`
            : ""}
        ${badge
            ? ` · Badge ${escapeHTML(badge)}`
            : ""}
    `;

    stationElement.innerHTML = `
        <strong>
            ${escapeHTML(
                valueOrDash(investigation.status)
            )}
        </strong>

        <span>
            ${escapeHTML(
                investigation.findings ||
                "No findings recorded."
            )}
        </span>

        <span>
            ${escapeHTML(
                investigation.remarks ||
                "No remarks recorded."
            )}
        </span>

        <span>
            Start: ${escapeHTML(
                valueOrDash(investigation.start_date)
            )}

            · End: ${escapeHTML(
                investigation.end_date || "Ongoing"
            )}
        </span>

        <span>
            Station:
            ${escapeHTML(
                fir?.station_name || "—"
            )}
        </span>
    `;
}


/* TIMELINE */

function loadTimelineData(timelineData) {

    const timeline =
        byId("timeline");

    if (
        !Array.isArray(timelineData) ||
        timelineData.length === 0
    ) {

        showEmpty(
            timeline,
            "No Timeline Records",
            "No historical events are currently available for this case."
        );

        return;
    }

    timeline.innerHTML = "";

    [...timelineData]
        .sort(
            (a, b) =>
                new Date(a.event_datetime || 0) -
                new Date(b.event_datetime || 0)
        )
        .forEach(event => {

            const date =
                event.event_datetime
                    ? new Date(event.event_datetime)
                    : null;

            const formattedDate =
                date && !isNaN(date)
                    ? date.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    )
                    : "—";

            const formattedTime =
                date && !isNaN(date)
                    ? date.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )
                    : "—";

            timeline.innerHTML += `
                <div class="timeline-item">

                    <div class="timeline-marker"></div>

                    <div class="timeline-content">

                        <div class="timeline-title">
                            ${escapeHTML(
                                event.event_title ||
                                event.event_type ||
                                "Case Event"
                            )}
                        </div>

                        <p>
                            ${escapeHTML(
                                event.event_description ||
                                "No description available."
                            )}
                        </p>

                        <span class="timeline-meta">
                            ${formattedDate}
                            ·
                            ${formattedTime}

                            ${
                                event.performed_by_officer_name
                                    ? ` · ${escapeHTML(
                                        event.performed_by_officer_name
                                    )}`
                                    : ""
                            }
                        </span>

                    </div>

                </div>
            `;
        });
}


/* ACCUSED*/

function loadAccusedData(accusedData) {

    const accusedList =
        byId("accusedList");

    if (
        !Array.isArray(accusedData) ||
        accusedData.length === 0
    ) {

        showEmpty(
            accusedList,
            "No Accused Records",
            "No accused records are currently available for this case."
        );

        return;
    }

    accusedList.innerHTML = "";

    accusedData.forEach(accused => {

        const name =
            accused.full_name ||
            "Unknown Person";

        const initial =
            name.charAt(0).toUpperCase();

        const involvement =
            accused.involvement ||
            "Accused";

        const status =
            accused.criminal_status ||
            "—";

        const identification =
            accused.identification_details ||
            "No identification details available.";

        const item =
            document.createElement("div");

        item.className =
            "person-item";

        item.innerHTML = `
            <div class="person-initial">
                ${escapeHTML(initial)}
            </div>

            <div>

                <strong>
                    ${escapeHTML(name)}
                </strong>

                <span>
                    ${escapeHTML(involvement)}
                    ·
                    ${escapeHTML(status)}
                </span>

                <span>
                    ${escapeHTML(identification)}
                </span>

            </div>
        `;

        accusedList.appendChild(item);
    });
}


/* VICTIMS */

function loadVictimsData(victimData) {

    const victimList =
        byId("victimList");

    if (
        !Array.isArray(victimData) ||
        victimData.length === 0
    ) {

        showEmpty(
            victimList,
            "No Victim Records",
            "No victim records are currently available for this case."
        );

        return;
    }

    victimList.innerHTML = "";

    victimData.forEach(victim => {

        const name =
            victim.full_name ||
            "Unknown Person";

        const initial =
            name.charAt(0).toUpperCase();

        const item =
            document.createElement("div");

        item.className =
            "person-item";

        item.innerHTML = `
            <div class="person-initial">
                ${escapeHTML(initial)}
            </div>

            <div>

                <strong>
                    ${escapeHTML(name)}
                </strong>

                <span>
                    Victim ·
                    ${escapeHTML(
                        victim.status || "—"
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        victim.injury_details ||
                        "No injury details recorded."
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        victim.statement ||
                        "No statement recorded."
                    )}
                </span>

            </div>
        `;

        victimList.appendChild(item);
    });
}


/* EVIDENCE */

function loadEvidenceData(evidenceData) {

    const evidenceList =
        byId("evidenceList");

    if (
        !Array.isArray(evidenceData) ||
        evidenceData.length === 0
    ) {

        showEmpty(
            evidenceList,
            "No Evidence Records",
            "No evidence records are currently available for this case."
        );

        return;
    }

    evidenceList.innerHTML = "";

    evidenceData.forEach(evidence => {

        const item =
            document.createElement("div");

        item.className =
            "record-item";

        item.innerHTML = `
            <strong>
                ${escapeHTML(
                    evidence.evidence_type ||
                    "Unknown Evidence"
                )}
            </strong>

            <span>
                ${escapeHTML(
                    evidence.description ||
                    "No description available."
                )}
            </span>

            <span>
                Collected:
                ${escapeHTML(
                    valueOrDash(
                        evidence.collection_date
                    )
                )}
            </span>

            <span>
                Location:
                ${escapeHTML(
                    valueOrDash(
                        evidence.location_found
                    )
                )}
            </span>

            <span>
                Status:
                ${escapeHTML(
                    valueOrDash(evidence.status)
                )}
            </span>

            <span>
                Collected by:
                ${escapeHTML(
                    evidence.collected_by_name ||
                    "Unknown Officer"
                )}

                ${
                    evidence.collected_by_rank
                        ? ` · ${escapeHTML(
                            evidence.collected_by_rank
                        )}`
                        : ""
                }

                ${
                    evidence.collected_by_badge_number
                        ? ` · Badge ${escapeHTML(
                            evidence.collected_by_badge_number
                        )}`
                        : ""
                }
            </span>
        `;

        evidenceList.appendChild(item);
    });
}


/* ARRESTS */

function loadArrestsData(arrestData) {

    const arrestList =
        byId("arrestList");

    if (
        !Array.isArray(arrestData) ||
        arrestData.length === 0
    ) {

        showEmpty(
            arrestList,
            "No Arrest Records",
            "No arrest records are currently available for this case."
        );

        return;
    }

    arrestList.innerHTML = "";

    arrestData.forEach(arrest => {

        const item =
            document.createElement("div");

        item.className =
            "arrest-record";

        item.innerHTML = `
            <strong>
                ${escapeHTML(
                    arrest.criminal_name ||
                    "Unknown Accused"
                )}
            </strong>

            <span>
                Arrested:
                ${escapeHTML(
                    valueOrDash(arrest.arrest_date)
                )}
            </span>

            <span>
                Location:
                ${escapeHTML(
                    valueOrDash(arrest.arrest_location)
                )}
            </span>

            <span>
                Reason:
                ${escapeHTML(
                    arrest.reason ||
                    "No reason recorded."
                )}
            </span>

            <span>
                Court Production:
                ${escapeHTML(
                    valueOrDash(
                        arrest.court_production_date
                    )
                )}
            </span>

            <span>
                Arresting Officer:
                ${escapeHTML(
                    arrest.arresting_officer_name ||
                    "Unknown Officer"
                )}

                ${
                    arrest.arresting_officer_rank
                        ? ` · ${escapeHTML(
                            arrest.arresting_officer_rank
                        )}`
                        : ""
                }
            </span>

            <span class="bail-status">
                ${escapeHTML(
                    valueOrDash(arrest.custody_status)
                )}
            </span>
        `;

        arrestList.appendChild(item);
    });
}


/* BAIL */

function loadBailData(bailData) {

    const bailList =
        byId("bailList");

    if (
        !Array.isArray(bailData) ||
        bailData.length === 0
    ) {

        showEmpty(
            bailList,
            "No Bail Records",
            "No bail applications are currently available for this case."
        );

        return;
    }

    bailList.innerHTML = "";

    bailData.forEach(bail => {

        const decision =
            bail.decision ||
            "Decision Pending";

        const decisionLower =
            decision.toLowerCase();

        const decisionClass =
            decisionLower === "granted"
                ? "bail-granted"
                : decisionLower === "rejected"
                    ? "bail-rejected"
                    : "bail-pending";

        const item =
            document.createElement("div");

        item.className =
            "bail-record";

        item.innerHTML = `
            <strong>
                ${escapeHTML(
                    bail.criminal_name ||
                    "Unknown Accused"
                )}
            </strong>

            <span>
                Application Date:
                ${escapeHTML(
                    valueOrDash(
                        bail.application_date
                    )
                )}
            </span>

            <span>
                Bail Type:
                ${escapeHTML(
                    valueOrDash(
                        bail.bail_type
                    )
                )}
            </span>

            <span>
                Decision Date:
                ${escapeHTML(
                    valueOrDash(
                        bail.decision_date
                    )
                )}
            </span>

            <span>
                Court:
                ${escapeHTML(
                    valueOrDash(
                        bail.court_name
                    )
                )}
            </span>

            <span>
                Conditions:
                ${escapeHTML(
                    bail.conditions ||
                    "No conditions recorded."
                )}
            </span>

            <span class="bail-status ${decisionClass}">
                ${escapeHTML(decision)}
            </span>
        `;

        bailList.appendChild(item);
    });
}


/*BNS CHARGES */

function loadChargesData(charges) {

    const chargesList =
        byId("chargesList");

    if (
        !Array.isArray(charges) ||
        charges.length === 0
    ) {

        showEmpty(
            chargesList,
            "No Charge Records",
            "No BNS charge records are currently available for this case."
        );

        return;
    }

    chargesList.innerHTML = "";

    charges.forEach(charge => {

        const item =
            document.createElement("div");

        item.className =
            "charge-record";

        item.innerHTML = `
            <div class="charge-main">

                <div>
                    <span class="detail-label">
                        Accused
                    </span>

                    <strong>
                        ${escapeHTML(
                            charge.criminal_name ||
                            "Unknown"
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        BNS Section
                    </span>

                    <strong>
                        ${escapeHTML(
                            charge.section_number ||
                            "—"
                        )}

                        ${
                            charge.section_title
                                ? ` · ${escapeHTML(
                                    charge.section_title
                                )}`
                                : ""
                        }
                    </strong>
                </div>

            </div>

            <div class="charge-meta">

                <div>
                    <span class="detail-label">
                        Charge Date
                    </span>

                    <span>
                        ${escapeHTML(
                            valueOrDash(
                                charge.charge_date
                            )
                        )}
                    </span>
                </div>

                <div>
                    <span class="detail-label">
                        Chapter
                    </span>

                    <span>
                        ${escapeHTML(
                            valueOrDash(
                                charge.chapter_name
                            )
                        )}
                    </span>
                </div>

                <div>
                    <span class="detail-label">
                        Status
                    </span>

                    <span class="charge-status">
                        ${escapeHTML(
                            valueOrDash(
                                charge.charge_status
                            )
                        )}
                    </span>
                </div>

            </div>

            <div class="charge-description">

                <span class="detail-label">
                    Description
                </span>

                <p>
                    ${escapeHTML(
                        charge.section_description ||
                        charge.remarks ||
                        "No additional remarks recorded."
                    )}
                </p>

            </div>
        `;

        chargesList.appendChild(item);
    });
}


/* CHARGESHEET*/

function loadChargesheetData(data) {

    const container =
        byId("chargesheet");

    if (!data) {

        showEmpty(
            container,
            "No Chargesheet Recorded",
            "No chargesheet record is currently available for this case."
        );

        return;
    }

    container.innerHTML = `
        <div class="chargesheet-record">

            <div>
                <span class="detail-label">
                    Report Type
                </span>

                <strong>
                    ${escapeHTML(
                        valueOrDash(
                            data.report_type
                        )
                    )}
                </strong>
            </div>

            <div>
                <span class="detail-label">
                    Submission Date
                </span>

                <span>
                    ${escapeHTML(
                        valueOrDash(
                            data.submission_date
                        )
                    )}
                </span>
            </div>

            <div>
                <span class="detail-label">
                    Submitted By
                </span>

                <span>
                    ${escapeHTML(
                        data.submitted_by_name ||
                        "—"
                    )}

                    ${
                        data.submitted_by_rank
                            ? ` · ${escapeHTML(
                                data.submitted_by_rank
                            )}`
                            : ""
                    }

                    ${
                        data.submitted_by_badge_number
                            ? ` · Badge ${escapeHTML(
                                data.submitted_by_badge_number
                            )}`
                            : ""
                    }
                </span>
            </div>

            <div>
                <span class="detail-label">
                    Status
                </span>

                <span>
                    ${escapeHTML(
                        valueOrDash(data.status)
                    )}
                </span>
            </div>

            <div>
                <span class="detail-label">
                    Summary
                </span>

                <span>
                    ${escapeHTML(
                        data.summary || "—"
                    )}
                </span>
            </div>

        </div>
    `;
}


/* COURT PROCEEDINGS */

function loadProceedingsData(proceedingsData) {

    const container =
        byId("proceedings");

    if (
        !Array.isArray(proceedingsData) ||
        proceedingsData.length === 0
    ) {

        showEmpty(
            container,
            "No Court Proceedings Recorded",
            "No court proceeding records are currently available for this case."
        );

        return;
    }

    container.innerHTML = "";

    [...proceedingsData]
        .sort(
            (a, b) =>
                new Date(a.proceeding_date || 0) -
                new Date(b.proceeding_date || 0)
        )
        .forEach(proceeding => {

            const item =
                document.createElement("div");

            item.className =
                "proceeding-record";

            item.innerHTML = `
                <div class="proceeding-date">
                    ${escapeHTML(
                        valueOrDash(
                            proceeding.proceeding_date
                        )
                    )}
                </div>

                <div class="proceeding-info">

                    <strong>
                        ${escapeHTML(
                            proceeding.proceeding_type ||
                            "Court Proceeding"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            proceeding.proceedings ||
                            "—"
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            proceeding.judge_name ||
                            "—"
                        )}

                        ${
                            proceeding.court_name
                                ? ` · ${escapeHTML(
                                    proceeding.court_name
                                )}`
                                : ""
                        }
                    </span>

                    ${
                        proceeding.next_hearing_date
                            ? `
                                <span>
                                    Next Hearing:
                                    ${escapeHTML(
                                        proceeding.next_hearing_date
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>

                <span class="proceeding-status">
                    ${escapeHTML(
                        valueOrDash(
                            proceeding.status
                        )
                    )}
                </span>
            `;

            container.appendChild(item);
        });
}


/* JUDGMENT */

function loadJudgmentData(data) {

    const container =
        byId("judgment");

    const statusElement =
        byId("judgmentStatus");

    if (!data) {

        statusElement.className =
            "status ongoing";

        statusElement.textContent =
            "Not Recorded";

        showEmpty(
            container,
            "No Judgment Recorded",
            "This case has no final judgment recorded."
        );

        return;
    }

    statusElement.className =
        "status closed";

    statusElement.textContent =
        "Recorded";

    container.innerHTML = `
        <div class="judgment-box">

            <div>
                <span class="detail-label">
                    Outcome
                </span>

                <strong>
                    ${escapeHTML(
                        valueOrDash(data.result)
                    )}
                </strong>
            </div>

            <div class="judgment-details">

                <div>
                    <span class="detail-label">
                        Judgment Date
                    </span>

                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                data.judgment_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Court
                    </span>

                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                data.court_name
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Court Type
                    </span>

                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                data.court_type
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Location
                    </span>

                    <strong>
                        ${escapeHTML(
                            data.court_city || "—"
                        )}

                        ${
                            data.court_state
                                ? `, ${escapeHTML(
                                    data.court_state
                                )}`
                                : ""
                        }
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Summary
                    </span>

                    <strong>
                        ${escapeHTML(
                            data.summary || "—"
                        )}
                    </strong>
                </div>

            </div>

        </div>
    `;
}


/*SENTENCES */

function loadSentencesData(data) {

    const container =
        byId("sentence");

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        showEmpty(
            container,
            "No Sentence Recorded",
            "No sentencing record is currently available for this case."
        );

        return;
    }

    container.innerHTML = "";

    data.forEach(item => {

        const record =
            document.createElement("div");

        record.className =
            "sentence-record";

        const duration =
            item.duration_months != null
                ? `${item.duration_months} months`
                : "—";

        const fine =
            item.fine_amount != null
                ? `₹${Number(
                    item.fine_amount
                ).toLocaleString("en-IN")}`
                : "—";

        record.innerHTML = `
            <strong>
                ${escapeHTML(
                    item.criminal_name || "—"
                )}
            </strong>

            <span>
                ${escapeHTML(
                    item.sentence_type || "—"
                )}
            </span>

            <div class="sentence-details">

                <div>
                    <span class="detail-label">
                        Judgment Date
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.judgment_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Result
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.judgment_result
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Duration
                    </span>
                    <strong>
                        ${escapeHTML(duration)}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Fine
                    </span>
                    <strong>
                        ${escapeHTML(fine)}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Start Date
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.start_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        End Date
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.end_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Details
                    </span>
                    <strong>
                        ${escapeHTML(
                            item.details || "—"
                        )}
                    </strong>
                </div>

            </div>
        `;

        container.appendChild(record);
    });
}


/*IMPRISONMENT */

function loadImprisonmentData(data) {

    const container =
        byId("imprisonment");

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        showEmpty(
            container,
            "No Imprisonment Recorded",
            "No imprisonment record is currently available for this case."
        );

        return;
    }

    container.innerHTML = "";

    data.forEach(item => {

        const record =
            document.createElement("div");

        record.className =
            "imprisonment-record";

        const duration =
            item.duration_months != null
                ? `${item.duration_months} months`
                : "—";

        const fine =
            item.fine_amount != null
                ? `₹${Number(
                    item.fine_amount
                ).toLocaleString("en-IN")}`
                : "—";

        record.innerHTML = `
            <strong>
                ${escapeHTML(
                    item.criminal_name || "—"
                )}
            </strong>

            <span>
                ${escapeHTML(
                    item.status || "—"
                )}
            </span>

            <div class="imprisonment-details">

                <div>
                    <span class="detail-label">
                        Prison
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.prison_name
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Sentence
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.sentence_type
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Admission Date
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.admission_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Expected Release
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.expected_release_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Actual Release
                    </span>
                    <strong>
                        ${escapeHTML(
                            valueOrDash(
                                item.actual_release_date
                            )
                        )}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Duration
                    </span>
                    <strong>
                        ${escapeHTML(duration)}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Fine
                    </span>
                    <strong>
                        ${escapeHTML(fine)}
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Prison Location
                    </span>
                    <strong>
                        ${escapeHTML(
                            item.prison_city || "—"
                        )}

                        ${
                            item.prison_state
                                ? `, ${escapeHTML(
                                    item.prison_state
                                )}`
                                : ""
                        }
                    </strong>
                </div>

                <div>
                    <span class="detail-label">
                        Remarks
                    </span>
                    <strong>
                        ${escapeHTML(
                            item.remarks || "—"
                        )}
                    </strong>
                </div>

            </div>
        `;

        container.appendChild(record);
    });
}