import { useTrip, useTripMembers, useTripExpenses, useSetBudget } from "@/hooks/use-trip";
import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function WalletSection({ tripId }: { tripId: string }) {
  const { data: trip } = useTrip(tripId);
  const { data: expenses = [] } = useTripExpenses(tripId);
  const setBudgetMut = useSetBudget(tripId);

  const serverBudget = Number(trip?.budget_total ?? 0);
  const [localBudget, setLocalBudget] = useState(serverBudget.toString());

  useEffect(() => {
    setLocalBudget(serverBudget.toString());
  }, [serverBudget]);

  const handleBudgetBlur = () => {
    const val = Number(localBudget);
    if (!isNaN(val) && val !== serverBudget) {
      setBudgetMut.mutate(val);
    }
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalBudget(e.target.value);
  };

  const budgetTotal = Number(localBudget) || serverBudget;
  const spent = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const remaining = budgetTotal - spent;
  const pct = Math.min(100, (spent / Math.max(1, budgetTotal)) * 100);

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const c = e.category ?? "Other";
    acc[c] = (acc[c] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const catEntries = Object.entries(byCategory);
  const catTotal = catEntries.reduce((a, [, v]) => a + v, 0) || 1;
  const catColors: Record<string, string> = {
    Stay: "bg-primary", Food: "bg-terracotta", Travel: "bg-forest",
    Activities: "bg-warning", Other: "bg-muted-foreground",
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
              value={localBudget} 
              onChange={handleBudgetChange}
              onBlur={handleBudgetBlur}
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
          <div className={"h-full transition-all " + (remaining < 0 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{pct.toFixed(0)}% of ₹{budgetTotal.toLocaleString()} used</div>
          {remaining < 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-in fade-in slide-in-from-bottom-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Budget exceeded by ₹{Math.abs(remaining).toLocaleString()}
            </div>
          )}
        </div>
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
