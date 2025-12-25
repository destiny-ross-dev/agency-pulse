import { UploadIcon } from "./icons";

export default function DropzoneTile({ label, hint, fileMeta, onPick }) {
  const ok = Boolean(fileMeta?.fileName);

  return (
    <button
      type="button"
      className={`dropzone ${ok ? "ok" : ""}`}
      onClick={onPick}
    >
      <div className="drop-inner">
        <div className="file-icon">
          <UploadIcon />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="drop-title">{label}</p>
          <p className="drop-hint">{hint}</p>

          <div className="badges">
            {ok ? (
              <>
                <span className="badge" title={fileMeta.fileName}>
                  {fileMeta.fileName}
                </span>
                <span className="badge">
                  {fileMeta.rowCount.toLocaleString()} rows
                </span>
                <span className="badge">{fileMeta.headers.length} columns</span>
              </>
            ) : (
              <span className="badge">Click to upload CSV</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
