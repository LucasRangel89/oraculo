"use client";

/**
 * Anel de score reutilizável (confiança global, similaridade no modal).
 * Cores: >=75 esmeralda · >=50 dourado · abaixo, indigo.
 */
interface ScoreRingProps {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}

export function ScoreRing({ value, size = 72, label, className }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;
  const color = clamped >= 75 ? "#34d399" : clamped >= 50 ? "#fbbf24" : "#818cf8";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${className ?? ""}`}
      role="img"
      aria-label={`${label ? label + ": " : ""}${clamped} de 100`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 600ms ease, stroke 300ms ease" }}
          />
          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            fontSize={size * 0.28}
            fontWeight={600}
            fill="#e2e8f0"
          >
            {clamped}
          </text>
        </svg>
      </div>
      {label ? (
        <span className="text-[11px] uppercase tracking-wider text-slate-400">
          {label}
        </span>
      ) : null}
    </div>
  );
}
