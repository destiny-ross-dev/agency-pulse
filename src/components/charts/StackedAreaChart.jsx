const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#f97316",
  "#22c55e",
  "#0ea5e9",
  "#facc15",
  "#14b8a6",
];

function buildAreaPath(pointsTop, pointsBottom) {
  if (pointsTop.length === 0) return "";
  const path = [];
  path.push(`M ${pointsTop[0].x} ${pointsTop[0].y}`);
  for (const pt of pointsTop.slice(1)) {
    path.push(`L ${pt.x} ${pt.y}`);
  }
  for (const pt of pointsBottom.slice().reverse()) {
    path.push(`L ${pt.x} ${pt.y}`);
  }
  path.push("Z");
  return path.join(" ");
}

function formatMoneyShort(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export default function StackedAreaChart({ series, height = 240 }) {
  const buckets = series?.buckets || [];
  const agents = series?.agents || [];

  if (buckets.length === 0 || agents.length === 0) {
    return (
      <div className="chart-empty">
        No issued premium data available for this date range.
      </div>
    );
  }

  const width = 720;
  const padding = { top: 16, right: 18, bottom: 40, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTotal = Math.max(...buckets.map((b) => b.total || 0), 1);
  const bucketCount = buckets.length;

  const xForIndex = (index) => {
    if (bucketCount === 1) return padding.left + chartWidth / 2;
    return padding.left + (chartWidth * index) / (bucketCount - 1);
  };

  const yForValue = (value) => {
    const ratio = value / maxTotal;
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const stacks = agents.map(() => []);
  const bottoms = agents.map(() => []);

  for (let i = 0; i < bucketCount; i += 1) {
    let offset = 0;
    for (let a = 0; a < agents.length; a += 1) {
      const agent = agents[a];
      const value = buckets[i].totals?.[agent] || 0;
      const bottom = offset;
      const top = offset + value;
      stacks[a].push({ x: xForIndex(i), y: yForValue(top) });
      bottoms[a].push({ x: xForIndex(i), y: yForValue(bottom) });
      offset = top;
    }
  }

  const tickStep =
    bucketCount <= 8 ? 1 : bucketCount <= 16 ? 2 : Math.ceil(bucketCount / 8);

  return (
    <div className="stacked-area">
      <div className="stacked-area-header">
        <div>
          <div className="chart-title">Issued Premium by Agent</div>
          <div className="chart-subtitle">
            Stacked totals per time period.
          </div>
        </div>
        <div className="chart-scale">
          <span>Max:</span> {formatMoneyShort(maxTotal)}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Issued premium stacked area chart"
        className="stacked-area-svg"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="#e2e8f0"
        />

        {[0.25, 0.5, 0.75].map((t) => {
          const y = yForValue(maxTotal * t);
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
              <text x={8} y={y + 4} fontSize="11" fill="#94a3b8">
                {formatMoneyShort(maxTotal * t)}
              </text>
            </g>
          );
        })}

        {agents.map((agent, index) => (
          <path
            key={agent}
            d={buildAreaPath(stacks[index], bottoms[index])}
            fill={COLORS[index % COLORS.length]}
            opacity={0.75}
          />
        ))}

        {buckets.map((bucket, index) => {
          if (index % tickStep !== 0) return null;
          const x = xForIndex(index);
          return (
            <text
              key={bucket.key}
              x={x}
              y={height - 14}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {bucket.label}
            </text>
          );
        })}
      </svg>
      <div className="stacked-area-legend">
        {agents.map((agent, index) => (
          <span key={agent} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {agent}
          </span>
        ))}
      </div>
    </div>
  );
}
