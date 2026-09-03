/**
 * Directful Analytics data model.
 *
 * Everything is deterministic mock data so SSR and the client agree.
 * Language rule: plain, hotel-friendly wording everywhere it is user facing.
 */

export type SourceId = "ota" | "direct";

export const SOURCES: { id: SourceId; label: string; short: string }[] = [
  { id: "ota", label: "OTA bookings", short: "OTA" },
  { id: "direct", label: "Non-OTA bookings", short: "Non-OTA" },
];

export type PropertyId = "harbour" | "aurora" | "pinecrest" | "lagoon";

export type Property = {
  id: PropertyId;
  name: string;
  /** Which Directful packages this property actually pays for. */
  levels: { l1: boolean; l2: boolean };
  /** Some properties simply have no direct (non-OTA) bookings recorded. */
  sources: SourceId[];
  weight: number;
};

export const PROPERTIES: Property[] = [
  {
    id: "harbour",
    name: "Harbour View Hotel",
    levels: { l1: true, l2: true },
    sources: ["ota", "direct"],
    weight: 1,
  },
  {
    id: "aurora",
    name: "Aurora Beach Resort",
    levels: { l1: true, l2: true },
    sources: ["ota", "direct"],
    weight: 0.78,
  },
  {
    id: "pinecrest",
    name: "Pinecrest Lodge",
    levels: { l1: true, l2: false },
    sources: ["ota"],
    weight: 0.46,
  },
  {
    id: "lagoon",
    name: "Blue Lagoon Suites",
    levels: { l1: true, l2: true },
    sources: ["ota", "direct"],
    weight: 0.62,
  },
];

export type FieldKey = "email" | "phone" | "address";

export const FIELDS: { id: FieldKey; label: string; plain: string }[] = [
  { id: "email", label: "Email", plain: "Guests you can email" },
  { id: "phone", label: "Phone", plain: "Guests you can call or text" },
  { id: "address", label: "Address", plain: "Guests you can post to" },
];

export const ALL_FIELDS: FieldKey[] = ["email", "phone", "address"];

/** One pot of reachable guests: unique guests plus the contact details behind them. */
export type Bucket = {
  guests: number;
  email: number;
  phone: number;
  address: number;
};

export const ZERO: Bucket = { guests: 0, email: 0, phone: 0, address: 0 };

export function addBucket(a: Bucket, b: Bucket): Bucket {
  return {
    guests: a.guests + b.guests,
    email: a.email + b.email,
    phone: a.phone + b.phone,
    address: a.address + b.address,
  };
}

export function details(b: Bucket) {
  return b.email + b.phone + b.address;
}

/** The pieces that make up each package. Never the headline — supporting proof only. */
export type LeafKey = "cleanup" | "whois" | "journey" | "staff" | "idScan";

export const LEAF_LABEL: Record<LeafKey, string> = {
  cleanup: "Cleanup",
  whois: "Whois AI",
  journey: "Guest journey messages",
  staff: "Collected by your team",
  idScan: "Scanned from ID",
};

export type DayRecord = {
  date: string;
  bookings: number;
  /** Guests the hotel could already reach before Directful started. */
  starting: Bucket;
  cleanup: Bucket;
  whois: Bucket;
  journey: Bucket;
  staff: Bucket;
  idScan: Bucket;
  /** Guests whose details can no longer be recovered. */
  missed: number;
};

export const COLORS = {
  starting: "var(--unrec)",
  l1: "var(--ota)",
  l2: "var(--l1)",
  opportunity: "var(--l2)",
  missed: "color-mix(in oklab, var(--unrec) 70%, var(--foreground))",
  email: "var(--l1)",
  phone: "color-mix(in oklab, var(--l1) 55%, var(--ceiling))",
  address: "var(--ceiling)",
  cleanup: "var(--ota)",
  whois: "color-mix(in oklab, var(--ota) 55%, var(--l1))",
  journey: "var(--l1)",
  staff: "color-mix(in oklab, var(--l1) 60%, var(--ota))",
  idScan: "color-mix(in oklab, var(--l1) 70%, var(--ceiling))",
} as const;

