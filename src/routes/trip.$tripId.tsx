import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useTrip,
  useTripMembers,
  useTripExpenses,
} from "@/hooks/use-trip";
import { Avatar } from "@/components/trip-sections";
import { ChatSection } from "@/components/trip-sections/ChatSection";
import { DocumentsSection } from "@/components/trip-sections/DocumentsSection";
import { MembersSection } from "@/components/trip-sections/MembersSection";
import { ExpensesSection } from "@/components/trip-sections/ExpensesSection";
import { WalletSection } from "@/components/trip-sections/WalletSection";
import { PackagesSection } from "@/components/trip-sections/PackagesSection";
import { ChecklistSection } from "@/components/trip-sections/ChecklistSection";
import { MapsSection } from "@/components/trip-sections/MapsSection";
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
  Loader2,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";

export const Route = createFileRoute("/trip/$tripId")({
  head: () => ({ meta: [{ title: "Trip dashboard · TripOS" }] }),
  component: TripDashboard,
});

type Tab =
  | "overview"
  | "members"
  | "packages"
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
  const navigate = useNavigate();
  const { isLoggedIn, isInitialized, user } = useAuth();
  const { data: trip, isLoading: loadingTrip, error: tripError } = useTrip(tripId);
  const { data: members } = useTripMembers(tripId);
  const { data: expenses } = useTripExpenses(tripId);
  const [tab, setTab] = useState<Tab>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard
  useEffect(() => {
    if (mounted && isInitialized && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [mounted, isInitialized, isLoggedIn, navigate]);

  // Loading
  if (!mounted || !isInitialized || loadingTrip) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // Not found / access denied
  if (tripError || !trip) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
        <div>
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Trip not accessible</h1>
          <p className="mt-2 text-sm text-muted-foreground">This trip doesn't exist or you're not a member.</p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const daysToStart = trip.start_date ? daysBetween(new Date().toISOString(), trip.start_date) : 0;
  const totalSpent = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const membersList = members ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Trip header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="rounded-full p-2 hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl md:text-2xl font-semibold truncate">{trip.name}</h1>
              <span className="hidden sm:inline text-xs text-muted-foreground">· {trip.destination}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
              {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString()}`}
              {daysToStart > 0 && ` · in ${daysToStart} days`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 hidden sm:flex">
              {membersList.slice(0, 5).map((m) => (
                <div key={m.id} className="ring-2 ring-card rounded-full">
                  <Avatar id={m.user_id} name={m.profiles?.display_name || m.profiles?.username || "?"} />
                </div>
              ))}
              {membersList.length > 5 && (
                <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs ring-2 ring-card">
                  +{membersList.length - 5}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden rounded-full p-2 bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-[280px] max-w-[80vw] bg-card h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-display font-semibold text-lg">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="rounded-full p-2 hover:bg-secondary transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = tab === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setTab(n.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={
                      "flex items-center w-full gap-3 rounded-xl px-4 py-3 text-sm transition " +
                      (active
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar (Desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:h-max">
          <nav className="flex flex-col gap-1">
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
            <OverviewTab
              trip={trip}
              daysToStart={daysToStart}
              spent={totalSpent}
              members={membersList}
              expenses={expenses ?? []}
            />
          )}
          {tab === "members" && <MembersSection tripId={tripId} />}
          {tab === "packages" && <PackagesSection tripId={tripId} />}
          {tab === "expenses" && <ExpensesSection tripId={tripId} />}
          {tab === "wallet" && <WalletSection tripId={tripId} />}
          {tab === "checklist" && <ChecklistSection tripId={tripId} />}
          {tab === "maps" && <MapsSection tripId={tripId} />}
          {tab === "chat" && <ChatSection tripId={tripId} />}
          {tab === "documents" && <DocumentsSection tripId={tripId} />}
        </main>
      </div>
    </div>
  );
}

function OverviewTab({
  trip,
  daysToStart,
  spent,
  members,
  expenses,
}: {
  trip: any;
  daysToStart: number;
  spent: number;
  members: any[];
  expenses: any[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Days to go" value={daysToStart > 0 ? `${daysToStart}` : "Today!"} suffix={daysToStart > 0 ? "days" : ""} />
        <Stat label="Spent" value={`₹${spent.toLocaleString()}`} suffix={`of ₹${Number(trip.budget_total).toLocaleString()}`} />
        <Stat label="Members" value={`${members.length}`} suffix="travelers" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold">Trip at a glance</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Destination</dt>
              <dd className="mt-1 font-medium">{trip.destination || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Duration</dt>
              <dd className="mt-1 font-medium">
                {trip.start_date && trip.end_date
                  ? `${daysBetween(trip.start_date, trip.end_date)} days`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Members</dt>
              <dd className="mt-1 font-medium">{members.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Invite code</dt>
              <dd className="mt-1 font-mono">{trip.invite_code}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold">Recent expenses</h3>
          <div className="mt-4 divide-y divide-border">
            {expenses.slice(0, 5).map((e: any) => {
              const payer = members.find((m) => m.user_id === e.paid_by);
              return (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium">{e.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {payer?.profiles?.display_name || payer?.profiles?.username || "Unknown"} paid
                    </div>
                  </div>
                  <div className="text-sm font-semibold">₹{Number(e.amount).toLocaleString()}</div>
                </div>
              );
            })}
            {expenses.length === 0 && <div className="py-3 text-sm text-muted-foreground">No expenses yet.</div>}
          </div>
        </div>
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
