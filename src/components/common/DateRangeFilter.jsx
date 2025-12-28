import { useLocation } from "react-router-dom";

import { useWorkflowData } from "../../context/useWorkflowData";
import { formatYMD } from "../../lib/dates";
import SegButton from "../common/SegButton";

export default function DateRangeFilter() {
  const location = useLocation();
  const {
    canAnalyze,
    rangeMode,
    setRangeMode,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    coverage,
    rangeLabel,
  } = useWorkflowData();

  const isEligibleRoute =
    location.pathname === "/dashboard" || location.pathname === "/agents";

  if (!isEligibleRoute || !canAnalyze) {
    return null;
  }

  return (
    <div className="container">
      <div className="filters">
        <div className="filters-left">
          <span className="filters-title">Date Range</span>

          <div className="seg seg-scroll">
            <SegButton
              active={rangeMode === "all"}
              onClick={() => setRangeMode("all")}
            >
              All Time
            </SegButton>
            <SegButton
              active={rangeMode === "7d"}
              onClick={() => setRangeMode("7d")}
            >
              Last 7
            </SegButton>
            <SegButton
              active={rangeMode === "30d"}
              onClick={() => setRangeMode("30d")}
            >
              Last 30
            </SegButton>
            <SegButton
              active={rangeMode === "90d"}
              onClick={() => setRangeMode("90d")}
            >
              Last 90
            </SegButton>
            <SegButton
              active={rangeMode === "365d"}
              onClick={() => setRangeMode("365d")}
            >
              Last Year
            </SegButton>
            <SegButton
              active={rangeMode === "custom"}
              onClick={() => setRangeMode("custom")}
            >
              Custom
            </SegButton>
          </div>

          {rangeMode === "custom" ? (
            <div className="date-range-inputs">
              <input
                className="date-input"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="date-sep">to</span>
              <input
                className="date-input"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="filters-right">
          <div className="coverage-block">
            {coverage ? (
              <div
                className="coverage"
                title="Date coverage detected from your uploaded files"
              >
                <span className="dot" />
                <span className="label">Coverage:</span>
                <span className="range">
                  {formatYMD(coverage.start)} → {formatYMD(coverage.end)}
                </span>
              </div>
            ) : (
              <span>Coverage: —</span>
            )}
          </div>
          <div className="filters-meta">
            <span>Showing:</span>
            <span className="filters-range">{rangeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
