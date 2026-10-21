import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMyTrips, useMyInvitations, useAcceptInvitation, useDeclineInvitation } from "@/hooks/use-trip";
import { SyncButton } from "@/components/SyncButton";
import {
  Plus,
  MapPin,
  Calendar,
  Users,
  Mail,
  Check,
  X,
  LogOut,
  Loader2,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · TripOS" },
      { name: "description", content: "Your trip dashboard — manage trips, invitations, and more." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, isLoggedIn, isInitialized, signOut } = useAuth();
  const { data: trips, isLoading: loadingTrips } = useMyTrips();
  const { data: invitations, isLoading: loadingInvitations } = useMyInvitations();
  const acceptMut = useAcceptInvitation();
  const declineMut = useDeclineInvitation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (mounted && isInitialized && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [mounted, isInitialized, isLoggedIn, navigate]);

  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
              T
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">TripOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <SyncButton />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{profile?.display_name || profile?.username}</div>
              <div className="text-xs text-muted-foreground">@{profile?.username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-10">
        {/* Invitations */}
        {invitations && invitations.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-terracotta" />
              <h2 className="font-display text-xl font-semibold">
                Invitations
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-xs text-terracotta-foreground">
                  {invitations.length}
                </span>
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="rounded-2xl border border-terracotta/30 bg-card p-5 shadow-sm">
                  <div className="font-display text-lg font-semibold">
                    {inv.trips?.name ?? "Trip"}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {inv.trips?.destination && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {inv.trips.destination}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Invited by @{inv.inviter?.username ?? "unknown"}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => acceptMut.mutate(inv.id)}
                      disabled={acceptMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      onClick={() => declineMut.mutate(inv.id)}
                      disabled={declineMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Trips */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl font-semibold">My trips</h2>
            <Link
              to="/create-trip"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> New trip
            </Link>
          </div>

          {loadingTrips ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !trips || trips.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-border bg-card p-12 text-center">
              <Compass className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-display text-xl font-semibold">No trips yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Create your first trip or wait for a friend to invite you!
              </p>
              <Link
                to="/create-trip"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Create a trip
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip: any) => (
                <Link
                  key={trip.id}
                  to="/trip/$tripId"
                  params={{ tripId: trip.id }}
                  className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold group-hover:text-primary transition">
                        {trip.name}
                      </h3>
                      {trip.destination && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                        </div>
                      )}
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {trip.myRole}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {trip.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(trip.start_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {trip.myRole === "organizer" ? "Organizer" : "Member"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
