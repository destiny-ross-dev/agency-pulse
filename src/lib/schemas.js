// src/lib/schemas.js

export const SCHEMAS = {
  activity: {
    label: "Activity Tracker",
    description: "Daily activity totals by agent.",
    requiredFields: [
      { key: "agent_name", label: "Agent Name" },
      { key: "date", label: "Date" },
      { key: "dials_made", label: "Dials Made" },
      { key: "contacts_made", label: "Contacts Made" },
      { key: "households_quoted", label: "Households Quoted" },
      { key: "total_quotes", label: "Total Quotes" },
      { key: "total_sales", label: "Total Sales" },
    ],
  },

  quotesSales: {
    label: "Quotes & Sales Log",
    description: "Each row is a policy quoted and/or issued.",
    requiredFields: [
      { key: "agent_name", label: "Agent Name" },
      { key: "date", label: "Date" },
      { key: "policyholder", label: "Policyholder" },
      { key: "line_of_business", label: "Line of Business" },
      { key: "policy_type", label: "Policy Type" },
      { key: "business_type", label: "Business Type" },
      { key: "status", label: "Status" },
      { key: "lead_source", label: "Lead Source" },
      { key: "zipcode", label: "Zipcode" },
      { key: "written_premium", label: "Written Premium" },
      { key: "date_issued", label: "Date Issued" },
      { key: "issued_premium", label: "Issued Premium" },
    ],
  },

  paidLeads: {
    label: "Paid Lead Source Info",
    description: "Daily paid lead provider volume + costs.",
    requiredFields: [
      { key: "date", label: "Date" },
      { key: "lead_source", label: "Lead Source" },
      { key: "lead_count", label: "Count of Leads" },
      { key: "lead_cost", label: "Cost of Lead" },
    ],
  },
};

export const SYNONYMS = {
  agent_name: ["agent", "agent name", "producer", "rep", "employee", "advisor"],
  date: ["date", "day", "activity date", "written date", "quote date"],
  dials_made: ["dials", "calls", "outbound", "dialed", "call attempts"],
  contacts_made: ["contacts", "reached", "connects", "conversations"],
  households_quoted: [
    "households quoted",
    "household quoted",
    "hh quoted",
    "households",
  ],
  total_quotes: ["total quotes", "quotes", "quoted", "quote count"],
  total_sales: [
    "total sales",
    "sales",
    "policies sold",
    "sold",
    "issued count",
  ],

  policyholder: [
    "policyholder",
    "insured",
    "named insured",
    "customer",
    "client",
  ],
  line_of_business: ["lob", "line of business", "line", "business line"],
  policy_type: ["policy type", "product", "coverage", "policy"],
  business_type: [
    "business type",
    "new or existing",
    "household type",
    "existing/new",
  ],
  status: ["status", "stage", "quoted/issued", "disposition"],
  lead_source: ["lead source", "source", "origin", "channel", "provider"],
  zipcode: ["zip", "zipcode", "postal", "postal code"],
  written_premium: [
    "written premium",
    "quoted premium",
    "premium quoted",
    "quote premium",
    "written prem",
  ],
  date_issued: ["date issued", "issue date", "issued date", "effective date"],
  issued_premium: [
    "issued premium",
    "final premium",
    "premium issued",
    "bound premium",
  ],

  lead_count: ["count of leads", "lead count", "leads", "volume", "quantity"],
  lead_cost: ["cost per lead", "cpl", "lead cost", "cost of lead", "unit cost"],
};
