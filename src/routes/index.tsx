import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgressionBridge } from "@/components/dashboard/ProgressionBridge";
import { GrowthOverTime } from "@/components/dashboard/GrowthOverTime";
import { ReachPie, type LevelKey, type ViewState } from "@/components/dashboard/ReachPie";
import {
  COMPARISONS,
  FIELDS,
  PRESETS,
  PROPERTIES,
  SOURCES,
  availableLevels,
  comparisonRange,
  compact,
  details,
  guestsFor,
  level2Potential,
  n0,
  pct,
  presetRange,
  rangeLabel,
  seriesFor,
  share,
  totalsOf,
  type CompareId,
  type PresetId,
  type PropertyId,
  type Range,
  type SourceId,
} from "@/lib/directful";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guests You Can Reach — Directful Analytics" },
      {
        name: "description",
        content:
          "See how many guests your hotel can reach today, how much that grew from your starting point, and what Level 1 and Level 2 added along the way.",
      },
      { property: "og:title", content: "Guests You Can Reach — Directful Analytics" },
      {
        property: "og:description",
        content:
          "Guest reach by source, property and date range: starting point, Level 1, Level 2 and what is still possible.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [source, setSource] = useState<SourceId>("ota");
  const [property, setProperty] = useState<PropertyId | "all">("all");
  const [preset, setPreset] = useState<PresetId>("30d");
  const [customRange, setCustomRange] = useState<Range>(presetRange("30d"));
  const [compareId, setCompareId] = useState<CompareId>("previous");
  const [customCompare, setCustomCompare] = useState<Range>(presetRange("30d"));
  const [view, setView] = useState<ViewState>("now");
  const [level, setLevel] = useState<LevelKey>("l1");
  const [path, setPath] = useState<string[]>([]);

  const sel = useMemo(() => ({ source, property }), [source, property]);
  const range = useMemo(
    () => (preset === "custom" ? { ...customRange, label: "Custom" } : presetRange(preset)),
    [preset, customRange],
  );
  const compare = useMemo(
    () => comparisonRange(range, compareId, customCompare),
    [range, compareId, customCompare],
  );

  const series = useMemo(() => seriesFor(sel, range), [sel, range]);
  const compareSeries = useMemo(
    () => (compare ? seriesFor(sel, compare) : null),
    [sel, compare],
  );
  const t = useMemo(() => totalsOf(series), [series]);
  const ct = useMemo(() => (compareSeries ? totalsOf(compareSeries) : null), [compareSeries]);
  const guests = useMemo(() => guestsFor(sel, range), [sel, range]);

  const levels = availableLevels(sel);
  const potential = level2Potential(t);
  const reachDelta = ct ? t.now.guests - ct.now.guests : null;
  const completeness = t.now.guests ? details(t.now) / (t.now.guests * 3) : 0;

  const properties = PROPERTIES.filter((p) => p.sources.includes(source));

  return (
    <AppShell>
      <div className="border-b border-border bg-surface-2/40 px-5 pt-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-3.5 text-primary" /> Guests you can reach
          </p>
          <h1 className="text-2xl font-bold lg:text-3xl">Directful — Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How many of your guests you can contact today, and how much that grew since your
            starting point.
          </p>

          {/* Controls */}
          <div className="mt-5 grid gap-3 pb-6 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Bookings from">
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v as SourceId);
                  setProperty("all");
                  setPath([]);
                }}
              >
                <SelectTrigger className="bg-surface-2/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Property">
              <Select
                value={property}
                onValueChange={(v) => {
                  setProperty(v as PropertyId | "all");
                  setPath([]);
                }}
              >
                <SelectTrigger className="bg-surface-2/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Dates">
              <Select value={preset} onValueChange={(v) => setPreset(v as PresetId)}>
                <SelectTrigger className="bg-surface-2/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preset === "custom" && (
                <div className="mt-2 flex gap-2">
                  <Input
                    type="date"
                    value={customRange.from}
                    onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={customRange.to}
                    onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                  />
                </div>
              )}
            </Field>

            <Field label="Compare with">
              <Select value={compareId} onValueChange={(v) => setCompareId(v as CompareId)}>
                <SelectTrigger className="bg-surface-2/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARISONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compareId === "custom" && (
                <div className="mt-2 flex gap-2">
                  <Input
                    type="date"
                    value={customCompare.from}
                    onChange={(e) => setCustomCompare((r) => ({ ...r, from: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={customCompare.to}
                    onChange={(e) => setCustomCompare((r) => ({ ...r, to: e.target.value }))}
                  />
                </div>
              )}
            </Field>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-5 py-8 lg:px-10">
        {/* Hero */}
        <section className="panel mb-6 flex flex-wrap items-center justify-between gap-6 p-6 lg:p-8">
          <div className="flex items-end gap-4">
            <span className="num text-4xl font-bold text-muted-foreground lg:text-5xl">
              {compact(t.starting.guests)}
            </span>
            <ArrowUpRight className="mb-3 size-8 text-primary" />
            <span
              className="num text-6xl font-bold text-primary lg:text-7xl"
              style={{ textShadow: "0 0 40px color-mix(in oklab, var(--l2) 45%, transparent)" }}
            >
              {compact(t.now.guests)}
            </span>
            <div className="mb-2">
              <div className="num text-xl font-bold text-primary">{pct(t.upliftFromStart)}</div>
              <div className="text-sm text-muted-foreground">
                more guests you can reach than at your starting point
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
            <Stat label="Guests you can reach" value={n0(t.now.guests)} tone="primary" />
            <Stat label="Contact details" value={n0(details(t.now))} />
            <Stat
              label={compare ? `vs ${compare.label.toLowerCase()}` : "No comparison"}
              value={reachDelta == null ? "—" : `${reachDelta >= 0 ? "+" : ""}${n0(reachDelta)}`}
            />
            <Stat label="Bookings in range" value={n0(t.bookings)} muted />
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
          {/* Reach pie */}
          <section className="panel p-6 lg:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Where your guests stand</h2>
                <p className="text-sm text-muted-foreground">
                  {rangeLabel(range)} · {share(t.now.guests, t.bookings)} of all bookings are
                  reachable.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Toggle
                  options={[
                    { id: "start", label: "Starting point" },
                    { id: "now", label: "Now" },
                  ]}
                  value={view}
                  onChange={(v) => {
                    setView(v as ViewState);
                    setPath([]);
                  }}
                />
                <Toggle
                  options={[
                    { id: "l1", label: "Level 1" },
                    ...(levels.l2 ? [{ id: "l2", label: "Level 2" }] : []),
                  ]}
                  value={level}
                  onChange={(v) => {
                    setLevel(v as LevelKey);
                    setPath([]);
                  }}
                />
              </div>
            </div>
            <ReachPie
              t={t}
              view={view}
              level={level}
              guests={guests}
              hasL2={levels.l2}
              path={path}
              onPath={setPath}
            />
          </section>

          {/* Level 2 potential + secondary context */}
          <div className="space-y-6">
            <section className="panel p-6">
              <h2 className="text-lg font-semibold">What Level 2 could still add</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on bookings in this range that are still not reachable.
              </p>
              <p className="num mt-4 text-4xl font-bold text-primary">
                +{compact(potential.guests)}
              </p>
              <p className="text-sm text-muted-foreground">
                guests, from {n0(potential.eligible)} bookings still open (about{" "}
                {Math.round(potential.rate * 100)}% typically become reachable).
              </p>
            </section>

            <section className="panel p-6">
              <h2 className="text-lg font-semibold">Missed opportunities</h2>
              <p className="num mt-2 text-3xl font-bold">{compact(t.missed)}</p>
              <p className="text-sm text-muted-foreground">
                guests whose details can no longer be recovered ·{" "}
                {share(t.missed, t.bookings)} of bookings.
              </p>
            </section>

            <section className="panel p-6">
              <h2 className="text-lg font-semibold">Profile completeness</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How full the contact details are for guests you can reach.
              </p>
              <p className="num mt-3 text-3xl font-bold">{Math.round(completeness * 100)}%</p>
              <ul className="mt-3 space-y-1 text-sm">
                {FIELDS.map((f) => (
                  <li key={f.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{f.plain}</span>
                    <span className="num">{n0(t.now[f.id])}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Progression bridge */}
        <section className="panel mt-6 p-6 lg:p-8">
          <h2 className="text-xl font-semibold">How you got here</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Starting point, what Level 1 added, what Level 2 added, and where you are now.
          </p>
          <ProgressionBridge t={t} hasL2={levels.l2} />
        </section>

        {/* Over time */}
        <section className="panel mt-6 p-6 lg:p-8">
          <h2 className="text-xl font-semibold">Guests you can reach over time</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick the lines you want to see. With a comparison selected, each period is shown side by
            side.
          </p>
          <GrowthOverTime
            series={series}
            comparison={compareSeries}
            compareLabel={compare?.label ?? "No comparison"}
            rangeLabelText={rangeLabel(range)}
          />
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-xl border border-border bg-surface-2/60 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "primary";
  muted?: boolean;
}) {
  return (
    <div>
      <p
        className={`num text-xl font-bold ${
          tone === "primary" ? "text-primary" : muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
