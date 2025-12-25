import Card from "../common/Card";
import DropzoneTile from "../common/DropzoneTile";
import MiniBusy from "../common/MiniBusy";
import SectionTitle from "../common/SectionTitle";
import { UploadIcon } from "../common/icons";

export default function DataImportStep({
  datasets,
  busyKey,
  allUploaded,
  onPickFile,
  onNext,
}) {
  return (
    <Card pad>
      <SectionTitle
        icon={<UploadIcon />}
        title="Data Import"
        subtitle="Upload your CSV exports to update the dashboard."
      />

      <div className="grid-3">
        <div>
          <p className="label">Activity Tracker</p>
          <DropzoneTile
            label="Upload Activity CSV"
            hint="Daily totals per agent (dials, contacts, quotes, sales)."
            fileMeta={datasets.activity}
            onPick={() => onPickFile("activity")}
          />
          {busyKey === "activity" ? <MiniBusy /> : null}
        </div>

        <div>
          <p className="label">Quotes & Sales Log</p>
          <DropzoneTile
            label="Upload Quotes & Sales CSV"
            hint="One row per policy quote / issued policy."
            fileMeta={datasets.quotesSales}
            onPick={() => onPickFile("quotesSales")}
          />
          {busyKey === "quotesSales" ? <MiniBusy /> : null}
        </div>

        <div>
          <p className="label">Paid Leads Info</p>
          <DropzoneTile
            label="Upload Paid Leads CSV"
            hint="Daily lead counts & cost for paid sources."
            fileMeta={datasets.paidLeads}
            onPick={() => onPickFile("paidLeads")}
          />
          {busyKey === "paidLeads" ? <MiniBusy /> : null}
        </div>
      </div>

      <div className="actions">
        <button className="btn primary" disabled={!allUploaded} onClick={onNext}>
          Continue to Mapping
        </button>
      </div>
    </Card>
  );
}
