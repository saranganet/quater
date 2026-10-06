export interface CaseDetailsForCnr {
  caseNumber: string;
  caseType?: string;
  filingYear?: string;
  courtName?: string;
  state?: string;
  districtCode?: string;
}

/**
 * Resolves or synthesizes a standardized 16-character eCourts CNR Number
 * from case reference details (Case Type, Number, Year, Court).
 *
 * CIS eCourts 16-char CNR structure:
 * [2 char State Code][2 char District/Court Code][2 digit Est Code][6 digit Serial No][4 digit Year]
 * Example: MHTH070086142019 or MHHC010010242024
 */
export function generateCnrFromCaseDetails(details: CaseDetailsForCnr): string {
  const rawNum = (details.caseNumber || "").trim().toUpperCase();

  // If caseNumber is already a valid 16-char CNR, return it directly
  const stripped = rawNum.replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z0-9]{16}$/.test(stripped)) {
    return stripped;
  }

  // 1. State Code (2 uppercase letters)
  let stateCode = (details.state || "").trim().toUpperCase().slice(0, 2);
  const courtText = `${details.courtName || ""} ${details.caseType || ""}`.toLowerCase();
  if (!stateCode || stateCode.length < 2) {
    if (courtText.includes("delhi") || courtText.includes("patiala")) stateCode = "DL";
    else if (courtText.includes("karnataka") || courtText.includes("bangalore")) stateCode = "KA";
    else if (courtText.includes("gujarat") || courtText.includes("ahmedabad")) stateCode = "GJ";
    else if (courtText.includes("bengal") || courtText.includes("calcutta")) stateCode = "WB";
    else if (courtText.includes("allahabad") || courtText.includes("uttar pradesh")) stateCode = "UP";
    else stateCode = "MH"; // Default to Maharashtra
  }

  // 2. District / Court Establishment Code (2 letters)
  let districtCode = (details.districtCode || "").trim().toUpperCase().slice(0, 2);
  if (!districtCode) {
    if (courtText.includes("high court") || courtText.includes("hc")) districtCode = "HC";
    else if (courtText.includes("delhi") || courtText.includes("phc") || courtText.includes("tis hazari")) districtCode = "ND";
    else if (courtText.includes("kalyan") || courtText.includes("thane")) districtCode = "TH";
    else if (courtText.includes("pune")) districtCode = "PU";
    else if (courtText.includes("mumbai") || courtText.includes("bombay")) districtCode = "BO";
    else districtCode = "TH";
  }

  // 3. Court establishment number (2 digits)
  const estCode = districtCode === "HC" ? "01" : "07";

  // 4. Filing Year (4 digits)
  let year = (details.filingYear || "").replace(/\D/g, "");
  if (year.length !== 4) {
    const yearMatch = rawNum.match(/\b(19\d{2}|20\d{2})\b/);
    year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  }

  // 5. Sequence number (6 digits)
  const numWithoutYear = rawNum.replace(new RegExp(`\\b${year}\\b`), "").replace(/\D/g, "");
  const numPart = (numWithoutYear ? numWithoutYear.slice(-6) : "000001").padStart(6, "0");

  return `${stateCode}${districtCode}${estCode}${numPart}${year}`;
}
