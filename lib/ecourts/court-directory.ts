/**
 * Comprehensive Indian Courts and Judicial Establishments Directory
 * Structured by: State -> District -> Court Establishment & Case Type
 * Following official CIS (Case Information System) eCourts structure.
 */

export interface DistrictInfo {
  name: string;
  code: string;
  courts: string[];
}

export interface StateHierarchy {
  code: string;
  name: string;
  districts: DistrictInfo[];
}

export const STATE_DISTRICT_HIERARCHY: StateHierarchy[] = [
  {
    code: "MH",
    name: "Maharashtra",
    districts: [
      {
        name: "Thane",
        code: "TH",
        courts: [
          "Civil Court S.D. Kalyan",
          "Civil Court Junior Division & JMFC, Kalyan",
          "Civil Court Junior Division & JMFC, Ambernath",
          "District & Sessions Court, Thane",
          "Civil Court Senior Division, Thane",
          "Court of Small Causes, Thane",
          "Family Court, Thane",
          "Civil Court Junior Division & JMFC, Ulhasnagar",
          "Civil Court Junior Division & JMFC, Bhiwandi",
          "Civil & Criminal Court, Shahapur",
          "Civil & Criminal Court, Murbad",
          "Civil Court Senior Division & JMFC, Belapur / Vashi (Navi Mumbai)",
        ],
      },
      {
        name: "Mumbai Suburban",
        code: "BO",
        courts: [
          "City Civil & Sessions Court, Dindoshi (Borivali/Goregaon)",
          "Metropolitan Magistrate Court (28th Court), Bandra",
          "Metropolitan Magistrate Court (10th Court), Andheri",
          "Metropolitan Magistrate Court (53rd Court), Kurla",
          "Metropolitan Magistrate Court (30th Court), Kurla",
          "Metropolitan Magistrate Court (31st Court), Vikhroli",
          "Metropolitan Magistrate Court (33rd Court), Mulund",
          "Metropolitan Magistrate Court (37th Court), Borivali",
          "Family Court, Bandra (Mumbai)",
          "Small Causes Court, Bandra",
        ],
      },
      {
        name: "Mumbai City",
        code: "BO",
        courts: [
          "High Court of Judicature at Bombay (Principal Bench)",
          "City Civil & Sessions Court, Greater Mumbai (Fort)",
          "Chief Metropolitan Magistrate Court, Esplanade (Mumbai)",
          "Additional Chief Metropolitan Magistrate Court, Ballard Pier",
          "Metropolitan Magistrate Court (14th Court), Girgaon",
          "Metropolitan Magistrate Court (18th Court), Girgaon",
          "Metropolitan Magistrate Court (21st Court), Mazgaon (Sewree)",
          "Small Causes Court, Mumbai (Dhobi Talao)",
          "Motor Accident Claims Tribunal (MACT), Mumbai",
          "Debts Recovery Tribunal (DRT-I, DRT-II, DRT-III), Mumbai",
          "National Company Law Tribunal (NCLT), Mumbai Bench",
          "Maharashtra Real Estate Regulatory Authority (MahaRERA), Mumbai",
          "Maharashtra State Consumer Commission, Mumbai",
          "Labour & Industrial Court, Mumbai",
        ],
      },
      {
        name: "Pune",
        code: "PU",
        courts: [
          "District & Sessions Court, Shivajinagar, Pune",
          "Court of Small Causes, Pune",
          "Civil Court Senior Division, Pune",
          "Family Court, Pune",
          "Civil Court Senior Division, Baramati (Pune)",
          "Civil Court Senior Division & JMFC, Haveli (Pune)",
          "Civil Court Junior Division, Vadgaon Maval (Pune)",
          "Labour & Industrial Court, Pune",
        ],
      },
      {
        name: "Raigad",
        code: "RA",
        courts: [
          "District & Sessions Court, Alibag (Raigad)",
          "Civil Court Senior Division & JMFC, Panvel",
          "Civil Court Junior Division & JMFC, Karjat",
          "Civil Court Junior Division & JMFC, Roha",
          "Civil Court Junior Division & JMFC, Pen",
          "Civil Court Junior Division & JMFC, Mahad",
        ],
      },
      {
        name: "Palghar",
        code: "PA",
        courts: [
          "District & Sessions Court, Palghar",
          "Civil Court Senior Division & JMFC, Vasai",
          "Civil Court Junior Division & JMFC, Dahanu",
          "Civil Court Junior Division & JMFC, Jawhar",
          "Civil Court Junior Division & JMFC, Wada",
        ],
      },
      {
        name: "Nashik",
        code: "NA",
        courts: [
          "District & Sessions Court, Nashik",
          "Civil Court Senior Division, Malegaon (Nashik)",
          "Civil Court Junior Division & JMFC, Niphad",
          "Civil Court Junior Division & JMFC, Sinnar",
          "Family Court, Nashik",
        ],
      },
      {
        name: "Chhatrapati Sambhajinagar (Aurangabad)",
        code: "AU",
        courts: [
          "High Court of Bombay at Aurangabad Bench",
          "District & Sessions Court, Chhatrapati Sambhajinagar",
          "Civil Court Senior Division, Aurangabad",
          "Family Court, Aurangabad",
        ],
      },
      {
        name: "Nagpur",
        code: "NG",
        courts: [
          "High Court of Bombay at Nagpur Bench",
          "District & Sessions Court, Nagpur",
          "Court of Small Causes, Nagpur",
          "Family Court, Nagpur",
        ],
      },
      {
        name: "Kolhapur",
        code: "KO",
        courts: [
          "District & Sessions Court, Kolhapur",
          "Civil Court Senior Division, Kolhapur",
          "Civil Court Junior Division, Ichalkaranji",
          "Family Court, Kolhapur",
        ],
      },
      {
        name: "Solapur",
        code: "SO",
        courts: [
          "District & Sessions Court, Solapur",
          "Civil Court Senior Division, Solapur",
          "Civil Court Junior Division, Pandharpur",
        ],
      },
      {
        name: "Satara",
        code: "SA",
        courts: [
          "District & Sessions Court, Satara",
          "Civil Court Senior Division, Satara",
          "Civil Court Junior Division, Karad",
        ],
      },
      {
        name: "Sangli",
        code: "SN",
        courts: [
          "District & Sessions Court, Sangli",
          "Civil Court Senior Division, Sangli",
          "Civil Court Junior Division, Miraj",
        ],
      },
      {
        name: "Ahmednagar",
        code: "AH",
        courts: [
          "District & Sessions Court, Ahmednagar",
          "Civil Court Senior Division, Ahmednagar",
          "Civil Court Junior Division, Shrirampur",
          "Civil Court Junior Division, Sangamner",
        ],
      },
      {
        name: "Jalgaon",
        code: "JL",
        courts: [
          "District & Sessions Court, Jalgaon",
          "Civil Court Senior Division, Bhusawal",
        ],
      },
      {
        name: "Amravati",
        code: "AM",
        courts: [
          "District & Sessions Court, Amravati",
          "Civil Court Senior Division, Achalpur",
        ],
      },
      {
        name: "Nanded",
        code: "ND",
        courts: [
          "District & Sessions Court, Nanded",
          "Civil Court Senior Division, Degloor",
        ],
      },
    ],
  },
  {
    code: "DL",
    name: "Delhi (NCT)",
    districts: [
      {
        name: "Central Delhi (Tis Hazari)",
        code: "TH",
        courts: [
          "Tis Hazari Courts Complex (Central District)",
          "Chief Metropolitan Magistrate, Central, Tis Hazari",
          "Court of Small Causes, Tis Hazari",
        ],
      },
      {
        name: "West Delhi (Tis Hazari)",
        code: "TH",
        courts: [
          "Tis Hazari Courts Complex (West District)",
          "Chief Metropolitan Magistrate, West, Tis Hazari",
        ],
      },
      {
        name: "New Delhi (Patiala House)",
        code: "PH",
        courts: [
          "High Court of Delhi, New Delhi",
          "Patiala House Courts Complex (New Delhi District)",
          "Chief Metropolitan Magistrate, New Delhi, PHC",
          "Special CBI Court, Patiala House",
        ],
      },
      {
        name: "South Delhi (Saket)",
        code: "SA",
        courts: [
          "Saket Courts Complex (South District)",
          "Chief Metropolitan Magistrate, South, Saket",
          "Family Court, Saket",
        ],
      },
      {
        name: "South-East Delhi (Saket)",
        code: "SA",
        courts: [
          "Saket Courts Complex (South-East District)",
          "Chief Metropolitan Magistrate, South-East, Saket",
        ],
      },
      {
        name: "South-West Delhi (Dwarka)",
        code: "DW",
        courts: [
          "Dwarka Courts Complex (South-West District)",
          "Chief Metropolitan Magistrate, Dwarka",
          "Family Court, Dwarka",
        ],
      },
      {
        name: "North Delhi (Rohini)",
        code: "RO",
        courts: [
          "Rohini Courts Complex (North District)",
          "Chief Metropolitan Magistrate, North, Rohini",
        ],
      },
      {
        name: "North-West Delhi (Rohini)",
        code: "RO",
        courts: [
          "Rohini Courts Complex (North-West District)",
          "Chief Metropolitan Magistrate, North-West, Rohini",
        ],
      },
      {
        name: "East Delhi (Karkardooma)",
        code: "KK",
        courts: [
          "Karkardooma Courts Complex (East District)",
          "Chief Metropolitan Magistrate, East, Karkardooma",
        ],
      },
      {
        name: "North-East Delhi (Karkardooma)",
        code: "KK",
        courts: [
          "Karkardooma Courts Complex (North-East District)",
          "Chief Metropolitan Magistrate, North-East, Karkardooma",
        ],
      },
      {
        name: "Shahdara (Karkardooma)",
        code: "KK",
        courts: [
          "Karkardooma Courts Complex (Shahdara District)",
          "Chief Metropolitan Magistrate, Shahdara",
        ],
      },
      {
        name: "Rouse Avenue (Special Courts)",
        code: "RA",
        courts: [
          "Rouse Avenue Court Complex (CBI & MP/MLA Special Courts)",
          "Chief Metropolitan Magistrate, Rouse Avenue",
        ],
      },
    ],
  },
  {
    code: "KA",
    name: "Karnataka",
    districts: [
      {
        name: "Bengaluru Urban",
        code: "BN",
        courts: [
          "High Court of Karnataka (Principal Bench, Bengaluru)",
          "City Civil & Sessions Court, Bengaluru Urban",
          "Chief Metropolitan Magistrate Court (CMM), Bengaluru",
          "Court of Small Causes, Bengaluru",
          "Family Court, Bengaluru",
          "Mayo Hall Court Complex, Bengaluru",
        ],
      },
      {
        name: "Bengaluru Rural",
        code: "BR",
        courts: [
          "District & Sessions Court, Bengaluru Rural",
          "Civil Court Senior Division, Devanahalli",
        ],
      },
      {
        name: "Mysuru",
        code: "MY",
        courts: [
          "District & Sessions Court, Mysuru",
          "Civil Court Senior Division, Mysuru",
          "Family Court, Mysuru",
        ],
      },
      {
        name: "Dharwad",
        code: "DH",
        courts: [
          "High Court of Karnataka (Dharwad Bench)",
          "District & Sessions Court, Dharwad",
          "Civil Court Senior Division, Hubballi",
        ],
      },
      {
        name: "Mangaluru (Dakshina Kannada)",
        code: "MA",
        courts: [
          "District & Sessions Court, Mangaluru",
          "Civil Court Senior Division, Mangaluru",
        ],
      },
      {
        name: "Kalaburagi (Gulbarga)",
        code: "KL",
        courts: [
          "High Court of Karnataka (Kalaburagi Bench)",
          "District & Sessions Court, Kalaburagi",
        ],
      },
      {
        name: "Belagavi (Belgaum)",
        code: "BE",
        courts: [
          "District & Sessions Court, Belagavi",
          "Civil Court Senior Division, Gokak",
        ],
      },
    ],
  },
  {
    code: "GJ",
    name: "Gujarat",
    districts: [
      {
        name: "Ahmedabad City",
        code: "AH",
        courts: [
          "High Court of Gujarat, Sola, Ahmedabad",
          "City Civil & Sessions Court, Bhadra, Ahmedabad",
          "Chief Metropolitan Magistrate Court, Gheekanta, Ahmedabad",
          "Court of Small Causes, Ahmedabad",
          "Family Court, Ahmedabad",
        ],
      },
      {
        name: "Ahmedabad Rural",
        code: "AR",
        courts: [
          "District & Sessions Court, Ahmedabad Rural (Mirzapur)",
          "Civil Court Senior Division, Sanand",
        ],
      },
      {
        name: "Surat",
        code: "SR",
        courts: [
          "District & Sessions Court, Surat",
          "Civil Court Senior Division, Surat",
          "Chief Judicial Magistrate Court, Surat",
          "Family Court, Surat",
        ],
      },
      {
        name: "Vadodara (Baroda)",
        code: "VA",
        courts: [
          "District & Sessions Court, Vadodara",
          "Civil Court Senior Division, Vadodara",
          "Family Court, Vadodara",
        ],
      },
      {
        name: "Rajkot",
        code: "RA",
        courts: [
          "District & Sessions Court, Rajkot",
          "Civil Court Senior Division, Rajkot",
        ],
      },
    ],
  },
  {
    code: "UP",
    name: "Uttar Pradesh",
    districts: [
      {
        name: "Gautam Buddha Nagar (Noida)",
        code: "GB",
        courts: [
          "District & Sessions Court, Surajpur (Greater Noida)",
          "Civil Court Senior Division, Gautam Buddha Nagar",
          "Chief Judicial Magistrate Court, Surajpur",
        ],
      },
      {
        name: "Ghaziabad",
        code: "GH",
        courts: [
          "District & Sessions Court, Ghaziabad",
          "Special CBI Court, Ghaziabad",
          "Civil Court Senior Division, Ghaziabad",
        ],
      },
      {
        name: "Prayagraj (Allahabad)",
        code: "AL",
        courts: [
          "High Court of Judicature at Allahabad",
          "District & Sessions Court, Prayagraj",
          "Civil Court Senior Division, Prayagraj",
        ],
      },
      {
        name: "Lucknow",
        code: "LU",
        courts: [
          "High Court of Allahabad (Lucknow Bench)",
          "District & Sessions Court, Lucknow",
          "Special CBI Court, Lucknow",
          "Family Court, Lucknow",
        ],
      },
      {
        name: "Kanpur Nagar",
        code: "KN",
        courts: [
          "District & Sessions Court, Kanpur Nagar",
          "Civil Court Senior Division, Kanpur Nagar",
        ],
      },
      {
        name: "Varanasi (Benares)",
        code: "VA",
        courts: [
          "District & Sessions Court, Varanasi",
          "Civil Court Senior Division, Varanasi",
        ],
      },
      {
        name: "Agra",
        code: "AG",
        courts: [
          "District & Sessions Court, Agra",
          "Civil Court Senior Division, Agra",
        ],
      },
      {
        name: "Meerut",
        code: "ME",
        courts: [
          "District & Sessions Court, Meerut",
          "Civil Court Senior Division, Meerut",
        ],
      },
    ],
  },
  {
    code: "WB",
    name: "West Bengal",
    districts: [
      {
        name: "Kolkata (Calcutta)",
        code: "CC",
        courts: [
          "High Court at Calcutta (Principal Bench)",
          "City Civil Court, Calcutta",
          "City Sessions Court, Calcutta",
          "Chief Metropolitan Magistrate Court, Bankshall Court, Calcutta",
          "Small Causes Court, Calcutta",
        ],
      },
      {
        name: "South 24 Parganas (Alipore)",
        code: "AL",
        courts: [
          "District & Sessions Court, Alipore",
          "Chief Judicial Magistrate Court, Alipore",
        ],
      },
      {
        name: "North 24 Parganas (Barasat)",
        code: "BA",
        courts: [
          "District & Sessions Court, Barasat",
          "Civil Court Senior Division, Bidhannagar (Salt Lake)",
        ],
      },
      {
        name: "Howrah",
        code: "HW",
        courts: [
          "District & Sessions Court, Howrah",
          "Chief Judicial Magistrate Court, Howrah",
        ],
      },
    ],
  },
  {
    code: "TN",
    name: "Tamil Nadu",
    districts: [
      {
        name: "Chennai (Madras)",
        code: "CH",
        courts: [
          "High Court of Judicature at Madras (Principal Bench)",
          "City Civil Court, Chennai",
          "Chief Metropolitan Magistrate Court, Egmore, Chennai",
          "Court of Small Causes, Chennai",
          "Metropolitan Magistrate Court, Saidapet, Chennai",
          "Metropolitan Magistrate Court, George Town, Chennai",
        ],
      },
      {
        name: "Madurai",
        code: "MD",
        courts: [
          "High Court of Madras (Madurai Bench)",
          "District & Sessions Court, Madurai",
        ],
      },
      {
        name: "Coimbatore",
        code: "CO",
        courts: [
          "District & Sessions Court, Coimbatore",
          "Civil Court Senior Division, Coimbatore",
        ],
      },
    ],
  },
  {
    code: "TS",
    name: "Telangana",
    districts: [
      {
        name: "Hyderabad",
        code: "HY",
        courts: [
          "High Court for the State of Telangana, Hyderabad",
          "City Civil Court, Purani Haveli, Hyderabad",
          "Metropolitan Sessions Court, Nampally, Hyderabad",
          "Chief Metropolitan Magistrate Court, Nampally",
          "Court of Small Causes, Hyderabad",
          "Family Court, Hyderabad",
        ],
      },
      {
        name: "Ranga Reddy",
        code: "RR",
        courts: [
          "District & Sessions Court, Ranga Reddy (L.B. Nagar)",
          "Civil Court Senior Division, Kukatpally",
          "Metropolitan Magistrate Court, Cyberabad",
        ],
      },
    ],
  },
  {
    code: "AP",
    name: "Andhra Pradesh",
    districts: [
      {
        name: "Amaravati / Guntur",
        code: "AP",
        courts: [
          "High Court of Andhra Pradesh, Amaravati",
          "District & Sessions Court, Guntur",
        ],
      },
      {
        name: "Visakhapatnam",
        code: "VS",
        courts: [
          "District & Sessions Court, Visakhapatnam",
          "Chief Metropolitan Magistrate Court, Visakhapatnam",
        ],
      },
      {
        name: "Krishna (Vijayawada)",
        code: "VJ",
        courts: [
          "District & Sessions Court, Machilipatnam",
          "Metropolitan Sessions Court, Vijayawada",
        ],
      },
    ],
  },
  {
    code: "RJ",
    name: "Rajasthan",
    districts: [
      {
        name: "Jaipur",
        code: "JP",
        courts: [
          "High Court of Rajasthan (Jaipur Bench)",
          "District & Sessions Court, Jaipur Metropolitan",
          "Chief Metropolitan Magistrate Court, Jaipur",
        ],
      },
      {
        name: "Jodhpur",
        code: "JD",
        courts: [
          "High Court of Rajasthan (Principal Bench, Jodhpur)",
          "District & Sessions Court, Jodhpur Metropolitan",
        ],
      },
    ],
  },
  {
    code: "PB",
    name: "Punjab",
    districts: [
      {
        name: "Chandigarh (U.T.)",
        code: "CH",
        courts: [
          "High Court of Punjab and Haryana, Chandigarh",
          "District & Sessions Court, Sector 43, Chandigarh",
          "Chief Judicial Magistrate Court, Chandigarh",
        ],
      },
      {
        name: "Ludhiana",
        code: "LU",
        courts: [
          "District & Sessions Court, Ludhiana",
          "Civil Court Senior Division, Ludhiana",
        ],
      },
      {
        name: "Amritsar",
        code: "AM",
        courts: [
          "District & Sessions Court, Amritsar",
          "Civil Court Senior Division, Amritsar",
        ],
      },
    ],
  },
  {
    code: "HR",
    name: "Haryana",
    districts: [
      {
        name: "Gurugram (Gurgaon)",
        code: "GG",
        courts: [
          "District & Sessions Court, Gurugram",
          "Civil Court Senior Division, Gurugram",
          "Chief Judicial Magistrate Court, Gurugram",
        ],
      },
      {
        name: "Faridabad",
        code: "FB",
        courts: [
          "District & Sessions Court, Faridabad",
          "Civil Court Senior Division, Faridabad",
        ],
      },
    ],
  },
  {
    code: "MP",
    name: "Madhya Pradesh",
    districts: [
      {
        name: "Jabalpur",
        code: "JB",
        courts: [
          "High Court of Madhya Pradesh (Principal Bench, Jabalpur)",
          "District & Sessions Court, Jabalpur",
        ],
      },
      {
        name: "Indore",
        code: "IN",
        courts: [
          "High Court of Madhya Pradesh (Indore Bench)",
          "District & Sessions Court, Indore",
          "Family Court, Indore",
        ],
      },
      {
        name: "Gwalior",
        code: "GW",
        courts: [
          "High Court of Madhya Pradesh (Gwalior Bench)",
          "District & Sessions Court, Gwalior",
        ],
      },
      {
        name: "Bhopal",
        code: "BP",
        courts: [
          "District & Sessions Court, Bhopal",
          "National Green Tribunal (NGT) Central Zone Bench, Bhopal",
        ],
      },
    ],
  },
  {
    code: "KL",
    name: "Kerala",
    districts: [
      {
        name: "Ernakulam (Kochi)",
        code: "EK",
        courts: [
          "High Court of Kerala, Ernakulam",
          "District & Sessions Court, Ernakulam",
          "Chief Judicial Magistrate Court, Ernakulam",
        ],
      },
      {
        name: "Thiruvananthapuram",
        code: "TV",
        courts: [
          "District & Sessions Court, Thiruvananthapuram",
          "Chief Judicial Magistrate Court, Thiruvananthapuram",
        ],
      },
    ],
  },
  {
    code: "BR",
    name: "Bihar",
    districts: [
      {
        name: "Patna",
        code: "PT",
        courts: [
          "High Court of Judicature at Patna",
          "District & Sessions Court, Patna",
          "Chief Judicial Magistrate Court, Patna",
        ],
      },
    ],
  },
  {
    code: "NAT",
    name: "National / Supreme Court & Tribunals",
    districts: [
      {
        name: "Apex Court & National Tribunals",
        code: "SC",
        courts: [
          "Supreme Court of India, New Delhi",
          "National Company Law Appellate Tribunal (NCLAT), New Delhi",
          "National Green Tribunal (NGT) Principal Bench, New Delhi",
          "Armed Forces Tribunal (AFT) Principal Bench, New Delhi",
          "Central Administrative Tribunal (CAT) Principal Bench, New Delhi",
        ],
      },
      {
        name: "All High Courts of India",
        code: "HC",
        courts: [
          "High Court of Judicature at Bombay (Principal Bench)",
          "High Court of Delhi, New Delhi",
          "High Court of Judicature at Allahabad",
          "High Court of Karnataka (Principal Bench, Bengaluru)",
          "High Court of Gujarat, Ahmedabad",
          "High Court of Judicature at Madras",
          "High Court at Calcutta",
          "High Court of Rajasthan (Jodhpur Bench)",
          "High Court of Punjab and Haryana, Chandigarh",
          "High Court of Madhya Pradesh (Jabalpur Bench)",
          "High Court of Kerala, Ernakulam",
          "High Court for the State of Telangana, Hyderabad",
          "High Court of Andhra Pradesh, Amaravati",
          "High Court of Orissa, Cuttack",
          "High Court of Judicature at Patna",
          "Gauhati High Court, Guwahati",
          "High Court of Jharkhand, Ranchi",
          "High Court of Uttarakhand, Nainital",
          "High Court of Himachal Pradesh, Shimla",
          "High Court of Chhattisgarh, Bilaspur",
          "High Court of Jammu & Kashmir and Ladakh",
        ],
      },
    ],
  },
];

