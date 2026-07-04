import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTripStore } from "@/lib/store";
import { ArrowLeft, X } from "lucide-react";

export const Route = createFileRoute("/create-trip")({
  head: () => ({ meta: [{ title: "Create a trip · TripOS" }] }),
  component: CreateTrip,
});

function CreateTrip() {
  const navigate = useNavigate();
  const createTrip = useTripStore((s) => s.createTrip);

  const [name, setName] = useState("Munnar Trip");
  const [destination, setDestination] = useState("Munnar");
  const [start, setStart] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10));
  const [travelers, setTravelers] = useState(4);
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>(["Arun", "Karthik", "Neha"]);

  const addInvite = () => {
    const v = inviteInput.trim();
    if (!v) return;
    setInvites([...invites, v]);
    setInviteInput("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createTrip({ name, destination, startDate: start, endDate: end, travelers, invites });
    navigate({ to: "/trip/$tripId", params: { tripId: id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
        <Link to="/" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="font-display text-lg font-semibold">Create trip</div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <h1 className="font-display text-3xl font-semibold">Set up your trip</h1>
          <p className="mt-2 text-sm text-muted-foreground">A shared workspace for you and your friends. You can change everything later.</p>

          <div className="mt-8 grid gap-5">
            <Field label="Trip name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Destination">
              <input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} />
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

            <Field label="Invite friends">
              <div className="flex gap-2">
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInvite())}
                  placeholder="Name or email"
                  className={inputCls}
                />
                <button type="button" onClick={addInvite} className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium hover:bg-muted">
                  Add
                </button>
              </div>
              {invites.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {invites.map((n, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm">
                      {n}
                      <button type="button" onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <button className="mt-8 w-full rounded-full bg-primary py-4 font-medium text-primary-foreground hover:opacity-90 transition">
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
