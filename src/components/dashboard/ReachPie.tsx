import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ALL_FIELDS,
  COLORS,
  FIELDS,
  FIELD_COLOR,
  FIELD_VERB,
  LEAF_LABEL,
  LEVEL2_POTENTIAL_RATE,
  LEVEL_LABEL,
  compact,
  details,
  levelBucket,
  n0,
  share,
  type FieldKey,
  type Focus,
  type Guest,
  type LeafKey,
  type LevelKey,
  type Plan,
  type Totals,
  type FieldStatus,
} from "@/lib/directful";

export type { LevelKey, ViewState } from "@/lib/directful";

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
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[330px]"
      role="img"
      aria-label={centerLabel}
    >
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
  if (s === "start") return "Not reachable when you started";
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
      {color && (
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
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
  guests,
  plan,
  focus,
  onFocus,
  guestId,
  onGuest,
}: {
  t: Totals;
  guests: Guest[];
  plan: Plan;
  focus: Focus;
  onFocus: (f: Focus) => void;
  guestId: string | null;
  onGuest: (id: string | null) => void;
}) {
  const { view, level, field } = focus;
  const bucket = levelBucket(t, level);
  const notReachable = Math.max(0, t.bookings - t.now.guests - t.missed);

  const rootSlices: Slice[] = useMemo(() => {
    if (view === "start") {
      return [
        {
          key: "rest",
          label: "Bookings — all still an opportunity",
          hint: "Nothing had been worked on yet",
          value: t.bookings,
          color: COLORS.opportunity,
        },
        {
          key: "start",
          label: "Guests you could reach",
          hint: "None — before Directful nothing was reachable",
          value: 0,
          color: COLORS.starting,
        },
      ];
    }
    if (plan === "l1") {
      return [
        {
          key: "l1",
          label: "Level 1 — guests made reachable",
          hint: "Click to see email, phone, address",
          value: t.l1.guests,
          color: COLORS.l1,
        },
        {
          key: "remaining",
          label: "Remaining opportunity",
          hint: "Guests still out of reach",
          value: Math.max(0, t.bookings - t.l1.guests),
          color: COLORS.opportunity,
        },
      ];
    }
    return [
      {
        key: "l1",
        label: "Level 1 — guests made reachable",
        hint: "Click to explore Level 1",
        value: t.l1.guests,
        color: COLORS.l1,
      },
      {
        key: "l2",
        label: "Level 2 — extra guests made reachable",
        hint: "Click to explore Level 2",
        value: t.l2.guests,
        color: COLORS.l2,
      },
      {
        key: "missed",
        label: "Missed opportunities",
        hint: "Can no longer be recovered",
        value: t.missed + notReachable,
        color: COLORS.missed,
      },
    ];
  }, [t, view, plan, notReachable]);

  const contactSlices: Slice[] = FIELDS.map((f) => ({
    key: f.id,
    label: f.label,
    hint: f.plain,
    value: bucket[f.id],
    color: FIELD_COLOR[f.id],
  }));

  const fieldSlices = (f: FieldKey): Slice[] => {
    const made = bucket[f];
    return [
      {
        key: "have",
        label: `Made reachable by ${LEVEL_LABEL[level ?? "l1"]}`,
        hint: `Guests you can ${FIELD_VERB[f]}`,
        value: made,
        color: FIELD_COLOR[f],
      },
      {
        key: "missing",
        label: "Still not reachable",
        hint: `No usable ${FIELDS.find((x) => x.id === f)!.label.toLowerCase()} on file`,
        value: Math.max(0, t.bookings - made),
        color: COLORS.opportunity,
      },
    ];
  };

  const matching = useMemo(() => {
    if (!field || !level) return [];
    return guests.filter((g) => g.fields[field].status === level);
  }, [guests, field, level]);

  const guest = guests.find((g) => g.id === guestId) ?? null;

  const crumbs = [
    { label: view === "start" ? "Starting point" : "Guests you can reach", focus: { view, level: null, field: null } as Focus },
    ...(level ? [{ label: LEVEL_LABEL[level], focus: { view, level, field: null } as Focus }] : []),
    ...(field && level
      ? [{ label: FIELDS.find((f) => f.id === field)!.label, focus: { view, level, field } as Focus }]
      : []),
  ];

  const back = () => {
    if (guest) return onGuest(null);
    if (field) return onFocus({ ...focus, field: null });
    if (level) return onFocus({ ...focus, level: null });
  };

  const potential = notReachable * LEVEL2_POTENTIAL_RATE;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center">
        <nav className="mb-2 flex flex-wrap items-center gap-1 self-start text-xs text-muted-foreground">
          {(level || field || guest) && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={back}>
              <ChevronLeft className="size-3.5" /> Back
            </Button>
          )}
          {crumbs.map((c, i) => (
            <span key={c.label + i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-50">/</span>}
              <button
                type="button"
                onClick={() => {
                  onGuest(null);
                  onFocus(c.focus);
                }}
                className={
                  i === crumbs.length - 1 && !guest
                    ? "font-semibold text-foreground"
                    : "hover:text-foreground"
                }
              >
                {c.label}
              </button>
            </span>
          ))}
          {guest && (
            <span className="flex items-center gap-1">
              <span className="opacity-50">/</span>
              <span className="font-semibold text-foreground">{guest.name}</span>
            </span>
          )}
        </nav>

        {!level || view === "start" ? (
          <Donut
            slices={rootSlices}
            centerValue={compact(view === "start" ? 0 : t.now.guests)}
            centerLabel={view === "start" ? "guests you could reach" : "guests you can reach"}
            centerNote={
              view === "start"
                ? `0% of ${compact(t.bookings)} bookings`
                : `${share(t.now.guests, t.bookings)} of ${compact(t.bookings)} bookings`
            }
            onPick={(k) =>
              view === "now" && (k === "l1" || k === "l2")
                ? onFocus({ ...focus, level: k, field: null })
                : undefined
            }
          />
        ) : !field ? (
          <Donut
            slices={contactSlices}
            centerValue={compact(bucket.guests)}
            centerLabel={`guests added by ${LEVEL_LABEL[level]}`}
            centerNote={`${n0(details(bucket))} contact details`}
            onPick={(k) => onFocus({ ...focus, field: k as FieldKey })}
          />
        ) : (
          <Donut
            slices={fieldSlices(field)}
            centerValue={compact(bucket[field])}
            centerLabel={`${FIELDS.find((f) => f.id === field)!.label.toLowerCase()} details added`}
            centerNote={`${LEVEL_LABEL[level]} · ${share(bucket[field], t.bookings)} of bookings`}
          />
        )}

        <p className="mt-3 max-w-[340px] text-center text-xs text-muted-foreground">
          {!level
            ? view === "start"
              ? "Before Directful none of these bookings were reachable — every one was an open opportunity."
              : "Click a slice to see what that package made reachable."
            : !field
              ? "Click email, phone or address to see the guests behind the number."
              : "Pick a guest below to see exactly what changed for them."}
        </p>
      </div>

      <div className="w-full space-y-2">
        {(!level || view === "start") && (
          <>
            {rootSlices.map((s) => (
              <Row
                key={s.key}
                color={s.color}
                title={s.label}
                note={`${n0(s.value)} guests · ${share(s.value, t.bookings)} of all bookings`}
                value={compact(s.value)}
                {...(view === "now" && (s.key === "l1" || s.key === "l2")
                  ? { onClick: () => onFocus({ ...focus, level: s.key as LevelKey, field: null }) }
                  : {})}
              />
            ))}
            {plan === "l1" && view === "now" && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="size-4" /> Level 2 could add {compact(potential)} more guests
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  About {Math.round(LEVEL2_POTENTIAL_RATE * 100)}% of the{" "}
                  {n0(notReachable)} guests still out of reach typically become reachable with
                  Level 2 enrichment.
                </p>
              </div>
            )}
          </>
        )}

        {level && view === "now" && !field && (
          <>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What {LEVEL_LABEL[level]} made reachable
            </p>
            {ALL_FIELDS.map((f) => (
              <Row
                key={f}
                color={FIELD_COLOR[f]}
                title={FIELDS.find((x) => x.id === f)!.label}
                note={FIELDS.find((x) => x.id === f)!.plain}
                value={n0(bucket[f])}
                onClick={() => onFocus({ ...focus, field: f })}
              />
            ))}
            <p className="px-1 text-xs text-muted-foreground">
              {n0(bucket.guests)} unique guests · {n0(details(bucket))} contact details. One guest
              can have more than one detail.
            </p>
          </>
        )}

        {level && view === "now" && field && !guest && (
          <>
            <p className="text-sm font-semibold">
              {n0(bucket[field])} {FIELDS.find((f) => f.id === field)!.label.toLowerCase()} details
              made reachable by {LEVEL_LABEL[level]}
            </p>
            <p className="text-xs text-muted-foreground">
              Guest by guest — a sample of the profiles behind this number.
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2/70 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Guest</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Property</th>
                    <th className="hidden px-3 py-2 font-semibold md:table-cell">Stay</th>
                    <th className="px-3 py-2 font-semibold">
                      {FIELDS.find((f) => f.id === field)!.label}
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {matching.slice(0, 25).map((g) => (
                    <tr
                      key={g.id}
                      className="cursor-pointer border-t border-border hover:bg-surface-2/60"
                      onClick={() => onGuest(g.id)}
                    >
                      <td className="px-3 py-2 font-medium">{g.name}</td>
                      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                        {g.property}
                      </td>
                      <td className="num hidden px-3 py-2 text-muted-foreground md:table-cell">
                        {g.stay}
                      </td>
                      <td className="num px-3 py-2 text-xs text-foreground/80">
                        {g.fields[field].value ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ChevronRight className="inline size-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                  {!matching.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-xs text-muted-foreground">
                        No guest records for this selection. Try another date range or property.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {guest && (
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
                    <span className="text-sm font-semibold">
                      {FIELDS.find((x) => x.id === f)!.label}
                    </span>
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
                  <p className="text-xs text-muted-foreground">
                    {statusText(info.status, info.via)}
                  </p>
                  {info.value && <p className="num text-xs text-foreground/80">{info.value}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
