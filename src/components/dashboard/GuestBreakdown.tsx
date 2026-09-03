import { ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  type Totals,
} from "@/lib/directful";

function fieldStory(guest: Guest, f: FieldKey) {
  const info = guest.fields[f];
  if (info.status === "l1" || info.status === "l2")
    return `Became reachable with ${info.status === "l1" ? "Level 1" : "Level 2"}${
      info.via ? ` · ${LEAF_LABEL[info.via]}` : ""
    }`;
  if (info.status === "start") return "On the booking, but not usable";
  return "Not reachable yet";
}

function GuestCard({ guest }: { guest: Guest }) {
  const afterL1 = ALL_FIELDS.filter((f) => guest.fields[f].status === "l1").length;
  const afterL2 = ALL_FIELDS.filter(
    (f) => guest.fields[f].status === "l1" || guest.fields[f].status === "l2",
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold leading-tight">{guest.name}</p>
        <p className="text-xs text-muted-foreground">
          {guest.property} · {guest.country} · stay {guest.stay}
        </p>
      </div>

      <div className="space-y-2">
        {ALL_FIELDS.map((f) => {
          const info = guest.fields[f];
          const reachable = info.status === "l1" || info.status === "l2";
          return (
            <div key={f} className="rounded-xl border border-border bg-surface-2/40 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">
                  {FIELDS.find((x) => x.id === f)!.label}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: reachable
                      ? info.status === "l2"
                        ? COLORS.l2
                        : COLORS.l1
                      : "var(--muted-foreground)",
                  }}
                >
                  {reachable ? "Reachable" : "Not reachable"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{fieldStory(guest, f)}</p>
              {info.value && (
                <p className="num mt-0.5 text-xs text-foreground/80">{info.value}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border pt-3 text-center">
        <div>
          <p className="text-xs font-semibold">Starting point</p>
          <p className="num text-xs text-muted-foreground">0 of 3 reachable</p>
        </div>
        <div>
          <p className="text-xs font-semibold">After Level 1</p>
          <p className="num text-xs text-muted-foreground">{afterL1} of 3 reachable</p>
        </div>
        <div>
          <p className="text-xs font-semibold">After Level 2</p>
          <p className="num text-xs text-muted-foreground">{afterL2} of 3 reachable</p>
        </div>
      </div>
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
  const count = matching.length;

  return (
    <section className="panel mt-6 p-6 lg:p-8">
      <div className="mb-5 flex items-start gap-3">
        <span
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ background: FIELD_COLOR[field] }}
        />
        <div>
          <h2 className="text-xl font-semibold">Guest by guest — {meta.label.toLowerCase()}</h2>
          <p className="text-sm text-muted-foreground">
            {n0(count)} guests you can {FIELD_VERB[field]}, made reachable by {LEVEL_LABEL[level]} ·{" "}
            {share(count, t.bookings)} of bookings in this range.
          </p>
        </div>
      </div>

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
                  className={`border-t border-border transition-colors ${
                    active ? "bg-primary/10" : "hover:bg-surface-2/60"
                  }`}
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
                    <Popover
                      open={active}
                      onOpenChange={(o) => onGuest(o ? g.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Guest details for ${g.name}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground data-[state=open]:bg-primary/15 data-[state=open]:text-primary"
                        >
                          Details
                          <ChevronRight className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        side="left"
                        sideOffset={8}
                        collisionPadding={16}
                        className="w-[min(24rem,90vw)] p-4"
                      >
                        <GuestCard guest={g} />
                      </PopoverContent>
                    </Popover>
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
    </section>
  );
}
