import { useMemo, useState } from "react";

import {
  COLORS,
  FIELDS,
  FIELD_COLOR,
  LEVEL_LABEL,
  compact,
  dayBucket,
  dayLabel,
  n0,
  pct,
  type DayRecord,
  type Focus,
  type Plan,
} from "@/lib/directful";

type Line = { id: string; label: string; color: string; value: (d: DayRecord) => number };

function remainingOf(d: DayRecord) {
  const now = dayBucket(d, "now").guests;
  return Math.max(0, d.bookings - now - d.missed);
}

/** The graph never has its own controls — it always mirrors the pie selection. */
export function linesFor(focus: Focus, plan: Plan): { lines: Line[]; caption: string } {
  const { view, level, field } = focus;

  if (view === "start") {
    return {
      caption: "Before Directful: every booking was an opportunity, none were reachable.",
      lines: [
        {
          id: "bookings",
          label: "Bookings — all opportunity",
          color: COLORS.opportunity,
          value: (d) => d.bookings,
        },
        {
          id: "start",
          label: "Guests you could reach",
          color: COLORS.starting,
          value: () => 0,
        },
      ],
    };
  }

  if (level && field) {
    const label = FIELDS.find((f) => f.id === field)!.label;
    return {
      caption: `${label} reachability over time, from ${LEVEL_LABEL[level]}.`,
      lines: [
        {
          id: "made",
          label: `${label} made reachable`,
          color: FIELD_COLOR[field],
          value: (d) => dayBucket(d, level)[field],
        },
        {
          id: "open",
          label: `${label} still not reachable`,
          color: COLORS.opportunity,
          value: (d) => Math.max(0, d.bookings - dayBucket(d, "now")[field]),
        },
      ],
    };
  }

  if (level) {
    return {
      caption: `What ${LEVEL_LABEL[level]} made reachable, broken down by contact detail.`,
      lines: [
        ...FIELDS.map((f) => ({
          id: f.id,
          label: f.label,
          color: FIELD_COLOR[f.id],
          value: (d: DayRecord) => dayBucket(d, level)[f.id],
        })),
        {
          id: "total",
          label: `Total guests from ${LEVEL_LABEL[level]}`,
          color: level === "l1" ? COLORS.l1 : COLORS.l2,
          value: (d: DayRecord) => dayBucket(d, level).guests,
        },
      ],
    };
  }

  if (plan === "l1") {
    return {
      caption: "How Level 1 is performing, next to what is still out of reach.",
      lines: [
        {
          id: "l1",
          label: "Guests made reachable by Level 1",
          color: COLORS.l1,
          value: (d) => dayBucket(d, "l1").guests,
        },
        {
          id: "remaining",
          label: "Remaining opportunity",
          color: COLORS.opportunity,
          value: remainingOf,
        },
      ],
    };
  }

  return {
    caption: "Level 1 and Level 2 side by side, with everything you can reach today.",
    lines: [
      {
        id: "l1",
        label: "Added by Level 1",
        color: COLORS.l1,
        value: (d) => dayBucket(d, "l1").guests,
      },
      {
        id: "l2",
        label: "Added by Level 2",
        color: COLORS.l2,
        value: (d) => dayBucket(d, "l2").guests,
      },
      {
        id: "now",
        label: "Guests you can reach",
        color: COLORS.starting,
        value: (d) => dayBucket(d, "now").guests,
      },
    ],
  };
}

type Point = { label: string; values: Record<string, number> };

function bucketize(series: DayRecord[], groups: number, lines: Line[]): Point[] {
  if (!series.length) return [];
  const size = Math.ceil(series.length / groups);
  const out: Point[] = [];
  for (let i = 0; i < series.length; i += size) {
    const chunk = series.slice(i, i + size);
    const values: Record<string, number> = {};
    for (const l of lines) values[l.id] = chunk.reduce((a, d) => a + l.value(d), 0);
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
  const out: number[] = [0];
  // Always overshoot the max so the tallest bar/line stays inside the plot area.
  while (out[out.length - 1]! < max) out.push(out[out.length - 1]! + step);
  return out;
}

export function GrowthOverTime({
  series,
  comparison,
  compareLabel,
  rangeLabelText,
  focus,
  plan,
}: {
  series: DayRecord[];
  comparison: DayRecord[] | null;
  compareLabel: string;
  rangeLabelText: string;
  focus: Focus;
  plan: Plan;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { lines, caption } = useMemo(() => linesFor(focus, plan), [focus, plan]);

  // Short ranges keep one point per day so the axis reads "day by day";
  // longer ranges group into at most 12 even buckets.
  const groups = series.length <= 16 ? Math.max(1, series.length) : 12;
  const points = useMemo(() => bucketize(series, groups, lines), [series, groups, lines]);
  const comparePoints = useMemo(
    () => (comparison ? bucketize(comparison, groups, lines) : null),
    [comparison, groups, lines],
  );

  const max = Math.max(
    1,
    ...points.flatMap((p) => lines.map((s) => p.values[s.id] ?? 0)),
    ...(comparePoints ?? []).flatMap((p) => lines.map((s) => p.values[s.id] ?? 0)),
  );
  const ticks = niceTicks(max * 1.1);
  const y = (v: number) =>
    Math.round((BOTTOM - (v / (ticks[ticks.length - 1] || 1)) * (BOTTOM - TOP)) * 100) / 100;
  const slot = (RIGHT - LEFT) / Math.max(1, points.length);
  const cx = (i: number) => Math.round((LEFT + slot * i + slot / 2) * 100) / 100;

  const hovered = hover != null ? points[hover] : null;
  const hoveredCompare = hover != null && comparePoints ? comparePoints[hover] : null;

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lines.map((s) => (
          <span key={s.id} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{s.label}</span>
          </span>
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

          {comparePoints
            ? points.map((p, i) => {
                const bars = lines.flatMap((s) => [
                  { key: `${s.id}-cur`, v: p.values[s.id] ?? 0, color: s.color, op: 1 },
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
            : lines.map((s) => (
                <g key={s.id}>
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    points={points.map((p, i) => `${cx(i)},${y(p.values[s.id] ?? 0)}`).join(" ")}
                  />
                  {points.map((p, i) => (
                    <circle
                      key={`${s.id}-${i}`}
                      cx={cx(i)}
                      cy={y(p.values[s.id] ?? 0)}
                      r={hover === i ? 5 : 3}
                      fill={s.color}
                    />
                  ))}
                </g>
              ))}

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
            style={{ left: `${Math.min(72, Math.max(2, ((cx(hover!) + 20) / W) * 100))}%` }}
          >
            <p className="font-semibold">{hovered.label}</p>
            <div className="mt-2 space-y-2">
              {lines.map((s) => {
                const cur = hovered.values[s.id] ?? 0;
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
        {caption} {rangeLabelText}
        {comparePoints ? ` · compared with ${compareLabel.toLowerCase()}` : ""}
      </p>
    </div>
  );
}
