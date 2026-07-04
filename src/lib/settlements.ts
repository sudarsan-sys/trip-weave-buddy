import type { Expense, Member } from "./types";

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface PersonSummary {
  memberId: string;
  paid: number;
  share: number;
  net: number; // positive = owed money, negative = owes
}

/**
 * Calculate simplified settlements from a list of expenses.
 * Uses a greedy debt-simplification algorithm: repeatedly match the
 * largest creditor with the largest debtor.
 *
 * @param expenses list of expenses (amounts in rupees, can be decimal)
 * @param members  members participating in the trip
 * @param roundTo  if > 0, each settlement is rounded down to nearest multiple
 *                 (e.g. 5 or 10). Remainder is discarded so totals reconcile
 *                 to within `roundTo` per settlement.
 */
export function calculateSettlements(
  expenses: Expense[],
  members: Member[],
  roundTo = 0,
): { settlements: Settlement[]; summary: PersonSummary[]; adjusted: number } {
  const balances = new Map<string, number>();
  members.forEach((m) => balances.set(m.id, 0));

  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  members.forEach((m) => {
    paid.set(m.id, 0);
    share.set(m.id, 0);
  });

  for (const exp of expenses) {
    const split = exp.splitBetween.length ? exp.splitBetween : members.map((m) => m.id);
    // Floor divide to whole rupees; give remainder to the payer to reconcile
    const totalPaise = Math.round(exp.amount * 100);
    const per = Math.floor(totalPaise / split.length);
    const remainder = totalPaise - per * split.length;

    paid.set(exp.paidBy, (paid.get(exp.paidBy) ?? 0) + totalPaise);
    balances.set(exp.paidBy, (balances.get(exp.paidBy) ?? 0) + totalPaise);

    for (const mid of split) {
      share.set(mid, (share.get(mid) ?? 0) + per);
      balances.set(mid, (balances.get(mid) ?? 0) - per);
    }
    // Absorb remainder to payer so totals reconcile exactly
    if (remainder !== 0) {
      share.set(exp.paidBy, (share.get(exp.paidBy) ?? 0) + remainder);
      balances.set(exp.paidBy, (balances.get(exp.paidBy) ?? 0) - remainder);
    }
  }

  // Build creditor/debtor lists (in paise)
  const creditors: Array<{ id: string; amt: number }> = [];
  const debtors: Array<{ id: string; amt: number }> = [];
  for (const [id, bal] of balances) {
    if (bal > 0) creditors.push({ id, amt: bal });
    else if (bal < 0) debtors.push({ id, amt: -bal });
  }
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const settlements: Settlement[] = [];
  let adjustedPaise = 0;
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const transfer = Math.min(c.amt, d.amt);
    let rupees = transfer / 100;

    if (roundTo > 0) {
      const rounded = Math.floor(rupees / roundTo) * roundTo;
      adjustedPaise += (rupees - rounded) * 100;
      rupees = rounded;
    }

    if (rupees > 0) {
      settlements.push({ from: d.id, to: c.id, amount: rupees });
    }
    c.amt -= transfer;
    d.amt -= transfer;
    if (c.amt === 0) ci++;
    if (d.amt === 0) di++;
  }

  const summary: PersonSummary[] = members.map((m) => ({
    memberId: m.id,
    paid: (paid.get(m.id) ?? 0) / 100,
    share: (share.get(m.id) ?? 0) / 100,
    net: (balances.get(m.id) ?? 0) / 100,
  }));

  return { settlements, summary, adjusted: adjustedPaise / 100 };
}
