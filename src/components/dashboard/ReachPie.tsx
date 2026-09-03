import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ALL_FIELDS,
  COLORS,
  FIELDS,
  FIELD_COLOR,
  LEAF_LABEL,
  compact,
  details,
  n0,
  share,
  type FieldKey,
  type Guest,
  type LeafKey,
  type Totals,
  type FieldStatus,
} from "@/lib/directful";

export type LevelKey = "l1" | "l2";
export type ViewState = "now" | "start";

type Slice = { key: string; label: string; hint: string; value: number; color: string };

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  const rd = (v: number) => Math.round(v * 1000) / 1000;
  return { x: rd(cx + r * Math.cos(a)), y: rd(cy + r * Math.sin(a)) };
}

function arc(cx: number, cy: number, r: number, thick: number, a0: number, a1: number) {
  const ri = r - thick;
  const large = a1 - a0 > 180 ? 1 : 0;
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const p2 = polar(cx, cy, ri, a1);
  const p3 = polar(cx, cy, ri, a0);
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
}

function Donut({
  slices,
  centerValue,
  centerLabel,
  centerNote,
  onPick,
  size = 300,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  centerNote: string;
  onPick?: (key: string) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<Slice | null>(null);
  const total = Math.max(
    slices.reduce((a, s) => a + Math.max(0, s.value), 0),
    1,
  );
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const thick = size * 0.2;

  let acc = 0;
  const rendered = slices.map((s) => {
    const a0 = (acc / total) * 360;
    acc += Math.max(0, s.value);
    return { ...s, a0, a1: (acc / total) * 360 };
  });

  const c = hover;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[330px]" role="img" aria-label={centerLabel}>
      {rendered.map((s) => {
        if (s.value <= 0) return null;
        const a0 = Math.min(s.a0 + 0.5, 359.5);
        const a1 = Math.min(Math.max(s.a1 - 0.5, a0 + 0.3), 360);
        const active = hover?.key === s.key;
        return (
          <path
            key={s.key}
            d={arc(cx, cy, active ? r : r - 3, thick, a0, a1)}
            fill={s.color}
            fillOpacity={hover && !active ? 0.45 : 1}
            stroke="var(--background)"
            strokeWidth="1.5"
            className={onPick ? "cursor-pointer transition-opacity" : "transition-opacity"}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.(s.key)}
          />
        );
      })}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        className="num pointer-events-none"
        fill="var(--foreground)"
        fontSize={size * 0.13}
        fontWeight="700"
      >
        {c ? compact(c.value) : centerValue}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="pointer-events-none"
        fill="var(--muted-foreground)"
        fontSize={size * 0.045}
      >
        {c ? c.label : centerLabel}
      </text>
      <text
        x={cx}
        y={cy + 34}
        textAnchor="middle"
        className="pointer-events-none"
        fill="var(--muted-foreground)"
        fontSize={size * 0.04}
      >
        {c ? c.hint : centerNote}
      </text>
    </svg>
  );
}

function statusText(s: FieldStatus, via?: LeafKey) {
  if (s === "start") return "Already reachable at your starting point";
  if (s === "l1") return `Became reachable with Level 1${via ? ` · ${LEAF_LABEL[via]}` : ""}`;
  if (s === "l2") return `Became reachable with Level 2${via ? ` · ${LEAF_LABEL[via]}` : ""}`;
  return "Not reachable yet";
}

