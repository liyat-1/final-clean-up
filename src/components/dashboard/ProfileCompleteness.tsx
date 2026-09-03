import {
  COLORS,
  FIELDS,
  FIELD_COLOR,
  completenessOf,
  n0,
  type Plan,
  type Totals,
} from "@/lib/directful";

const SIZE = 190;
const R = 78;
const C = 2 * Math.PI * R;

/** A stacked ring: every stage that contributed to a fuller guest profile. */
export function ProfileCompleteness({ t, plan }: { t: Totals; plan: Plan }) {
  const c = completenessOf(t);
  const parts = [
    { id: "start", label: "Already on file", value: c.start, color: COLORS.starting },
    { id: "l1", label: "Added by Level 1", value: c.l1, color: COLORS.l1 },
    ...(plan === "l2" ? [{ id: "l2", label: "Added by Level 2", value: c.l2, color: COLORS.l2 }] : []),
  ].filter((p) => p.value > 0);

  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Profile completeness">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
          />
          {parts.map((p) => {
            const dash = p.value * C;
            const offset = acc * C;
            acc += p.value;
            return (
              <circle
                key={p.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={p.color}
                strokeWidth="16"
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
          })}
          <text
            x={SIZE / 2}
            y={SIZE / 2 - 2}
            textAnchor="middle"
            className="num"
            fill="var(--foreground)"
            fontSize="34"
            fontWeight="700"
          >
            {Math.round(c.total * 100)}%
          </text>
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 20}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
          >
            complete
          </text>
        </svg>
      </div>

      <div className="min-w-[200px] flex-1 space-y-3">
        <div className="space-y-1.5">
          {parts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                {p.label}
              </span>
              <span className="num font-semibold">{Math.round(p.value * 100)}%</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-full bg-border" />
              Still empty
            </span>
            <span className="num font-semibold">{Math.round((1 - c.total) * 100)}%</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          {FIELDS.map((f) => {
            const pctOf = t.now.guests ? t.now[f.id] / t.now.guests : 0;
            return (
              <div key={f.id}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{f.plain}</span>
                  <span className="num font-semibold">{n0(t.now[f.id])}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pctOf * 100)}%`,
                      background: FIELD_COLOR[f.id],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
