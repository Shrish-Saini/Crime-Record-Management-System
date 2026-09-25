


/* LOAD REPORT DATA */

async function loadReports() {

    try {

        /* Load all available records */

        const [
            casesResponse,
            investigationsResponse,
            evidenceResponse,
            arrestsResponse,
            bailResponse,
            chargesResponse,
            judgmentsResponse
        ] = await Promise.all([

            authFetch(`${API_BASE_URL}/cases/`),

            authFetch(`${API_BASE_URL}/investigations/`),

            authFetch(`${API_BASE_URL}/evidence/`),

            authFetch(`${API_BASE_URL}/arrests/`),

            authFetch(`${API_BASE_URL}/bail-applications/`),

            authFetch(`${API_BASE_URL}/case-charges/`),

            authFetch(`${API_BASE_URL}/judgments/`)

        ]);


        /* Check responses */

        const responses = [
            casesResponse,
            investigationsResponse,
            evidenceResponse,
            arrestsResponse,
            bailResponse,
            chargesResponse,
            judgmentsResponse
        ];

        responses.forEach(response => {

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

        });


        /* Convert responses to JSON */

        const [
            cases,
            investigations,
            evidence,
            arrests,
            bailApplications,
            charges,
            judgments
        ] = await Promise.all([

            casesResponse.json(),
            investigationsResponse.json(),
            evidenceResponse.json(),
            arrestsResponse.json(),
            bailResponse.json(),
            chargesResponse.json(),
            judgmentsResponse.json()

        ]);


        /* CASE COUNTS */

        const totalCases =
            Array.isArray(cases) ? cases.length : 0;


        const closedCases =
            cases.filter(caseItem =>
                (caseItem.status || "")
                    .toLowerCase() === "closed"
            ).length;


        const trialCases =
            cases.filter(caseItem =>
                (caseItem.status || "")
                    .toLowerCase()
                    .includes("trial")
            ).length;


        const investigationCases =
            cases.filter(caseItem =>
                (caseItem.status || "")
                    .toLowerCase()
                    .includes("investigation")
            ).length;


        const ongoingCases =
            totalCases - closedCases;


        /* OUTCOME COUNTS */

        const convictedCases =
            cases.filter(caseItem =>
                (caseItem.outcome || "")
                    .toLowerCase()
                    .includes("convicted")
            ).length;


        const acquittedCases =
            cases.filter(caseItem =>
                (caseItem.outcome || "")
                    .toLowerCase()
                    .includes("acquitted")
            ).length;


        /* UPDATE MAIN REPORT CARDS */

        document.getElementById("reportTotalCases").textContent =
            String(totalCases).padStart(2, "0");


        document.getElementById("reportClosedCases").textContent =
            String(closedCases).padStart(2, "0");


        document.getElementById("reportOngoingCases").textContent =
            String(ongoingCases).padStart(2, "0");


        document.getElementById("reportConvictions").textContent =
            String(convictedCases).padStart(2, "0");


        /* CASE STATUS */

        document.getElementById("statusClosed").textContent =
            closedCases;


        document.getElementById("statusTrial").textContent =
            trialCases;


        document.getElementById("statusInvestigation").textContent =
            investigationCases;


        /* STATUS PROGRESS */

        const closedPercentage =
            totalCases > 0
                ? (closedCases / totalCases) * 100
                : 0;


        const trialPercentage =
            totalCases > 0
                ? (trialCases / totalCases) * 100
                : 0;


        const investigationPercentage =
            totalCases > 0
                ? (investigationCases / totalCases) * 100
                : 0;


        document.getElementById("statusClosedProgress").style.width =
            `${closedPercentage}%`;


        document.getElementById("statusTrialProgress").style.width =
            `${trialPercentage}%`;


        document.getElementById("statusInvestigationProgress").style.width =
            `${investigationPercentage}%`;


        /* CASE OUTCOMES */

        document.getElementById("outcomeConvicted").textContent =
            convictedCases;


        document.getElementById("outcomeAcquitted").textContent =
            acquittedCases;


        /* SYSTEM RECORD COUNTS */

        document.getElementById("recordInvestigations").textContent =
            String(
                Array.isArray(investigations)
                    ? investigations.length
                    : 0
            ).padStart(2, "0");


        document.getElementById("recordEvidence").textContent =
            String(
                Array.isArray(evidence)
                    ? evidence.length
                    : 0
            ).padStart(2, "0");


        document.getElementById("recordArrests").textContent =
            String(
                Array.isArray(arrests)
                    ? arrests.length
                    : 0
            ).padStart(2, "0");


        document.getElementById("recordBail").textContent =
            String(
                Array.isArray(bailApplications)
                    ? bailApplications.length
                    : 0
            ).padStart(2, "0");


        document.getElementById("recordCharges").textContent =
            String(
                Array.isArray(charges)
                    ? charges.length
                    : 0
            ).padStart(2, "0");


        document.getElementById("recordJudgments").textContent =
            String(
                Array.isArray(judgments)
                    ? judgments.length
                    : 0
            ).padStart(2, "0");


    } catch (error) {

        console.error(
            "Error loading report data:",
            error
        );

    }

}


/* START */

loadReports();