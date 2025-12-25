import { SCHEMAS } from "../../lib/schemas";
import Card from "../common/Card";
import Select from "../common/Select";

export default function MappingStep({
  datasets,
  mappings,
  onMappingChange,
  onReupload,
  onBack,
  onNext,
  canAnalyze,
}) {
  return (
    <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
      {Object.keys(SCHEMAS).map((key) => {
        const schema = SCHEMAS[key];
        const ds = datasets[key];
        if (!ds) return null;

        return (
          <Card key={key} pad>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {schema.label}
                </h3>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  {schema.description} •{" "}
                  <b style={{ color: "#334155" }}>{ds.fileName}</b>
                </p>
              </div>

              <div>
                <button className="btn" onClick={() => onReupload(key)}>
                  Re-upload
                </button>
              </div>
            </div>

            <div className="mapping-table">
              <div className="mapping-header">
                <div>Required Field</div>
                <div>CSV Column</div>
              </div>

              {schema.requiredFields.map((field) => {
                const current = mappings[key]?.[field.key] ?? "";
                const missing = !current;

                return (
                  <div key={field.key} className="mapping-row">
                    <div className="field">
                      <div className="field-name">{field.label}</div>
                      {missing ? (
                        <span className="chip bad">Required</span>
                      ) : (
                        <span className="chip ok">Mapped</span>
                      )}
                    </div>
                    <Select
                      value={current}
                      onChange={(val) => onMappingChange(key, field.key, val)}
                      options={ds.headers}
                    />
                  </div>
                );
              })}
            </div>

            <div className="preview">
              <p className="preview-title">Preview</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {ds.headers.slice(0, 6).map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ds.previewRows.map((row, idx) => (
                      <tr key={idx}>
                        {ds.headers.slice(0, 6).map((header) => (
                          <td key={header}>{String(row?.[header] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="actions" style={{ justifyContent: "space-between" }}>
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <button className="btn primary" disabled={!canAnalyze} onClick={onNext}>
          Continue to Analyze
        </button>
      </div>
    </div>
  );
}
