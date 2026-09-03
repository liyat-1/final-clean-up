import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  COLORS,
  compact,
  dayLabel,
  n0,
  pct,
  type DayRecord,
} from "@/lib/directful";

export type SeriesKey = "now" | "starting" | "l1" | "l2" | "missed";

export const SERIES: { id: SeriesKey; label: string; color: string }[] = [
  { id: "now", label: "Guests you can reach", color: COLORS.l2 },
  { id: "starting", label: "Starting point", color: COLORS.starting },
  { id: "l1", label: "Added by Level 1", color: COLORS.l1 },
  { id: "l2", label: "Added by Level 2", color: COLORS.opportunity },
  { id: "missed", label: "Missed opportunities", color: COLORS.missed },
];

function valueOf(d: DayRecord, k: SeriesKey): number {
  const l1 = d.cleanup.guests + d.whois.guests;
  const l2 = d.journey.guests + d.staff.guests + d.idScan.guests;
  switch (k) {
    case "starting":
      return d.starting.guests;
    case "l1":
      return l1;
    case "l2":
      return l2;
    case "missed":
      return d.missed;
    default:
      return d.starting.guests + l1 + l2;
  }
}

type Point = { label: string; values: Record<SeriesKey, number> };

function bucketize(series: DayRecord[], groups: number): Point[] {
  if (!series.length) return [];
  const size = Math.ceil(series.length / groups);
  const out: Point[] = [];
  for (let i = 0; i < series.length; i += size) {
    const chunk = series.slice(i, i + size);
    const values = {} as Record<SeriesKey, number>;
    for (const s of SERIES) values[s.id] = chunk.reduce((a, d) => a + valueOf(d, s.id), 0);
    const first = chunk[0]!;
    const last = chunk[chunk.length - 1]!;
    out.push({
      label: size === 1 ? dayLabel(first.date) : `${dayLabel(first.date)}–${dayLabel(last.date)}`,
      values,
    });
  }
  return out;
}

const W = 1000;
const H = 400;
const TOP = 24;
const BOTTOM = 300;
const LEFT = 70;
const RIGHT = W - 20;

function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
  return out;
}

export function GrowthOverTime({
  series,
  comparison,
  compareLabel,
  rangeLabelText,
}: {
  series: DayRecord[];
  comparison: DayRecord[] | null;
  compareLabel: string;
  rangeLabelText: string;
}) {
  const [picked, setPicked] = useState<SeriesKey[]>(["now", "starting"]);
  const [hover, setHover] = useState<number | null>(null);

  const groups = Math.min(12, Math.max(1, series.length));
  const points = useMemo(() => bucketize(series, groups), [series, groups]);
  const comparePoints = useMemo(
    () => (comparison ? bucketize(comparison, groups) : null),
    [comparison, groups],
  );

  const active = SERIES.filter((s) => picked.includes(s.id));
  const max = Math.max(
    1,
    ...points.flatMap((p) => active.map((s) => p.values[s.id])),
    ...(comparePoints ?? []).flatMap((p) => active.map((s) => p.values[s.id])),
  );
  const ticks = niceTicks(max * 1.1);
  const y = (v: number) =>
    Math.round((BOTTOM - (v / (ticks[ticks.length - 1] || 1)) * (BOTTOM - TOP)) * 100) / 100;
  const slot = (RIGHT - LEFT) / Math.max(1, points.length);
  const cx = (i: number) => Math.round((LEFT + slot * i + slot / 2) * 100) / 100;

  const toggle = (k: SeriesKey) =>
    setPicked((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));

  const hovered = hover != null ? points[hover] : null;
  const hoveredCompare = hover != null && comparePoints ? comparePoints[hover] : null;

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={picked.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
            <span
              className="size-2.5 rounded-full"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{s.label}</span>
          </label>
        ))}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Guests you can reach over time"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={LEFT}
                y1={y(v)}
                x2={RIGHT}
                y2={y(v)}
                stroke="var(--border)"
                strokeOpacity={v === 0 ? 1 : 0.5}
              />
              <text
                x={LEFT - 10}
                y={y(v) + 4}
                textAnchor="end"
                className="num"
                fill="var(--muted-foreground)"
                fontSize="12"
              >
                {compact(v)}
              </text>
            </g>
          ))}

          {/* series */}
          {comparePoints
            ? points.map((p, i) => {
                const bars = active.flatMap((s) => [
                  { key: `${s.id}-cur`, v: p.values[s.id], color: s.color, op: 1 },
                  {
                    key: `${s.id}-cmp`,
                    v: comparePoints[i]?.values[s.id] ?? 0,
                    color: s.color,
                    op: 0.38,
                  },
                ]);
                const inner = slot * 0.72;
                const bw = inner / bars.length;
                const x0 = LEFT + slot * i + (slot - inner) / 2;
                return (
                  <g key={p.label + i}>
                    {bars.map((b, bi) => (
                      <rect
                        key={b.key}
                        x={x0 + bw * bi}
                        y={y(b.v)}
                        width={Math.max(2, bw - 2)}
                        height={Math.max(1, BOTTOM - y(b.v))}
                        rx="3"
                        fill={b.color}
                        fillOpacity={b.op}
                      />
                    ))}
                  </g>
                );
              })
            : active.map((s) => (
                <g key={s.id}>
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    points={points.map((p, i) => `${cx(i)},${y(p.values[s.id])}`).join(" ")}
                  />
                  {points.map((p, i) => (
                    <circle
                      key={`${s.id}-${i}`}
                      cx={cx(i)}
                      cy={y(p.values[s.id])}
                      r={hover === i ? 5 : 3}
                      fill={s.color}
                    />
                  ))}
                </g>
              ))}

          {/* x axis labels */}
          <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke="var(--border)" />
          {points.map((p, i) => (
            <text
              key={`lbl-${i}`}
              x={cx(i)}
              y={BOTTOM + 22}
              textAnchor="end"
              fill="var(--muted-foreground)"
              fontSize="12"
              transform={`rotate(-35 ${cx(i)} ${BOTTOM + 22})`}
            >
              {p.label}
            </text>
          ))}

          {/* hover targets */}
          {points.map((p, i) => (
            <rect
              key={`hit-${i}`}
              x={LEFT + slot * i}
              y={TOP}
              width={slot}
              height={BOTTOM - TOP}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {hover != null && (
            <line
              x1={cx(hover)}
              y1={TOP}
              x2={cx(hover)}
              y2={BOTTOM}
              stroke="var(--muted-foreground)"
              strokeOpacity="0.3"
            />
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-64 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg"
            style={{
              left: `${Math.min(72, Math.max(2, ((cx(hover!) + 20) / W) * 100))}%`,
            }}
          >
            <p className="font-semibold">{hovered.label}</p>
            <div className="mt-2 space-y-2">
              {active.map((s) => {
                const cur = hovered.values[s.id];
                const prev = hoveredCompare?.values[s.id];
                const diff = prev == null ? null : cur - prev;
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: s.color }}
                          aria-hidden="true"
                        />
                        {s.label}
                      </span>
                      <span className="num font-semibold">{n0(cur)}</span>
                    </div>
                    {prev != null && (
                      <div className="flex items-center justify-between gap-3 pl-4 text-muted-foreground">
                        <span>{compareLabel}</span>
                        <span className="num">
                          {n0(prev)} · {diff! >= 0 ? "+" : ""}
                          {n0(diff!)} ({pct(prev ? diff! / prev : 0)})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        {rangeLabelText}
        {comparePoints ? ` · compared with ${compareLabel.toLowerCase()}` : ""}
      </p>
    </div>
  );
}
