import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTripChecklist, useAddChecklistItem, useToggleChecklist, useTripMembers } from "@/hooks/use-trip";
import { Check, Plus } from "lucide-react";
import { inputCls, nameOf } from "./helpers";
import { Avatar } from "./Avatar";

export function ChecklistSection({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { data: checklist = [] } = useTripChecklist(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const addMut = useAddChecklistItem(tripId);
  const toggleMut = useToggleChecklist(tripId);
  
  const [label, setLabel] = useState("");
  const isOrganizer = members.find((m) => m.user_id === user?.id)?.role === "organizer";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    addMut.mutate(label);
    setLabel("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Your packing list</h3>
        <p className="text-sm text-muted-foreground">Tick items as you pack. Your list is personal.</p>

        <ul className="mt-5 space-y-2">
          {checklist.map((it) => {
            const completions = it.checklist_completions || [];
            const done = completions.some((c: any) => c.user_id === user?.id);
            return (
              <li key={it.id}>
                <button
                  onClick={() => toggleMut.mutate(it.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 hover:bg-secondary transition text-left"
                >
                  <span
                    className={
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border " +
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
          <button disabled={addMut.isPending} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>

      {isOrganizer && (
        <div className="rounded-2xl border border-border bg-card p-6 h-max">
          <h3 className="font-display text-xl font-semibold">Group progress</h3>
          <p className="text-sm text-muted-foreground">Only you see this (organizer view).</p>
          <div className="mt-4 space-y-3">
            {checklist.map((it) => {
              const completions = it.checklist_completions || [];
              return (
                <div key={it.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{it.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {completions.length}/{members.length}
                    </span>
                  </div>
                  {completions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {completions.map((c: any) => (
                        <Avatar key={c.user_id} id={c.user_id} name={nameOf(members, c.user_id)} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