function Row({
  color,
  title,
  note,
  value,
  onClick,
}: {
  color?: string;
  title: string;
  note?: string;
  value: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={`flex w-full items-start gap-2.5 rounded-xl border border-border bg-surface-2/50 px-3 py-2.5 text-left ${
        onClick ? "hover:border-primary/50 hover:bg-surface-2" : ""
      }`}
    >
      {color && <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="num text-sm font-bold">{value}</span>
        </span>
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </span>
      {onClick && <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />}
    </Tag>
  );
}

export function ReachPie({
  t,
  view,
  level,
  guests,
  hasL2,
  path,
  onPath,
}: {
  t: Totals;
  view: ViewState;
  level: LevelKey;
  guests: Guest[];
  hasL2: boolean;
  path: string[];
  onPath: (p: string[]) => void;
}) {
  const levelBucket = level === "l1" ? t.l1 : t.l2;
  const activeField = path[1] as FieldKey | undefined;
  const guestId = path[2];

  const rootSlices: Slice[] = useMemo(() => {
    if (view === "start") {
      return [
        {
          key: "start",
          label: "Reachable at your starting point",
          hint: `${share(t.starting.guests, t.bookings)} of all bookings`,
          value: t.starting.guests,
          color: COLORS.starting,
        },
        {
          key: "rest",
          label: "Not reachable back then",
          hint: "Before Directful started",
          value: Math.max(0, t.bookings - t.starting.guests),
          color: COLORS.opportunity,
        },
      ];
    }
    const out: Slice[] = [
      {
        key: "start",
        label: "Reachable at your starting point",
        hint: "You already had these",
        value: t.starting.guests,
        color: COLORS.starting,
      },
      {
        key: "l1",
        label: "Level 1 — guests made reachable",
        hint: "Click to see email, phone, address",
        value: t.l1.guests,
        color: COLORS.l1,
      },
    ];
    if (hasL2)
      out.push({
        key: "l2",
        label: "Level 2 — extra guests made reachable",
        hint: "Click to see email, phone, address",
        value: t.l2.guests,
        color: COLORS.l2,
      });
    out.push(
      {
        key: "remaining",
        label: "Remaining opportunity",
        hint: "Guests you could still reach",
        value: t.remaining,
        color: COLORS.opportunity,
      },
      {
        key: "missed",
        label: "Missed opportunities",
        hint: "Can no longer be recovered",
        value: t.missed,
        color: COLORS.missed,
      },
    );
    return out;
  }, [t, view, hasL2]);

  const contactSlices = (b: typeof t.l1): Slice[] =>
    FIELDS.map((f) => ({
      key: f.id,
      label: f.label,
      hint: f.plain,
      value: b[f.id],
      color: FIELD_COLOR[f.id],
    }));

  const bucketForPath = view === "start" ? t.starting : path[0] === "l2" ? t.l2 : t.l1;
  const depth = path.length;

  const fieldBase = view === "start" ? t.starting : t.now;
  const fieldSlices = (f: FieldKey): Slice[] => {
    const label = FIELDS.find((x) => x.id === f)!.label.toLowerCase();
    const reachable = fieldBase[f];
    return [
      {
        key: "have",
        label: `Guests you can ${label === "address" ? "reach by post" : label === "phone" ? "call" : "email"}`,
        hint: `${share(reachable, t.bookings)} of all bookings`,
        value: reachable,
        color: FIELD_COLOR[f],
      },
      {
        key: "missing",
        label: `Guests you cannot ${label === "address" ? "reach by post" : label === "phone" ? "call" : "email"}`,
        hint: "No usable detail on file",
        value: Math.max(0, t.bookings - reachable),
        color: COLORS.opportunity,
      },
    ];
  };


  const crumbs = [
    { label: "Guests you can reach", to: [] as string[] },
    ...(depth > 0
      ? [
          {
            label:
              path[0] === "l1"
                ? "Level 1"
                : path[0] === "l2"
                  ? "Level 2"
                  : path[0] === "start"
                    ? "Starting point"
                    : "Details",
            to: [path[0]!],
          },
        ]
      : []),
    ...(depth > 1 ? [{ label: FIELDS.find((f) => f.id === activeField)?.label ?? "", to: path.slice(0, 2) }] : []),
    ...(depth > 2 ? [{ label: guests.find((g) => g.id === guestId)?.name ?? "Guest", to: path.slice(0, 3) }] : []),
  ];

  const matching = useMemo(() => {
    if (!activeField) return [];
    const want: FieldStatus = view === "start" ? "start" : path[0] === "l2" ? "l2" : "l1";
    return guests.filter((g) => g.fields[activeField].status === want);
  }, [guests, activeField, path, view]);

  const guest = guests.find((g) => g.id === guestId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]">
      <div className="flex flex-col items-center">
        <nav className="mb-2 flex flex-wrap items-center gap-1 self-start text-xs text-muted-foreground">
          {depth > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => onPath(path.slice(0, -1))}
            >
              <ChevronLeft className="size-3.5" /> Back
            </Button>
          )}
          {crumbs.map((c, i) => (
            <span key={c.label + i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-50">/</span>}
              <button
                type="button"
                onClick={() => onPath(c.to)}
                className={i === crumbs.length - 1 ? "font-semibold text-foreground" : "hover:text-foreground"}
              >
                {c.label}
              </button>
            </span>
          ))}
        </nav>

        {depth === 0 ? (
          <Donut
            slices={rootSlices}
            centerValue={compact(view === "start" ? t.starting.guests : t.now.guests)}
            centerLabel={view === "start" ? "reachable at the start" : "guests you can reach"}
            centerNote={`${share(view === "start" ? t.starting.guests : t.now.guests, t.bookings)} of ${compact(t.bookings)} bookings`}
            onPick={(k) => (k === "l1" || k === "l2" || k === "start" ? onPath([k]) : undefined)}
          />
        ) : (
          <Donut
            slices={contactSlices(bucketForPath)}
            centerValue={compact(bucketForPath.guests)}
            centerLabel={
              view === "start"
                ? "reachable at the start"
                : path[0] === "l2"
                  ? "guests added by Level 2"
                  : "guests added by Level 1"
            }
            centerNote={`${n0(details(bucketForPath))} contact details`}
            onPick={(k) => onPath([path[0]!, k])}
          />
        )}

        <p className="mt-3 max-w-[340px] text-center text-xs text-muted-foreground">
          {depth === 0
            ? "Click a slice to see what kind of guest information became reachable."
            : depth === 1
              ? "Click email, phone or address to see the guests behind the number."
              : "Pick a guest to see exactly what changed for them."}
        </p>
      </div>

      <div className="space-y-2">
        {depth === 0 &&
          rootSlices.map((s) => (
            <Row
              key={s.key}
              color={s.color}
              title={s.label}
              note={`${n0(s.value)} guests · ${share(s.value, t.bookings)} of all bookings`}
              value={compact(s.value)}
              {...(s.key === "l1" || s.key === "l2" || s.key === "start"
                ? { onClick: () => onPath([s.key]) }
                : {})}
            />
          ))}

        {depth === 1 && (
          <>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What kind of information became reachable
            </p>
            {ALL_FIELDS.map((f) => (
              <Row
                key={f}
                color={FIELD_COLOR[f]}
                title={FIELDS.find((x) => x.id === f)!.label}
                note={FIELDS.find((x) => x.id === f)!.plain}
                value={n0(bucketForPath[f])}
                onClick={() => onPath([path[0]!, f])}
              />
            ))}
            <p className="px-1 text-xs text-muted-foreground">
              {n0(bucketForPath.guests)} unique guests · {n0(details(bucketForPath))} contact details.
              One guest can have more than one detail.
            </p>
            <details className="rounded-xl border border-dashed border-border p-3 text-xs">
              <summary className="cursor-pointer font-semibold">See details of how it happened</summary>
              <ul className="mt-2 space-y-1">
                {(path[0] === "l2"
                  ? (["journey", "staff", "idScan"] as LeafKey[])
                  : (["cleanup", "whois"] as LeafKey[])
                ).map((k) => (
                  <li key={k} className="flex justify-between gap-3 text-muted-foreground">
                    <span>{LEAF_LABEL[k]}</span>
                    <span className="num">{n0(t.leaves[k].guests)} guests</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        {depth === 2 && (
          <>
            <p className="text-sm font-semibold">
              {n0(bucketForPath[activeField!])} newly reachable{" "}
              {FIELDS.find((f) => f.id === activeField)?.label.toLowerCase()} details
            </p>
            <p className="text-xs text-muted-foreground">
              A sample of the guests behind this number.
            </p>
            <ul className="max-h-[360px] space-y-1.5 overflow-auto pr-1">
              {matching.slice(0, 25).map((g) => (
                <li key={g.id}>
                  <Row
                    title={g.name}
                    note={`${g.property} · stay ${g.stay}`}
                    value=""
                    onClick={() => onPath([path[0]!, activeField!, g.id])}
                  />
                </li>
              ))}
              {!matching.length && (
                <li className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No guest records for this selection. Try another date range or property.
                </li>
              )}
            </ul>
          </>
        )}

        {depth === 3 && guest && (
          <div className="space-y-3 rounded-xl border border-border bg-surface-2/60 p-4">
            <div>
              <p className="text-base font-semibold">{guest.name}</p>
              <p className="text-xs text-muted-foreground">
                {guest.property} · {guest.country} · stay {guest.stay}
              </p>
            </div>
            {ALL_FIELDS.map((f) => {
              const info = guest.fields[f];
              return (
                <div key={f} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{FIELDS.find((x) => x.id === f)!.label}</span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          info.status === "none"
                            ? "var(--muted-foreground)"
                            : info.status === "l2"
                              ? COLORS.l2
                              : info.status === "l1"
                                ? COLORS.l1
                                : "var(--foreground)",
                      }}
                    >
                      {info.status === "none" ? "Not reachable" : "Reachable"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{statusText(info.status, info.via)}</p>
                  {info.value && <p className="num text-xs text-foreground/80">{info.value}</p>}
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {(["start", "l1", "l2"] as const).map((stage) => (
                <div key={stage} className="rounded-lg bg-background p-2">
                  <p className="font-semibold">
                    {stage === "start" ? "Starting point" : stage === "l1" ? "After Level 1" : "After Level 2"}
                  </p>
                  <p className="num text-muted-foreground">
                    {
                      ALL_FIELDS.filter((f) => {
                        const s = guest.fields[f].status;
                        if (stage === "start") return s === "start";
                        if (stage === "l1") return s === "start" || s === "l1";
                        return s !== "none";
                      }).length
                    }{" "}
                    of 3 reachable
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
