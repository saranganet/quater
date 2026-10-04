import { ECourtsCaseDetailResponse } from "./types";

/**
 * High-fidelity mock case response matching the exact structure from eCourts docs
 * Useful for local offline testing and demonstrations.
 */
export function getMockECourtsCase(cnr: string): ECourtsCaseDetailResponse {
  const cleanCnr = cnr.trim().toUpperCase();

  return {
    data: {
      courtCaseData: {
        cnr: cleanCnr,
        caseNumber: "202400248072016",
        courtName: "Chief Metropolitan Magistrate, New Delhi, PHC",
        district: "New Delhi",
        state: "DL",
        stateCode: "26",
        districtCode: "7",
        courtCode: 2,
        courtNo: 2,
        caseType: "CC",
        caseTypeRaw: "Ct Cases",
        caseTypeSub: "Criminal Procedure Code.",
        caseStatus: "PENDING",
        filingNumber: "27843/2024",
        filingDate: "2024-01-15",
        registrationNumber: "24807/2024",
        registrationDate: "2024-01-18",
        firstHearingDate: "2024-02-05",
        nextHearingDate: "2026-10-14",
        lastHearingDate: "2026-08-20",
        decisionDate: undefined,
        purpose: "Evidence / Arguments",
        disposalType: undefined,
        disposalTypeRaw: undefined,
        contestedStatus: "CONTESTED",
        judges: ["Chief Metropolitan Magistrate"],
        petitioners: ["Ramesh Kumar Sharma"],
        petitionerAdvocates: ["Adv. Suresh Verma"],
        respondents: ["Union of India & Ors."],
        respondentAdvocates: ["Adv. Priya Sundaram"],
        caseCategoryFacetPath: "Criminal Law/Other Criminal Matters",
        hasOrders: true,
        hasJudgments: false,
        orderCount: 4,
        interimOrderCount: 4,
        judgmentCount: 0,
        hearingCount: 8,
        historyOfCaseHearings: [
          { judge: "CMM", businessOnDate: "2024-02-05", hearingDate: "2024-04-10", purposeOfListing: "Misc./ Appearance" },
          { judge: "CMM", businessOnDate: "2024-04-10", hearingDate: "2024-07-15", purposeOfListing: "Pleadings" },
          { judge: "CMM", businessOnDate: "2024-07-15", hearingDate: "2024-11-20", purposeOfListing: "Framing of Issues" },
          { judge: "CMM", businessOnDate: "2024-11-20", hearingDate: "2025-03-12", purposeOfListing: "Plaintiff Evidence" },
          { judge: "CMM", businessOnDate: "2025-03-12", hearingDate: "2025-08-18", purposeOfListing: "Prosecution Evidence" },
          { judge: "CMM", businessOnDate: "2025-08-18", hearingDate: "2025-12-04", purposeOfListing: "Cross Examination" },
          { judge: "CMM", businessOnDate: "2025-12-04", hearingDate: "2026-04-10", purposeOfListing: "Evidence" },
          { judge: "CMM", businessOnDate: "2026-04-10", hearingDate: "2026-10-14", purposeOfListing: "Evidence / Arguments" },
        ],
        interimOrders: [
          { orderDate: "2024-04-10", description: "ORDER ON SUMMONS", orderUrl: "order-1.pdf" },
          { orderDate: "2024-11-20", description: "ISSUES FRAMED", orderUrl: "order-2.pdf" },
          { orderDate: "2025-08-18", description: "WITNESS DEPOSITION RECORDED", orderUrl: "order-3.pdf" },
          { orderDate: "2026-04-10", description: "COPY OF ORDER", orderUrl: "order-4.pdf" },
        ],
        judgmentOrders: [],
        businessOnDateEntries: [
          { date: "2026-04-10", petitioner: "Ramesh Kumar Sharma", respondent: "Union of India", business: "Witness examined in chief. Cross reserved.", nextPurpose: "Evidence / Arguments", nextHearingDate: "2026-10-14" },
        ],
      },
      entityInfo: {
        cnr: cleanCnr,
        nextDateOfHearing: "2026-10-14T00:00:00Z",
        lastDateOfHearing: "2026-08-20T00:00:00Z",
        dateCreated: "2024-01-18T10:00:00Z",
        dateModified: new Date().toISOString(),
      },
    },
    meta: {
      request_id: `req_mock_${Date.now()}`,
    },
  };
}
