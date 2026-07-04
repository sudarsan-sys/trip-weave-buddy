import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { munnar } from "@/lib/mock-data";
import { Search, MapPin, Calendar, Users, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TripOS — Plan group trips in one place" },
      { name: "description", content: "Search a destination, plan with friends, split expenses, and keep every ticket and idea in one workspace." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
            T
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">TripOS</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/trip/$tripId" params={{ tripId: "demo" }} className="text-muted-foreground hover:text-foreground">
            Demo trip
          </Link>
          <Link
            to="/create-trip"
            className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition"
          >
            New trip
          </Link>
        </nav>
      </header>

      {!searched && (
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            One workspace instead of 5 apps
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-tight md:text-6xl">
            Plan the trip together.<br />
            <span className="text-terracotta">Actually together.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop juggling WhatsApp, Splitwise, Google Maps and Notion. TripOS is one place for
            packages, routes, expenses, and every idea your group throws around.
          </p>

          <form onSubmit={onSearch} className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <Search className="ml-3 h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “Munnar”"
              className="flex-1 bg-transparent px-2 py-3 outline-none placeholder:text-muted-foreground"
            />
            <button className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
              Search
            </button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Try: Munnar · Manali · Meghalaya</p>
        </section>
      )}

      {searched && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex items-end justify-between gap-4 py-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Destination</div>
              <h2 className="font-display text-4xl font-semibold">{munnar.name}, Kerala</h2>
            </div>
            <Link
              to="/create-trip"
              search={{ destination: munnar.name } as never}
              className="rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-terracotta-foreground hover:opacity-90 transition"
            >
              Plan this trip →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Est. budget" value={munnar.budget} />
            <StatCard icon={<Calendar className="h-4 w-4" />} label="Best season" value={munnar.season} />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Crowd"
              value={munnar.crowd}
              accent={
                munnar.crowd === "High" ? "bg-destructive/15 text-destructive" :
                munnar.crowd === "Medium" ? "bg-warning/20 text-foreground" :
                "bg-success/15 text-foreground"
              }
            />
            <StatCard icon={<MapPin className="h-4 w-4" />} label="Scenic routes" value={munnar.scenicRoutesTeaser} />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-semibold">Travel packages</h3>
              <p className="text-sm text-muted-foreground">Popular packages from agencies covering Munnar.</p>
              <div className="mt-5 grid gap-3">
                {munnar.packages.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 hover:bg-secondary transition">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.agency} · {p.duration}</div>
                    </div>
                    <div className="text-sm font-medium text-primary">{p.priceRange}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-semibold">Local experiences</h3>
              <p className="text-sm text-muted-foreground">Suggested by locals & past travelers.</p>
              <ul className="mt-5 space-y-3">
                {munnar.experiences.map((e) => (
                  <li key={e} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-terracotta" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-display text-xl font-semibold">Top places to visit</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {munnar.topPlaces.map((p) => (
                <div key={p.name} className="group overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-terracotta font-medium">{p.tag}</div>
                    <div className="mt-0.5 font-medium">{p.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <PlanCTA />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-2 inline-block rounded-md px-2 py-0.5 text-sm font-medium ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function PlanCTA() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate({ to: "/create-trip" })}
      className="rounded-full bg-primary px-8 py-4 text-primary-foreground shadow-sm hover:opacity-90 transition"
    >
      Plan this trip
    </button>
  );
}