export const FIELD_COLOR: Record<FieldKey, string> = {
  email: COLORS.email,
  phone: COLORS.phone,
  address: COLORS.address,
};

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const TODAY = new Date(Date.UTC(2026, 8, 3));
const HISTORY_DAYS = 760;

function seeded(i: number, salt: number) {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function saltOf(p: PropertyId, s: SourceId) {
  const pi = PROPERTIES.findIndex((x) => x.id === p) + 1;
  return pi * 11 + (s === "ota" ? 3 : 7);
}

/** Guests -> contact details. One guest usually carries more than one detail. */
function bucket(guests: number, mix: [number, number, number], perGuest = 1.32): Bucket {
  const d = guests * perGuest;
  return {
    guests,
    email: d * mix[0],
    phone: d * mix[1],
    address: d * mix[2],
  };
}

const MIX = {
  starting: [0.55, 0.3, 0.15] as [number, number, number],
  cleanup: [0.46, 0.33, 0.21] as [number, number, number],
  whois: [0.5, 0.35, 0.15] as [number, number, number],
  journey: [0.44, 0.32, 0.24] as [number, number, number],
  staff: [0.36, 0.37, 0.27] as [number, number, number],
  idScan: [0.26, 0.28, 0.46] as [number, number, number],
};

const cache = new Map<string, DayRecord[]>();

function buildSeries(p: PropertyId, s: SourceId): DayRecord[] {
  const key = `${p}:${s}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const prop = PROPERTIES.find((x) => x.id === p)!;
  const salt = saltOf(p, s);
  const base = (s === "ota" ? 92 : 34) * prop.weight;
  const out: DayRecord[] = [];

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(TODAY);
    d.setUTCDate(TODAY.getUTCDate() - (HISTORY_DAYS - 1 - i));
    const doy = d.getUTCMonth() * 30 + d.getUTCDate();
    const season = 1 + Math.sin((doy / 360) * Math.PI * 2) * 0.22;
    const noise = 0.82 + seeded(i, salt) * 0.36;
    const bookings = base * season * noise;

    /** Directful gets better over time — later days convert more. */
    const ramp = 0.6 + (i / HISTORY_DAYS) * 0.75;

    /** Nothing is reachable before Directful — the starting point is always zero. */
    const startingG = 0;
    const cleanupG = bookings * 0.126 * ramp;
    const whoisG = bookings * 0.078 * ramp;
    const journeyG = prop.levels.l2 ? bookings * 0.112 * ramp : 0;
    const staffG = prop.levels.l2 ? bookings * 0.049 * ramp : 0;
    const idScanG = prop.levels.l2 ? bookings * 0.031 * ramp : 0;

    out.push({
      date: d.toISOString().slice(0, 10),
      bookings,
      starting: bucket(startingG, MIX.starting, 1.18),
      cleanup: bucket(cleanupG, MIX.cleanup),
      whois: bucket(whoisG, MIX.whois),
      journey: bucket(journeyG, MIX.journey),
      staff: bucket(staffG, MIX.staff),
      idScan: bucket(idScanG, MIX.idScan),
      missed: bookings * 0.042 * (0.8 + seeded(i, salt + 2) * 0.4),
    });
  }
  cache.set(key, out);
  return out;
}

export function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function today() {
  return iso(TODAY);
}

export function shiftDays(date: string, delta: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return iso(d);
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000,
  );
}

export type Range = { from: string; to: string; label: string };

export type PresetId =
  | "15d"
  | "30d"
  | "lastMonth"
  | "3m"
  | "thisYear"
  | "lastYear"
  | "custom";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "15d", label: "Last 15 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "lastMonth", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
  { id: "thisYear", label: "This year" },
  { id: "lastYear", label: "Last year" },
  { id: "custom", label: "Custom" },
];

export function presetRange(id: PresetId): Range {
  const to = today();
  const label = PRESETS.find((p) => p.id === id)?.label ?? "Custom";
  switch (id) {
    case "15d":
      return { from: shiftDays(to, -14), to, label };
    case "30d":
      return { from: shiftDays(to, -29), to, label };
    case "lastMonth": {
      const first = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - 1, 1));
      const last = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 0));
      return { from: iso(first), to: iso(last), label };
    }
    case "3m":
      return { from: shiftDays(to, -89), to, label };
    case "thisYear":
      return { from: `${TODAY.getUTCFullYear()}-01-01`, to, label };
    case "lastYear":
      return {
        from: `${TODAY.getUTCFullYear() - 1}-01-01`,
        to: `${TODAY.getUTCFullYear() - 1}-12-31`,
        label,
      };
    default:
      return { from: shiftDays(to, -14), to, label };
  }
}

export type CompareId = "none" | "previous" | "lastYear" | "custom";

export const COMPARISONS: { id: CompareId; label: string }[] = [
  { id: "none", label: "No comparison" },
  { id: "previous", label: "Previous period" },
  { id: "lastYear", label: "Same period last year" },
  { id: "custom", label: "Custom dates" },
];

export function comparisonRange(range: Range, id: CompareId, custom?: Range): Range | null {
  const len = daysBetween(range.from, range.to) + 1;
  if (id === "none") return null;
  if (id === "previous")
    return {
      from: shiftDays(range.from, -len),
      to: shiftDays(range.from, -1),
      label: "Previous period",
    };
  if (id === "lastYear")
    return {
      from: shiftDays(range.from, -365),
      to: shiftDays(range.to, -365),
      label: "Same period last year",
    };
  return custom ? { ...custom, label: "Custom dates" } : null;
}

/* ------------------------------------------------------------------ */
/* Selection + aggregation                                             */
/* ------------------------------------------------------------------ */

export type Selection = {
  source: SourceId;
  /** "all" aggregates every property that has data for the source. */
  property: PropertyId | "all";
};

export function propertiesFor(sel: Selection): Property[] {
  const list = PROPERTIES.filter((p) => p.sources.includes(sel.source));
  if (sel.property === "all") return list;
  return list.filter((p) => p.id === sel.property);
}

/** Which packages are actually paid for across the current selection. */
export function availableLevels(sel: Selection) {
  const list = propertiesFor(sel);
  return {
    l1: list.some((p) => p.levels.l1),
    l2: list.some((p) => p.levels.l2),
  };
}

export function seriesFor(sel: Selection, range: Range): DayRecord[] {
  const list = propertiesFor(sel);
  if (!list.length) return [];
  const merged = new Map<string, DayRecord>();
  for (const p of list) {
    for (const d of buildSeries(p.id, sel.source)) {
      if (d.date < range.from || d.date > range.to) continue;
      const cur = merged.get(d.date);
      if (!cur) {
        merged.set(d.date, { ...d });
      } else {
        merged.set(d.date, {
          date: d.date,
          bookings: cur.bookings + d.bookings,
          starting: addBucket(cur.starting, d.starting),
          cleanup: addBucket(cur.cleanup, d.cleanup),
          whois: addBucket(cur.whois, d.whois),
          journey: addBucket(cur.journey, d.journey),
          staff: addBucket(cur.staff, d.staff),
          idScan: addBucket(cur.idScan, d.idScan),
          missed: cur.missed + d.missed,
        });
      }
    }
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type Totals = {
  days: number;
  bookings: number;
  starting: Bucket;
  l1: Bucket;
  l2: Bucket;
  leaves: Record<LeafKey, Bucket>;
  /** Everything the hotel can reach right now. */
  now: Bucket;
  missed: number;
  /** Guest data still out there, that Directful could still make reachable. */
  remaining: number;
  /** How much more you can reach than at your starting point (share). */
  upliftFromStart: number;
  l1Share: number;
  l2Share: number;
};

export function totalsOf(series: DayRecord[]): Totals {
  const sum = (k: Exclude<keyof DayRecord, "date" | "bookings" | "missed">) =>
    series.reduce((a, d) => addBucket(a, d[k]), ZERO);

  const bookings = series.reduce((a, d) => a + d.bookings, 0);
  const missed = series.reduce((a, d) => a + d.missed, 0);
  const starting = sum("starting");
  const cleanup = sum("cleanup");
  const whois = sum("whois");
  const journey = sum("journey");
  const staff = sum("staff");
  const idScan = sum("idScan");
  const l1 = addBucket(cleanup, whois);
  const l2 = addBucket(journey, addBucket(staff, idScan));
  const now = addBucket(starting, addBucket(l1, l2));

  return {
    days: series.length,
    bookings,
    starting,
    l1,
    l2,
    leaves: { cleanup, whois, journey, staff, idScan },
    now,
    missed,
    remaining: Math.max(0, bookings - now.guests - missed),
    upliftFromStart: bookings ? now.guests / bookings : 0,
    l1Share: bookings ? l1.guests / bookings : 0,
    l2Share: bookings ? l2.guests / bookings : 0,
  };
}

/** What Level 2 could still add for a property that does not have it yet. */
export const LEVEL2_POTENTIAL_RATE = 0.3;

export function level2Potential(t: Totals) {
  const eligible = Math.max(0, t.bookings - t.now.guests - t.missed);
  return { eligible, guests: eligible * LEVEL2_POTENTIAL_RATE, rate: LEVEL2_POTENTIAL_RATE };
}

/* ------------------------------------------------------------------ */
/* Guests                                                              */
/* ------------------------------------------------------------------ */

export type FieldStatus = "start" | "l1" | "l2" | "none";

export type Guest = {
  id: string;
  name: string;
  country: string;
  stay: string;
  property: string;
  fields: Record<FieldKey, { status: FieldStatus; via?: LeafKey; value?: string }>;
};

const FIRST = [
  "Leah", "Marco", "Yuki", "Amara", "Tomas", "Elena", "Noah", "Priya", "Hugo", "Mina",
  "Sofia", "Ivan", "Chloe", "Ahmed", "Greta", "Diego", "Nora", "Kenji", "Lucia", "Ben",
];
const LAST = [
  "Whitfield", "Duarte", "Tanaka", "Okafor", "Novak", "Rossi", "Berg", "Nair", "Moreau", "Kaur",
];
const COUNTRY = ["United Kingdom", "Germany", "Japan", "Nigeria", "Spain", "Italy", "USA", "France"];

function statusFor(r: number, hasL2: boolean): FieldStatus {
  if (r < 0.45) return "l1";
  if (hasL2 && r < 0.74) return "l2";
  return "none";
}

function viaFor(status: FieldStatus, r: number): LeafKey | undefined {
  if (status === "l1") return r < 0.6 ? "cleanup" : "whois";
  if (status === "l2") return r < 0.5 ? "journey" : r < 0.78 ? "staff" : "idScan";
  return undefined;
}

export function guestsFor(sel: Selection, range: Range, opts?: { noL2?: boolean }): Guest[] {
  const list = propertiesFor(sel);
  const out: Guest[] = [];
  const span = Math.max(1, daysBetween(range.from, range.to));
  list.forEach((p, pi) => {
    const salt = saltOf(p.id, sel.source);
    for (let i = 0; i < 40; i++) {
      const r = (n: number) => seeded(i * 5 + n, salt + pi);
      const first = FIRST[Math.floor(r(1) * FIRST.length)] ?? "Leah";
      const last = LAST[Math.floor(r(2) * LAST.length)] ?? "Berg";
      const name = `${first} ${last}`;
      const mk = (f: FieldKey, n: number) => {
        const status = statusFor(r(n), p.levels.l2 && !opts?.noL2);
        const via = viaFor(status, r(n + 20));
        const value =
          status === "none"
            ? undefined
            : f === "email"
              ? `${first.toLowerCase()}.${last.toLowerCase()}@mail.com`
              : f === "phone"
                ? `+44 7${Math.floor(r(n + 9) * 900 + 100)} ${Math.floor(r(n + 8) * 900000 + 100000)}`
                : `${Math.floor(r(n + 7) * 90 + 4)} Rowan Street, ${COUNTRY[Math.floor(r(3) * COUNTRY.length)]}`;
        return { status, ...(via ? { via } : {}), ...(value ? { value } : {}) };
      };
      out.push({
        id: `${p.id}-${sel.source}-${i}`,
        name,
        country: COUNTRY[Math.floor(r(3) * COUNTRY.length)] ?? "Spain",
        stay: shiftDays(range.from, Math.floor(r(4) * span)),
        property: p.name,
        fields: { email: mk("email", 11), phone: mk("phone", 12), address: mk("address", 13) },
      });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const nf = new Intl.NumberFormat("en-US");

export function n0(n: number) {
  return nf.format(Math.round(n));
}

export function compact(n: number) {
  if (Math.abs(n) >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v : v.toFixed(1)}K`;
  }
  return nf.format(Math.round(n));
}

