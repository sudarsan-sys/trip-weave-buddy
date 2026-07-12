import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateTrip } from "@/hooks/use-trip";
import { ArrowLeft, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/create-trip")({
  head: () => ({ meta: [{ title: "Create a trip · TripOS" }] }),
  component: CreateTrip,
});

function CreateTrip() {
  const navigate = useNavigate();
  const { isLoggedIn, isInitialized } = useAuth();
  const createTrip = useCreateTrip();

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [travelers, setTravelers] = useState(4);
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

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



  const addInvite = async () => {
    const v = inviteInput.trim().toLowerCase();
    if (!v) return;
    if (invites.includes(v)) {
      setError(`@${v} is already added.`);
      return;
    }
    setCheckingUser(true);
    setError("");
    try {
      const { data, error: queryErr } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", v)
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (!data) {
        setError(`User @${v} does not exist.`);
        return;
      }

      setInvites([...invites, v]);
      setInviteInput("");
    } catch (err: any) {
      setError(err.message || "Failed to verify user.");
    } finally {
      setCheckingUser(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      const trip = await createTrip.mutateAsync({
        name,
        destination,
        startDate: start,
        endDate: end,
        budget: travelers * 10000,
        inviteUsernames: invites,
      });
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (err: any) {
      setError(err.message ?? "Failed to create trip");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
        <Link to="/dashboard" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="font-display text-lg font-semibold">Create trip</div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold">Set up your trip</h1>
          <p className="mt-2 text-sm text-muted-foreground">A shared workspace for you and your friends. You can change everything later.</p>

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-5">
            <Field label="Trip name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Munnar Trip" required className={inputCls} />
            </Field>
            <Field label="Destination">
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Munnar" className={inputCls} />
            </Field>
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Start date">
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </Field>
              <Field label="End date">
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Travelers">
                <input type="number" min={1} value={travelers} onChange={(e) => setTravelers(+e.target.value)} className={inputCls} />
              </Field>
            </div>

            <Field label="Invite friends (by username)">
              <div className="flex gap-2">
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInvite())}
                  placeholder="username"
                  className={inputCls}
                  disabled={checkingUser}
                />
                <button type="button" onClick={addInvite} disabled={checkingUser} className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
                  {checkingUser ? "..." : "Add"}
                </button>
              </div>
              {invites.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {invites.map((n, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm">
                      @{n}
                      <button type="button" onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Friends need to have a TripOS account. They'll see the invite on their dashboard.
              </p>
            </Field>
          </div>

          <button
            disabled={createTrip.isPending}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-full bg-primary py-4 font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {createTrip.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create trip
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
