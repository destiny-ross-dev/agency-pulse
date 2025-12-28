// src/components/health/DataHealthPanel.jsx
import React from "react";
import HealthItem from "./HealthItem";
import SectionTitle from "../common/SectionTitle";
import { DataHealthIcon } from "../common/icons";

/**
 * DataHealthPanel
 * Extracted from App.jsx
 *
 * Props:
 * - health: object returned by computeDataHealth(...)
 * - open: boolean (expanded/collapsed)
 * - onToggle: () => void
 *
 * Notes:
 * - This component expects the HealthItem component and the CSS classes you already use:
 *   "health", "health-head", "health-title", "health-sub", "collapse-btn", "chev",
 *   "health-grid", "health-card", "health-list"
 *
 * If HealthItem currently lives inside App.jsx, move it to:
 *   src/components/health/HealthItem.jsx
 * and import it below.
 */

export default function DataHealthPanel({ health, open, onToggle }) {
  if (!health) return null;

  const quotesDelta = Math.round(Number(health.cross?.quotesDelta || 0));
  const salesDelta = Math.round(Number(health.cross?.salesDelta || 0));

  const activityQuotesTotal = Math.round(
    Number(health.cross?.activityQuotesTotal || 0)
  );
  const logQuotedOrIssued = Number(health.cross?.logQuotedOrIssued || 0);

  const activitySalesTotal = Math.round(
    Number(health.cross?.activitySalesTotal || 0)
  );
  const logIssued = Number(health.cross?.logIssued || 0);

  return (
    <div className="health">
      <div className="health-head">
        <SectionTitle
          icon={<DataHealthIcon />}
          title="Data Health &amp; Integrity"
          subtitle="Quick checks to catch missing fields, invalid dates, and mismatched
            paid sources."
        ></SectionTitle>

        <button
          type="button"
          className="collapse-btn"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="data-health-content"
        >
          <span>{open ? "Collapse" : "Expand"}</span>
          <svg
            className={`chev ${open ? "open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open ? (
        <div id="data-health-content">
          <div className="health-grid">
            <div className="health-card">
              <h4>Activity</h4>
              <div className="health-list">
                <HealthItem
                  label="Rows missing Date"
                  note="These rows won’t be usable in date-based reporting."
                  count={health.activity?.missingDate}
                />
                <HealthItem
                  label="Rows missing Agent Name"
                  note="Agent rollups may be incomplete."
                  count={health.activity?.missingAgent}
                />

                <HealthItem
                  label="Cross-file totals mismatch (Quotes + Issued)"
                  note={`Activity Total Quotes: ${activityQuotesTotal.toLocaleString()} • Log (Quoted+Issued): ${logQuotedOrIssued.toLocaleString()} • Δ ${quotesDelta.toLocaleString()}`}
                  count={Math.abs(quotesDelta)}
                />

                <HealthItem
                  label="Cross-file totals mismatch (Issued)"
                  note={`Activity Total Sales: ${activitySalesTotal.toLocaleString()} • Log Issued: ${logIssued.toLocaleString()} • Δ ${salesDelta.toLocaleString()}`}
                  count={Math.abs(salesDelta)}
                />

                <HealthItem
                  label="Non-numeric activity counts"
                  note="Examples: 'ten', 'N/A', or formatted text."
                  count={health.activity?.nonNumericCounts}
                />
                <HealthItem
                  label="Negative activity counts"
                  note="Usually indicates data entry error."
                  count={health.activity?.negativeCounts}
                />
              </div>
            </div>

            <div className="health-card">
              <h4>Quotes &amp; Sales</h4>
              <div className="health-list">
                <HealthItem
                  label="Rows missing Date"
                  note="These rows won’t be included in trends."
                  count={health.quotesSales?.missingDate}
                />
                <HealthItem
                  label="Missing or invalid Status"
                  note="Status should be Quoted or Issued for MVP."
                  count={
                    Number(health.quotesSales?.missingStatus || 0) +
                    Number(health.quotesSales?.badStatus || 0)
                  }
                />
                <HealthItem
                  label="Issued missing Issue Date"
                  note="Issued policies should include a valid Issue Date."
                  count={health.quotesSales?.issuedMissingIssueDate}
                />
                <HealthItem
                  label="Issued missing Issued Premium"
                  note="Totals may be understated."
                  count={health.quotesSales?.issuedMissingIssuedPremium}
                />
                <HealthItem
                  label="Missing Lead Source"
                  note="Lead source ROI will be incomplete."
                  count={health.quotesSales?.missingLeadSource}
                />
              </div>
            </div>

            <div className="health-card">
              <h4>Paid Leads</h4>
              <div className="health-list">
                <HealthItem
                  label="Rows missing Date"
                  note="Spend allocation by date may be off."
                  count={health.paidLeads?.missingDate}
                />
                <HealthItem
                  label="Missing Lead Count or Cost"
                  note="CPA and spend totals may be wrong."
                  count={
                    Number(health.paidLeads?.missingLeadCount || 0) +
                    Number(health.paidLeads?.missingLeadCost || 0)
                  }
                />
                <HealthItem
                  label="Non-numeric Count/Cost"
                  note="Examples: '$12' is OK, but 'twelve' is not."
                  count={health.paidLeads?.nonNumeric}
                />
                <HealthItem
                  label="Paid sources not seen in Quotes/Sales"
                  note="Provider names may not match between files."
                  count={health.cross?.paidSourcesWithNoQuoteSales}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
