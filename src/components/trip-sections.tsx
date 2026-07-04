import { useMemo, useState } from "react";
import type { Trip } from "@/lib/types";
import { avatarColor, memberInitials, useTripStore } from "@/lib/store";
import { calculateSettlements } from "@/lib/settlements";
import { Plus, Trash2, Check, ArrowRight, Sparkles } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary transition text-sm";

function nameOf(trip: Trip, id: string) {
  return trip.members.find((m) => m.id === id)?.name ?? "Unknown";
}

/* ============================================================
 * EXPENSES
 * ============================================================ */
export function ExpensesSection({ trip }: { trip: Trip }) {
  const addExpense = useTripStore((s) => s.addExpense);
  const removeExpense = useTripStore((s) => s.removeExpense);

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [paidBy, setPaidBy] = useState(trip.members[0]?.id ?? "");
  const [split, setSplit] = useState<string[]>(trip.members.map((m) => m.id));
  const [roundOff, setRoundOff] = useState(false);
  const [roundTo, setRoundTo] = useState(5);

  const { settlements, summary, adjusted } = useMemo(
    () => calculateSettlements(trip.expenses, trip.members, roundOff ? roundTo : 0),
    [trip.expenses, trip.members, roundOff, roundTo],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !desc.trim()) return;
    addExpense(trip.id, {
      amount: amt,
      paidBy,
      description: desc,
      splitBetween: split.length ? split : trip.members.map((m) => m.id),
    });
    setAmount("");
    setDesc("");
  };

  const toggleSplit = (id: string) =>
    setSplit((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Settlements */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-xl font-semibold">Smart settlement</h3>
              <p className="text-sm text-muted-foreground">The fewest transactions to settle up.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roundOff}
                onChange={(e) => setRoundOff(e.target.checked)}
                className="h-4 w-4"
              />
              Round off
              {roundOff && (
                <select
                  value={roundTo}
                  onChange={(e) => setRoundTo(+e.target.value)}
                  className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value={5}>₹5</option>
                  <option value={10}>₹10</option>
                </select>
              )}
            </label>
          </div>

          {settlements.length === 0 ? (
            <div className="mt-6 rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">
              Everyone's square. Nothing to settle. 🎉
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar id={s.from} name={nameOf(trip, s.from)} />
                    <div className="text-sm font-medium">{nameOf(trip, s.from)}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-terracotta">₹{s.amount.toLocaleString()}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">{nameOf(trip, s.to)}</div>
                    <Avatar id={s.to} name={nameOf(trip, s.to)} />
                  </div>
                </div>
              ))}
              {roundOff && adjusted > 0 && (
                <div className="pt-2 text-xs text-muted-foreground">
                  Remaining ₹{adjusted.toFixed(0)} adjusted for simplicity.
                </div>
              )}
            </div>
          )}

          {/* Per-person summary */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {summary.map((s) => {
              const m = trip.members.find((x) => x.id === s.memberId);
              if (!m) return null;
              const owed = s.net > 0.005;
              const owing = s.net < -0.005;
              return (
                <div key={s.memberId} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar id={m.id} name={m.name} />
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Paid ₹{s.paid.toFixed(0)} · Share ₹{s.share.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <div
                    className={
                      "text-sm font-semibold " +
                      (owed ? "text-success" : owing ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {owed && `+₹${s.net.toFixed(0)}`}
                    {owing && `−₹${Math.abs(s.net).toFixed(0)}`}
                    {!owed && !owing && "₹0"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses list */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold">All expenses</h3>
          {trip.expenses.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">No expenses yet. Add the first one →</div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {trip.expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{e.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {nameOf(trip, e.paidBy)} paid · split {e.splitBetween.length}-ways
                      {e.category ? ` · ${e.category}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">₹{e.amount.toLocaleString()}</div>
                    <button
                      onClick={() => removeExpense(trip.id, e.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add expense */}
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 h-max sticky top-4">
        <h3 className="font-display text-xl font-semibold">Add expense</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Dinner at homestay" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (₹)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={inputCls}>
              {trip.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Split between</label>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((m) => {
                const on = split.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleSplit(m.id)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs transition " +
                      (on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40")
                    }
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Add expense
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
 * WALLET
 * ============================================================ */
export function WalletSection({ trip }: { trip: Trip }) {
  const setBudget = useTripStore((s) => s.setBudget);
  const spent = trip.expenses.reduce((a, e) => a + e.amount, 0);
  const remaining = trip.budget.total - spent;
  const pct = Math.min(100, (spent / Math.max(1, trip.budget.total)) * 100);

  const byCategory = trip.expenses.reduce<Record<string, number>>((acc, e) => {
    const c = e.category ?? "Other";
    acc[c] = (acc[c] ?? 0) + e.amount;
    return acc;
  }, {});
  const catEntries = Object.entries(byCategory);
  const catTotal = catEntries.reduce((a, [, v]) => a + v, 0) || 1;
  const catColors: Record<string, string> = {
    Stay: "bg-primary",
    Food: "bg-terracotta",
    Travel: "bg-forest",
    Activities: "bg-warning",
    Other: "bg-muted-foreground",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Shared wallet</h3>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Budget
            <input
              type="number"
              value={trip.budget.total}
              onChange={(e) => setBudget(trip.id, +e.target.value || 0)}
              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-right text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Spent</div>
            <div className="mt-1 font-display text-3xl font-semibold">₹{spent.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Remaining</div>
            <div className={"mt-1 font-display text-3xl font-semibold " + (remaining < 0 ? "text-destructive" : "text-success")}>
              ₹{remaining.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{pct.toFixed(0)}% of ₹{trip.budget.total.toLocaleString()} used</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">By category</h3>
        {catEntries.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">No expenses yet.</div>
        ) : (
          <>
            <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-secondary">
              {catEntries.map(([c, v]) => (
                <div key={c} className={catColors[c] ?? "bg-muted-foreground"} style={{ width: `${(v / catTotal) * 100}%` }} />
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {catEntries.map(([c, v]) => (
                <div key={c} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className={"h-2.5 w-2.5 rounded-full " + (catColors[c] ?? "bg-muted-foreground")} />
                    <span className="text-sm">{c}</span>
                  </div>
                  <div className="text-sm font-semibold">₹{v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * PACKAGES
 * ============================================================ */
export function PackagesSection({ trip }: { trip: Trip }) {
  const addPackage = useTripStore((s) => s.addPackage);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"pdf" | "link" | "booking">("link");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addPackage(trip.id, { title, url: url || "#", type, uploadedBy: "m1" });
    setTitle("");
    setUrl("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {trip.packages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="font-display text-lg font-semibold">No packages yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the one your friend shared in WhatsApp so nobody has to ask for it again.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {trip.packages.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary transition"
              >
                <div className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-widest text-muted-foreground">
                  {p.type}
                </div>
                <div className="mt-2 font-medium">{p.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Uploaded by {nameOf(trip, p.uploadedBy)} · {new Date(p.date).toLocaleDateString()}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 h-max">
        <h3 className="font-display text-xl font-semibold">Add a package</h3>
        <div className="mt-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Package title" className={inputCls} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
          <select value={type} onChange={(e) => setType(e.target.value as "pdf" | "link" | "booking")} className={inputCls}>
            <option value="link">Link</option>
            <option value="pdf">PDF</option>
            <option value="booking">Booking</option>
          </select>
          <button className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Add package
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
 * ROUTES + PLACES
 * ============================================================ */
export function RoutesSection({ trip }: { trip: Trip }) {
  const [mode, setMode] = useState<"Speed" | "Experience" | "Golden Hour">("Experience");
  const [tag, setTag] = useState<"All" | "Nature" | "Food" | "Viewpoints" | "Offbeat">("All");
  const factors = ["Tea plantations", "Sunrise / Sunset", "Waterfalls", "Viewpoints", "Weather", "Crowd", "Road condition"];
  const filtered = tag === "All" ? trip.places : trip.places.filter((p) => p.tag === tag);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-xl font-semibold">AI scenic route</h3>
            <p className="text-sm text-muted-foreground">Munnar → Top Station</p>
          </div>
          <div className="flex rounded-full border border-border bg-card p-1 text-xs">
            {(["Speed", "Experience", "Golden Hour"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={"rounded-full px-3 py-1.5 " + (mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {trip.routes.map((r) => (
            <div
              key={r.id}
              className={
                "rounded-2xl border p-5 " +
                (r.type === "experience" ? "border-terracotta/40 bg-terracotta/5" : "border-border bg-card")
              }
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-semibold">{r.name}</div>
                {r.type === "experience" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-terracotta px-2 py-0.5 text-xs text-terracotta-foreground">
                    <Sparkles className="h-3 w-3" /> AI
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {r.duration} · {r.distance}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.stops.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3 py-1 text-xs">
                    <span>{s.icon}</span>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Factors considered</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {factors.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs">
                <Check className="h-3 w-3 text-success" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-xl font-semibold">Local picks</h3>
            <p className="text-sm text-muted-foreground">Hidden gems, not top-10 lists.</p>
          </div>
          <div className="flex gap-1 text-xs">
            {(["All", "Nature", "Food", "Viewpoints", "Offbeat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={
                  "rounded-full border px-3 py-1.5 " +
                  (tag === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-terracotta">{p.tag}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.source}</div>
                </div>
                <div className="mt-1 font-medium">{p.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * CHECKLIST
 * ============================================================ */
export function ChecklistSection({ trip }: { trip: Trip }) {
  const currentUserId = useTripStore((s) => s.currentUserId);
  const toggle = useTripStore((s) => s.toggleChecklist);
  const add = useTripStore((s) => s.addChecklistItem);
  const [label, setLabel] = useState("");
  const isOrganizer = trip.members.find((m) => m.id === currentUserId)?.role === "organizer";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    add(trip.id, label);
    setLabel("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Your packing list</h3>
        <p className="text-sm text-muted-foreground">Tick items as you pack. Your list is personal.</p>

        <ul className="mt-5 space-y-2">
          {trip.checklist.map((it) => {
            const done = it.completedBy.includes(currentUserId);
            return (
              <li key={it.id}>
                <button
                  onClick={() => toggle(trip.id, it.id, currentUserId)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 hover:bg-secondary transition text-left"
                >
                  <span
                    className={
                      "grid h-5 w-5 place-items-center rounded-md border " +
                      (done ? "border-primary bg-primary text-primary-foreground" : "border-border")
                    }
                  >
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <span className={"text-sm " + (done ? "line-through text-muted-foreground" : "")}>{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add item…" className={inputCls} />
          <button className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>

      {isOrganizer && (
        <div className="rounded-2xl border border-border bg-card p-6 h-max">
          <h3 className="font-display text-xl font-semibold">Group progress</h3>
          <p className="text-sm text-muted-foreground">Only you see this (organizer view).</p>
          <div className="mt-4 space-y-2">
            {trip.checklist.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span>{it.label}</span>
                <span className="text-xs text-muted-foreground">
                  {it.completedBy.length}/{trip.members.length} packed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * MAPS + WEATHER
 * ============================================================ */
export function MapsSection({ trip }: { trip: Trip }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-[16/10] w-full bg-muted">
          <iframe
            title="map"
            className="h-full w-full"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=76.9%2C10.0%2C77.15%2C10.15&layer=mapnik&marker=10.088%2C77.06`}
          />
        </div>
        <div className="p-4">
          <div className="font-medium">{trip.destination}</div>
          <div className="text-xs text-muted-foreground">Live map (OpenStreetMap)</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Weather</h3>
        <p className="text-sm text-muted-foreground">Forecast · mock</p>
        <div className="mt-5 space-y-3">
          {[
            { day: "Day 1", t: "22° / 14°", desc: "Light rain", icon: "🌦️" },
            { day: "Day 2", t: "24° / 15°", desc: "Sunny", icon: "☀️" },
            { day: "Day 3", t: "21° / 13°", desc: "Cloudy", icon: "☁️" },
            { day: "Day 4", t: "23° / 14°", desc: "Partly sunny", icon: "🌤️" },
          ].map((d) => (
            <div key={d.day} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{d.icon}</span>
                <div>
                  <div className="text-sm font-medium">{d.day}</div>
                  <div className="text-xs text-muted-foreground">{d.desc}</div>
                </div>
              </div>
              <div className="text-sm font-medium">{d.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * CHAT
 * ============================================================ */
export function ChatSection({ trip }: { trip: Trip }) {
  const addMessage = useTripStore((s) => s.addMessage);
  const currentUserId = useTripStore((s) => s.currentUserId);
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addMessage(trip.id, text);
    setText("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="h-[420px] overflow-y-auto p-6 space-y-3">
        {trip.messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground pt-24">Say hi to start the trip chat.</div>
        ) : (
          trip.messages.map((m) => {
            const mine = m.memberId === currentUserId;
            const member = trip.members.find((x) => x.id === m.memberId);
            return (
              <div key={m.id} className={"flex items-end gap-2 " + (mine ? "justify-end" : "")}>
                {!mine && <Avatar id={m.memberId} name={member?.name ?? "?"} />}
                <div
                  className={
                    "max-w-[75%] rounded-2xl px-4 py-2 " +
                    (mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md")
                  }
                >
                  {!mine && <div className="text-[11px] font-medium text-muted-foreground">{member?.name}</div>}
                  <div className="text-sm">{m.text}</div>
                  <div className={"text-[10px] mt-0.5 " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the group…" className={inputCls} />
        <button className="rounded-xl bg-primary px-4 text-sm text-primary-foreground hover:opacity-90">Send</button>
      </form>
    </div>
  );
}

/* ============================================================
 * DOCUMENTS
 * ============================================================ */
export function DocumentsSection({ trip }: { trip: Trip }) {
  const add = useTripStore((s) => s.addDocument);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    add(trip.id, f.name, `${Math.round(f.size / 1024)} KB`);
    e.target.value = "";
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold">Documents</h3>
          <p className="text-sm text-muted-foreground">Tickets, IDs, insurance — one place.</p>
        </div>
        <label className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 cursor-pointer">
          Upload
          <input type="file" onChange={onFile} className="hidden" />
        </label>
      </div>
      <div className="mt-5 divide-y divide-border">
        {trip.documents.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No documents yet.</div>
        ) : (
          trip.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {nameOf(trip, d.uploadedBy)} · {new Date(d.date).toLocaleDateString()} · {d.size}
                </div>
              </div>
              <a href="#" className="text-sm text-primary hover:underline">Open</a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * MEMBERS
 * ============================================================ */
export function MembersSection({ trip }: { trip: Trip }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold">Members</h3>
          <p className="text-sm text-muted-foreground">Invite code: <span className="font-mono">{trip.inviteCode}</span></p>
        </div>
        <button
          onClick={() => {
            const url = `${window.location.origin}/join/${trip.inviteCode}`;
            navigator.clipboard?.writeText(url);
          }}
          className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
        >
          Copy invite link
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {trip.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Avatar id={m.id} name={m.name} size="lg" />
            <div>
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * Shared
 * ============================================================ */
export function Avatar({ id, name, size = "sm" }: { id: string; name: string; size?: "sm" | "lg" }) {
  const cls =
    size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div
      className={
        "grid place-items-center rounded-full font-medium text-white shrink-0 " +
        avatarColor(id) +
        " " +
        cls
      }
      title={name}
    >
      {memberInitials(name)}
    </div>
  );
}
