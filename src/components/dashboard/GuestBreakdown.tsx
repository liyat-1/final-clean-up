import { ChevronRight, X } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  ALL_FIELDS,
  COLORS,
  FIELDS,
  FIELD_COLOR,
  FIELD_VERB,
  LEAF_LABEL,
  LEVEL_LABEL,
  n0,
  share,
  type FieldKey,
  type Focus,
  type Guest,
  type LeafKey,
  type Totals,
  type FieldStatus,
} from "@/lib/directful";

function storyLine(f: FieldKey, s: FieldStatus, via?: LeafKey) {
  const label = FIELDS.find((x) => x.id === f)!.label.toLowerCase();
  if (s === "l1")
    return `Level 1 recovered the ${label}${via ? ` via ${LEAF_LABEL[via]}` : ""}.`;
  if (s === "l2")
    return `Level 2 recovered the ${label}${via ? ` via ${LEAF_LABEL[via]}` : ""}.`;
  if (s === "start") return `The ${label} was on the booking but not usable.`;
  return `The ${label} is still not reachable.`;
}

function GuestStory({ guest }: { guest: Guest }) {
  const recovered = ALL_FIELDS.filter((f) => guest.fields[f].status === "l1" || guest.fields[f].status === "l2");
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-xs leading-relaxed text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">When you started:</span> {guest.name} was
        not reachable — 0 usable contact details.
      </p>
      {ALL_FIELDS.map((f) => (
        <p key={f}>· {storyLine(f, guest.fields[f].status, guest.fields[f].via)}</p>
      ))}
      <p className="mt-1 font-semibold text-foreground">
        Today you can reach {guest.name} on {recovered.length} of 3 channels.
      </p>
    </div>
  );
}

export function GuestBreakdown({
  t,
  guests,
  focus,
  guestId,
  onGuest,
}: {
  t: Totals;
  guests: Guest[];
  focus: Focus;
  guestId: string | null;
  onGuest: (id: string | null) => void;
}) {
  const { level, field } = focus;

  const matching = useMemo(() => {
    if (!field || !level) return [];
    return guests.filter((g) =>
      level === "now" ? g.fields[field].status !== "none" : g.fields[field].status === level,
    );
  }, [guests, field, level]);

  if (!field || !level || focus.view === "start") return null;

  const meta = FIELDS.find((f) => f.id === field)!;
  const guest = guests.find((g) => g.id === guestId) ?? null;
  const count = matching.length;

  return (
    <section className="panel mt-6 p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 size-3 shrink-0 rounded-full"
            style={{ background: FIELD_COLOR[field] }}
          />
          <div>
            <h2 className="text-xl font-semibold">Guest by guest — {meta.label.toLowerCase()}</h2>
            <p className="text-sm text-muted-foreground">
              {n0(count)} guests you can {FIELD_VERB[field]}, made reachable by{" "}
              {LEVEL_LABEL[level]} · {share(count, t.bookings)} of bookings in this range.
            </p>
          </div>
        </div>
        {guest && (
          <Button size="sm" variant="ghost" onClick={() => onGuest(null)}>
            <X className="size-4" /> Close details
          </Button>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="max-h-[460px] overflow-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Guest</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Property</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Stay</th>
                <th className="px-4 py-2.5 font-semibold">{meta.label}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {matching.slice(0, 40).map((g) => {
                const active = guestId === g.id;
                return (
                  <tr
                    key={g.id}
                    className={`cursor-pointer border-t border-border transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-surface-2/60"
                    }`}
                    onClick={() => onGuest(active ? null : g.id)}
                  >
                    <td className="px-4 py-2.5 font-medium">{g.name}</td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                      {g.property}
                    </td>
                    <td className="num hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                      {g.stay}
                    </td>
                    <td className="num px-4 py-2.5 text-xs text-foreground/80">
                      {g.fields[field].value ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChevronRight
                        className={`inline size-4 ${active ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </td>
                  </tr>
                );
              })}
              {!count && (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-xs text-muted-foreground">
                    No guest records for this selection. Try another date range or property.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-surface-2/30 p-4">
          {!guest ? (
            <p className="text-sm text-muted-foreground">
              Pick a guest to see exactly what changed for them — from zero reachable details to
              what Directful recovered.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold">{guest.name}</p>
                <p className="text-xs text-muted-foreground">
                  {guest.property} · {guest.country} · stay {guest.stay}
                </p>
              </div>
              <GuestStory guest={guest} />
              {ALL_FIELDS.map((f) => {
                const info = guest.fields[f];
                return (
                  <div key={f} className="rounded-lg border border-border bg-background/40 p-3">
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
                                : COLORS.l1,
                        }}
                      >
                        {info.status === "none" ? "Not reachable" : "Reachable"}
                      </span>
                    </div>
                    {info.value && <p className="num text-xs text-foreground/80">{info.value}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
