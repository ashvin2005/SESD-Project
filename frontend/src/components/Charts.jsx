/**
 * Pure SVG chart components — no external dependencies.
 * BarChart | DonutChart | LineChart
 */

// ─── BarChart ────────────────────────────────────────────────────────────────
export function BarChart({ data = [], bars = [], height = 220, title }) {
  if (!data.length) return <Empty label={title} />;

  const W = 600, H = height, PAD = { top: 20, right: 16, bottom: 56, left: 60 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => bars.map((b) => d[b.key] || 0));
  const maxVal  = Math.max(...allVals, 1);
  const gridLines = 4;
  const scale   = (v) => innerH - (v / maxVal) * innerH;

  const groupW      = innerW / data.length;
  const barW        = Math.min(20, (groupW / bars.length) - 6);
  const groupOffset = (i) => PAD.left + i * groupW + groupW / 2 - (bars.length * (barW + 5)) / 2;

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

  return (
    <div>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#9e9894', marginBottom: 8 }}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y   = PAD.top + (i / gridLines) * innerH;
          const val = maxVal * (1 - i / gridLines);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#1e1e1e" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6a6460">{fmt(val)}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, gi) =>
          bars.map((b, bi) => {
            const val  = d[b.key] || 0;
            const barH = (val / maxVal) * innerH;
            const x    = groupOffset(gi) + bi * (barW + 5);
            const y    = PAD.top + scale(val);
            return (
              <g key={`${gi}-${bi}`}>
                <rect x={x} y={y} width={barW} height={barH} fill={b.color} rx="3" opacity="0.85" />
                <title>{`${d.label} ${b.label}: ${val.toLocaleString()}`}</title>
              </g>
            );
          })
        )}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={PAD.left + i * groupW + groupW / 2} y={H - PAD.bottom + 16}
            textAnchor="middle" fontSize="10" fill="#6a6460">{d.label}</text>
        ))}

        {/* Legend */}
        {bars.map((b, i) => (
          <g key={b.key} transform={`translate(${PAD.left + i * 88}, ${H - 12})`}>
            <rect width="8" height="8" fill={b.color} rx="2" />
            <text x="12" y="8" fontSize="10" fill="#6a6460">{b.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────
export function DonutChart({ data = [], title, total }) {
  if (!data.length) return <Empty label={title} />;

  const R = 78, CX = 108, CY = 108, strokeW = 26;
  const circumference = 2 * Math.PI * R;
  const totalVal = total || data.reduce((s, d) => s + d.value, 0);

  let cumulative = 0;
  const slices = data.map((d) => {
    const frac  = totalVal > 0 ? d.value / totalVal : 0;
    const dash  = frac * circumference;
    const offset = circumference - cumulative * circumference;
    cumulative += frac;
    return { ...d, dash, gap: circumference - dash, offset };
  });

  const fmt = () => totalVal >= 100000
    ? `₹${(totalVal / 100000).toFixed(1)}L`
    : `₹${totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#9e9894', marginBottom: 8 }}>{title}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <svg viewBox="0 0 216 216" style={{ width: 152, flexShrink: 0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#222222" strokeWidth={strokeW} />
          {slices.map((s, i) => (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none"
              stroke={s.color} strokeWidth={strokeW}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              style={{ transition: 'stroke-dasharray 0.4s' }}>
              <title>{s.label}: {s.value?.toLocaleString()} ({totalVal > 0 ? Math.round(s.value / totalVal * 100) : 0}%)</title>
            </circle>
          ))}
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize="10" fill="#9e9894">Total</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="14" fontWeight="700" fill="#f0ede8">{fmt()}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 110 }}>
          {data.slice(0, 8).map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, color: '#9e9894', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.label}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f0ede8' }}>
                {totalVal > 0 ? Math.round(d.value / totalVal * 100) : 0}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────
export function LineChart({ data = [], color = '#c17f59', title, unit = '' }) {
  if (!data.length) return <Empty label={title} />;

  const W = 600, H = 180, PAD = { top: 16, right: 16, bottom: 40, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const vals   = data.map((d) => d.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals, minVal + 1);
  const range  = maxVal - minVal || 1;

  const px = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const py = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH;

  const points     = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const areaPoints = `${PAD.left},${PAD.top + innerH} ${points} ${PAD.left + innerW},${PAD.top + innerH}`;

  return (
    <div>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: '#9e9894', marginBottom: 8 }}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <polygon points={areaPoints} fill={color} opacity="0.07" />
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y   = PAD.top + innerH * (1 - frac);
          const val = minVal + range * frac;
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#1e1e1e" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#6a6460">
                {val.toFixed(0)}{unit}
              </text>
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.value)} r="3.5" fill={color} stroke="#111111" strokeWidth="2">
            <title>{d.label}: {d.value}{unit}</title>
          </circle>
        ))}
        {data.map((d, i) => {
          if (data.length > 8 && i % 2 !== 0) return null;
          return (
            <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6a6460">{d.label}</text>
          );
        })}
      </svg>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: '#6a6460', fontSize: 13 }}>
      {label && <div style={{ fontWeight: 500, marginBottom: 4, color: '#9e9894' }}>{label}</div>}
      No data available yet
    </div>
  );
}