export function pct(n: number, digits = 0) {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
}

export function share(n: number, of: number) {
  return `${Math.round((n / (of || 1)) * 100)}%`;
}

export function dayLabel(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function rangeLabel(r: Range) {
  return `${dayLabel(r.from)} – ${dayLabel(r.to)}`;
}

/* ------------------------------------------------------------------ */
/* Plans, focus + level helpers                                        */
/* ------------------------------------------------------------------ */

/** Which Directful package the hotel pays for. */
export type Plan = "l1" | "l2";

export type LevelKey = "l1" | "l2";
export type ViewState = "now" | "start";

/** What the whole dashboard is currently looking at. Drives pie, list and graph. */
export type Focus = {
  view: ViewState;
  level: LevelKey | null;
  field: FieldKey | null;
};

export const EMPTY_FOCUS: Focus = { view: "now", level: null, field: null };

/** Level 1 only hotels have no Level 2 work at all — hide it from every number. */
export function stripLevel2(series: DayRecord[]): DayRecord[] {
  return series.map((d) => ({ ...d, journey: ZERO, staff: ZERO, idScan: ZERO }));
}

export function dayBucket(d: DayRecord, k: "start" | "l1" | "l2" | "now"): Bucket {
  const l1 = addBucket(d.cleanup, d.whois);
  const l2 = addBucket(d.journey, addBucket(d.staff, d.idScan));
  if (k === "start") return d.starting;
  if (k === "l1") return l1;
  if (k === "l2") return l2;
  return addBucket(d.starting, addBucket(l1, l2));
}

export function levelBucket(t: Totals, level: LevelKey | null): Bucket {
  if (level === "l1") return t.l1;
  if (level === "l2") return t.l2;
  return t.now;
}

export const LEVEL_LABEL: Record<LevelKey, string> = {
  l1: "Level 1",
  l2: "Level 2",
};

export const FIELD_VERB: Record<FieldKey, string> = {
  email: "email",
  phone: "call or text",
  address: "post to",
};

/** Profile completeness, split by what each stage contributed. */
export function completenessOf(t: Totals) {
  const cap = Math.max(1, t.now.guests * 3);
  const part = (b: Bucket) => details(b) / cap;
  return {
    total: details(t.now) / cap,
    start: part(t.starting),
    l1: part(t.l1),
    l2: part(t.l2),
    filled: details(t.now),
    cap: t.now.guests * 3,
  };
}