export const COMPREHENSIVE_CASE_TYPES = [
  // --- Civil Matters ---
  { code: "RCS", label: "RCS - Regular Civil Suit", group: "Civil Suits & Matters" },
  { code: "SCS", label: "SCS / SPL.CS - Special Civil Suit", group: "Civil Suits & Matters" },
  { code: "CS", label: "CS - Civil Suit", group: "Civil Suits & Matters" },
  { code: "OS", label: "OS - Original Suit", group: "Civil Suits & Matters" },
  { code: "MS", label: "MS - Money Suit", group: "Civil Suits & Matters" },
  { code: "TS", label: "TS - Title Suit", group: "Civil Suits & Matters" },
  { code: "EX", label: "EX - Execution Petition", group: "Civil Suits & Matters" },
  { code: "MA", label: "MA - Miscellaneous Application", group: "Civil Suits & Matters" },
  { code: "CMA", label: "CMA - Civil Miscellaneous Appeal", group: "Civil Suits & Matters" },
  { code: "CA", label: "CA - Civil Appeal", group: "Civil Suits & Matters" },
  { code: "ARB", label: "ARB - Arbitration Petition / Application", group: "Civil Suits & Matters" },
  { code: "MAT", label: "MAT - Matrimonial / Divorce Petition (HMA)", group: "Civil Suits & Matters" },
  { code: "SUCC", label: "SUCC - Succession Certificate Application", group: "Civil Suits & Matters" },
  { code: "PROB", label: "PROB - Probate Petition / Letters of Admin", group: "Civil Suits & Matters" },
  { code: "GW", label: "GW - Guardianship & Wards Petition", group: "Civil Suits & Matters" },
  { code: "CC", label: "CC - Consumer Complaint", group: "Civil Suits & Matters" },
  { code: "RERA", label: "RERA - Real Estate Regulatory Matter", group: "Civil Suits & Matters" },

  // --- Criminal Matters ---
  { code: "CC", label: "CC / RCC - Regular Criminal Case", group: "Criminal Cases & Applications" },
  { code: "SCC", label: "SCC - Summary Criminal Case", group: "Criminal Cases & Applications" },
  { code: "SC", label: "SC - Sessions Case", group: "Criminal Cases & Applications" },
  { code: "SPL.CC", label: "SPL.CC - Special Criminal Case (POCSO / NDPS / CBI / ACB)", group: "Criminal Cases & Applications" },
  { code: "BAIL", label: "BAIL - Regular Bail Application (Sec 439 / 483 BNSS)", group: "Criminal Cases & Applications" },
  { code: "ABAIL", label: "ABAIL - Anticipatory Bail Application (Sec 438 / 482 BNSS)", group: "Criminal Cases & Applications" },
  { code: "CRA", label: "CRA - Criminal Appeal", group: "Criminal Cases & Applications" },
  { code: "CRR", label: "CRR - Criminal Revision", group: "Criminal Cases & Applications" },
  { code: "CRI.MA", label: "CRI.MA - Criminal Miscellaneous Application", group: "Criminal Cases & Applications" },
  { code: "NI", label: "NI - Sec 138 Negotiable Instruments (Cheque Bounce)", group: "Criminal Cases & Applications" },
  { code: "DV", label: "DV - Domestic Violence Application (PWDVA)", group: "Criminal Cases & Applications" },
  { code: "MNT", label: "MNT - Maintenance Application (Sec 125 CrPC / BNSS)", group: "Criminal Cases & Applications" },

  // --- High Court & Constitutional Matters ---
  { code: "WP", label: "WP - Writ Petition (Civil / Criminal)", group: "High Court & Constitutional" },
  { code: "PIL", label: "PIL - Public Interest Litigation", group: "High Court & Constitutional" },
  { code: "CONT", label: "CONT - Contempt Petition", group: "High Court & Constitutional" },
  { code: "CP", label: "CP - Company Petition", group: "High Court & Constitutional" },
  { code: "COMM.CS", label: "COMM.CS - Commercial Suit", group: "High Court & Constitutional" },
  { code: "COMM.ARB", label: "COMM.ARB - Commercial Arbitration Petition", group: "High Court & Constitutional" },
  { code: "FAO", label: "FAO - First Appeal from Order", group: "High Court & Constitutional" },
  { code: "RFA", label: "RFA - Regular First Appeal", group: "High Court & Constitutional" },
  { code: "RSA", label: "RSA - Regular Second Appeal", group: "High Court & Constitutional" },
  { code: "SLP", label: "SLP - Special Leave Petition", group: "High Court & Constitutional" },

  // --- Other ---
  { code: "OTHER", label: "Other / Custom Case Type...", group: "Other" },
];

export const INDIAN_STATES = STATE_DISTRICT_HIERARCHY.map((s) => ({
  code: s.code,
  name: s.name,
}));

export function getDistrictsForState(stateCode: string): DistrictInfo[] {
  const state = STATE_DISTRICT_HIERARCHY.find((s) => s.code === stateCode);
  return state ? state.districts : [];
}

export function getCourtsForDistrict(stateCode: string, districtName: string): string[] {
  const state = STATE_DISTRICT_HIERARCHY.find((s) => s.code === stateCode);
  if (!state) return [];
  const district = state.districts.find((d) => d.name === districtName);
  return district ? district.courts : [];
}

