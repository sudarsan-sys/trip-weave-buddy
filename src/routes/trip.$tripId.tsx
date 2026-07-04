import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTripStore } from "@/lib/store";
import {
  ExpensesSection,
  WalletSection,
  PackagesSection,
  RoutesSection,
  ChecklistSection,
  MapsSection,
  ChatSection,
  DocumentsSection,
  MembersSection,
  Avatar,
} from "@/components/trip-sections";
import {
  LayoutDashboard,
  Users,
  Package,
  Map,
  Wallet,
  Receipt,
  CheckSquare,
  MapPin,
  MessageCircle,
  Files,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/trip/$tripId")({
  head: () => ({ meta: [{ title: "Trip dashboard · TripOS" }] }),
  component: TripDashboard,
});

type Tab =
  | "overview"
  | "members"
  | "packages"
  | "routes"
  | "expenses"
  | "wallet"
  | "checklist"
  | "maps"
  | "chat"
  | "documents";

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "packages", label: "Package Hub", icon: Package },
  { id: "routes", label: "Routes & Places", icon: Map },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "maps", label: "Maps & Weather", icon: MapPin },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "documents", label: "Documents", icon: Files },
];

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function TripDashboard() {
  const { tripId } = useParams({ from: "/trip/$tripId" });
  const trip = useTripStore((s) => s.trips[tripId]);
  const [tab, setTab] = useState<Tab>("overview");

  if (!trip) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Trip not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This trip doesn't exist in your workspace.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const daysToStart = daysBetween(new Date().toISOString(), trip.startDate);
  const spent = trip.expenses.reduce((a, e) => a + e.amount, 0);
  const checklistTotal = trip.checklist.length * trip.members.length;
  const checklistDone = trip.checklist.reduce((a, i) => a + i.completedBy.length, 0);
  const checklistPct = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Consistent trip header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 flex items-center gap-4">
          <Link to="/" className="rounded-full p-2 hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl md:text-2xl font-semibold truncate">{trip.name}</h1>
              <span className="hidden sm:inline text-xs text-muted-foreground">· {trip.destination}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.endDate).toLocaleDateString()}
              {daysToStart > 0 && ` · in ${daysToStart} days`}
            </div>
          </div>
          <div className="flex -space-x-2">
            {trip.members.slice(0, 5).map((m) => (
              <div key={m.id} className="ring-2 ring-card rounded-full">
                <Avatar id={m.id} name={m.name} />
              </div>
            ))}
            {trip.members.length > 5 && (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs ring-2 ring-card">
                +{trip.members.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:h-max">
          <nav className="flex overflow-x-auto lg:flex-col gap-1 -mx-4 px-4 lg:mx-0 lg:px-0">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setTab(n.id)}
                  className={
                    "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition " +
                    (active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Stat label="Days to go" value={daysToStart > 0 ? `${daysToStart}` : "Today!"} suffix={daysToStart > 0 ? "days" : ""} />
                <Stat label="Spent" value={`₹${spent.toLocaleString()}`} suffix={`of ₹${trip.budget.total.toLocaleString()}`} />
                <Stat label="Checklist" value={`${checklistPct}%`} suffix="group progress" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-display text-xl font-semibold">Trip at a glance</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">Destination</dt>
                      <dd className="mt-1 font-medium">{trip.destination}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">Duration</dt>
                      <dd className="mt-1 font-medium">{daysBetween(trip.startDate, trip.endDate)} days</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">Members</dt>
                      <dd className="mt-1 font-medium">{trip.members.length}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">Invite code</dt>
                      <dd className="mt-1 font-mono">{trip.inviteCode}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-display text-xl font-semibold">Recent expenses</h3>
                  <div className="mt-4 divide-y divide-border">
                    {trip.expenses.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <div className="text-sm font-medium">{e.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {trip.members.find((m) => m.id === e.paidBy)?.name} paid
                          </div>
                        </div>
                        <div className="text-sm font-semibold">₹{e.amount.toLocaleString()}</div>
                      </div>
                    ))}
                    {trip.expenses.length === 0 && <div className="py-3 text-sm text-muted-foreground">No expenses yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "members" && <MembersSection trip={trip} />}
          {tab === "packages" && <PackagesSection trip={trip} />}
          {tab === "routes" && <RoutesSection trip={trip} />}
          {tab === "expenses" && <ExpensesSection trip={trip} />}
          {tab === "wallet" && <WalletSection trip={trip} />}
          {tab === "checklist" && <ChecklistSection trip={trip} />}
          {tab === "maps" && <MapsSection trip={trip} />}
          {tab === "chat" && <ChatSection trip={trip} />}
          {tab === "documents" && <DocumentsSection trip={trip} />}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-display text-3xl font-semibold">{value}</div>
        {suffix && <div className="text-xs text-muted-foreground">{suffix}</div>}
      </div>
    </div>
  );
}
