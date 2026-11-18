/**
 * Lightweight, responsive SVG Charts with zero external dependencies.
 */

export function BarTrendChart({ data = [], valueKey = 'value', labelKey = 'label', color = '#3b82f6', height = 140 }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  const barWidth = data.length > 0 ? Math.floor(280 / data.length) : 20;

  return (
    <svg viewBox={`0 0 320 ${height + 26}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const barH = Math.max(3, Math.round((val / max) * (height - 16)));
        const x = 20 + i * barWidth + 4;
        const y = height - barH;
        const w = Math.max(8, barWidth - 8);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} rx={4} fill={color} opacity={val > 0 ? 0.9 : 0.25} />
            {val > 0 && (
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#e4e4e7" fontSize="9" fontWeight="600">
                {val}
              </text>
            )}
            <text x={x + w / 2} y={height + 16} textAnchor="middle" fill="#a1a1aa" fontSize="9">
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineScoreChart({ data = [], valueKey = 'score', labelKey = 'label', color = '#f59e0b', height = 130 }) {
  if (!data || data.length === 0) {
    return <div className="empty-state">Play at least 2 brain duels to see your score curve.</div>;
  }

  const max = Math.max(100, ...data.map((d) => Number(d[valueKey]) || 0));
  const stepX = data.length > 1 ? 280 / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const val = Number(d[valueKey]) || 0;
    const x = 20 + i * stepX;
    const y = height - 10 - Math.round((val / max) * (height - 26));
    return { x, y, val, label: d[labelKey] };
  });

  const poly = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 320 ${height + 20}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1="16" y1={height - 10} x2="304" y2={height - 10} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {points.length > 1 && (
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={poly} />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} />
          <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#fafafa" fontSize="8.5" fontWeight="700">
            {p.val}
          </text>
          <text x={p.x} y={height + 10} textAnchor="middle" fill="#a1a1aa" fontSize="8">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DomainMasteryBars({ domains = [] }) {
  const max = Math.max(100, ...domains.map((d) => d.avgScore || 0));
  return (
    <div>
      {domains.map((d) => (
        <div key={d.domain} style={{ marginBottom: 10 }}>
          <div className="inline-edit-row" style={{ justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
            <span><strong>{d.domain}</strong> ({d.plays} plays)</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{d.avgScore} avg · {d.bestScore} best</span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.round(((d.avgScore || 0) / max) * 100))}%`,
                background: d.avgScore > 0 ? 'linear-gradient(90deg, #3b82f6, #10b981)' : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
