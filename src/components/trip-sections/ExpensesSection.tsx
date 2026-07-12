import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTrip, useTripMembers, useTripExpenses, useAddExpense, useRemoveExpense } from "@/hooks/use-trip";
import { calculateSettlements } from "@/lib/settlements";
import { Avatar } from "./Avatar";
import { inputCls, nameOf } from "./helpers";
import { Plus, Trash2, ArrowRight, AlertTriangle } from "lucide-react";

export function ExpensesSection({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const { data: expenses = [] } = useTripExpenses(tripId);
  const addMut = useAddExpense(tripId);
  const removeMut = useRemoveExpense(tripId);

  const budgetTotal = Number(trip?.budget_total ?? 0);
  const spent = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const remaining = budgetTotal - spent;

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Other");
  const [paidBy, setPaidBy] = useState("");
  const [split, setSplit] = useState<string[]>([]);
  const [roundOff, setRoundOff] = useState(false);
  const [roundTo, setRoundTo] = useState(5);

  const settlementMembers = members.map((m) => ({
    id: m.user_id,
    name: m.profiles?.display_name || m.profiles?.username || "?",
  }));
  const settlementExpenses = expenses.map((e) => ({
    amount: Number(e.amount),
    paidBy: e.paid_by,
    splitBetween: (e.expense_splits ?? []).map((s) => s.user_id),
  }));

  const { settlements, summary, adjusted } = useMemo(
    () => calculateSettlements(settlementExpenses, settlementMembers, roundOff ? roundTo : 0),
    [expenses, members, roundOff, roundTo],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || !desc.trim()) return;
    const payerId = paidBy || members[0]?.user_id;
    const splitIds = split.length ? split : members.map((m) => m.user_id);
    addMut.mutate({ amount: amt, description: desc, paidBy: payerId, splitBetween: splitIds, category });
    setAmount("");
    setDesc("");
    setCategory("Other");
  };

  const toggleSplit = (id: string) =>
    setSplit((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6">
      {remaining < 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm font-medium">
            Warning: Total expenses have exceeded the shared budget by ₹{Math.abs(remaining).toLocaleString()}.
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-xl font-semibold">Smart settlement</h3>
              <p className="text-sm text-muted-foreground">The fewest transactions to settle up.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={roundOff} onChange={(e) => setRoundOff(e.target.checked)} className="h-4 w-4" />
              Round off
              {roundOff && (
                <select value={roundTo} onChange={(e) => setRoundTo(+e.target.value)} className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <option value={5}>₹5</option>
                  <option value={10}>₹10</option>
                </select>
              )}
            </label>
          </div>
          {settlements.length === 0 ? (
            <div className="mt-6 rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">Everyone's square. Nothing to settle. 🎉</div>
          ) : (
            <div className="mt-5 space-y-2">
              {settlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar id={s.from} name={nameOf(members, s.from)} />
                    <div className="text-sm font-medium">{nameOf(members, s.from)}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-terracotta">₹{s.amount.toLocaleString()}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">{nameOf(members, s.to)}</div>
                    <Avatar id={s.to} name={nameOf(members, s.to)} />
                  </div>
                </div>
              ))}
              {roundOff && adjusted > 0 && (
                <div className="pt-2 text-xs text-muted-foreground">Remaining ₹{adjusted.toFixed(0)} adjusted for simplicity.</div>
              )}
            </div>
          )}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {summary.map((s) => {
              const name = nameOf(members, s.memberId);
              const owed = s.net > 0.005;
              const owing = s.net < -0.005;
              return (
                <div key={s.memberId} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar id={s.memberId} name={name} />
                    <div>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">Paid ₹{s.paid.toFixed(0)} · Share ₹{s.share.toFixed(0)}</div>
                    </div>
                  </div>
                  <div className={"text-sm font-semibold " + (owed ? "text-success" : owing ? "text-destructive" : "text-muted-foreground")}>
                    {owed && `+₹${s.net.toFixed(0)}`}
                    {owing && `−₹${Math.abs(s.net).toFixed(0)}`}
                    {!owed && !owing && "₹0"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold">All expenses</h3>
          {expenses.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">No expenses yet. Add the first one →</div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{e.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {nameOf(members, e.paid_by)} paid · split {(e.expense_splits ?? []).length}-ways
                      {e.category ? ` · ${e.category}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">₹{Number(e.amount).toLocaleString()}</div>
                    <button onClick={() => removeMut.mutate(e.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="Stay">Stay</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Activities">Activities</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Paid by</label>
            <select value={paidBy || members[0]?.user_id || ""} onChange={(e) => setPaidBy(e.target.value)} className={inputCls}>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name || m.profiles?.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Split between</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = split.length === 0 || split.includes(m.user_id);
                return (
                  <button type="button" key={m.user_id} onClick={() => toggleSplit(m.user_id)}
                    className={"rounded-full border px-3 py-1.5 text-xs transition " +
                      (on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40")}>
                    {m.profiles?.display_name || m.profiles?.username}
                  </button>
                );
              })}
            </div>
          </div>
          <button disabled={addMut.isPending} className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Add expense
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
