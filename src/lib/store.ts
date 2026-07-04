import { create } from "zustand";
import type { Trip, Expense, Package, ChecklistItem, Member, ChatMessage, TripDocument } from "./types";
import { munnar } from "./mock-data";

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultChecklist = (): ChecklistItem[] =>
  ["Power bank", "Medicines", "Tickets", "ID / Aadhaar", "Raincoat", "Chargers"].map((label) => ({
    id: uid(),
    label,
    completedBy: [],
  }));

const seedMembers: Member[] = [
  { id: "m1", name: "Sudarsan", role: "organizer" },
  { id: "m2", name: "Arun", role: "member" },
  { id: "m3", name: "Karthik", role: "member" },
  { id: "m4", name: "Neha", role: "member" },
];

const seedTrip: Trip = {
  id: "demo",
  inviteCode: "MUNNAR24",
  name: "Munnar Trip",
  destination: "Munnar",
  startDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
  members: seedMembers,
  budget: { total: 40000, categories: { Stay: 0, Food: 0, Travel: 0, Activities: 0 } },
  packages: [
    {
      id: uid(),
      title: "Kerala Trails – Munnar 3N/4D",
      type: "pdf",
      uploadedBy: "m1",
      url: "#",
      date: new Date().toISOString(),
    },
    {
      id: uid(),
      title: "Airbnb – Hillside Cottage",
      type: "booking",
      uploadedBy: "m2",
      url: "https://airbnb.com",
      date: new Date().toISOString(),
    },
  ],
  expenses: [
    { id: uid(), amount: 4800, paidBy: "m1", description: "Cab from Kochi", splitBetween: ["m1", "m2", "m3", "m4"], date: new Date().toISOString(), category: "Travel" },
    { id: uid(), amount: 2400, paidBy: "m2", description: "Lunch at Saravana", splitBetween: ["m1", "m2", "m3", "m4"], date: new Date().toISOString(), category: "Food" },
    { id: uid(), amount: 6000, paidBy: "m3", description: "Homestay night 1", splitBetween: ["m1", "m2", "m3", "m4"], date: new Date().toISOString(), category: "Stay" },
    { id: uid(), amount: 900, paidBy: "m4", description: "Tea Museum tickets", splitBetween: ["m1", "m2", "m3"], date: new Date().toISOString(), category: "Activities" },
  ],
  checklist: defaultChecklist(),
  places: munnar.places,
  routes: munnar.routes,
  messages: [
    { id: uid(), memberId: "m1", text: "Booked the cab from Kochi ✌️", time: "9:12 AM" },
    { id: uid(), memberId: "m2", text: "Nice — I'll get snacks for the drive", time: "9:14 AM" },
    { id: uid(), memberId: "m3", text: "Anyone bringing a bluetooth speaker?", time: "9:20 AM" },
  ],
  documents: [
    { id: uid(), name: "Flight tickets.pdf", uploadedBy: "m1", date: new Date().toISOString(), size: "412 KB" },
    { id: uid(), name: "Homestay confirmation.pdf", uploadedBy: "m3", date: new Date().toISOString(), size: "88 KB" },
  ],
};

interface TripState {
  trips: Record<string, Trip>;
  currentUserId: string;
  createTrip: (input: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    invites: string[];
  }) => string;
  addExpense: (tripId: string, e: Omit<Expense, "id" | "date">) => void;
  removeExpense: (tripId: string, id: string) => void;
  addPackage: (tripId: string, p: Omit<Package, "id" | "date">) => void;
  addChecklistItem: (tripId: string, label: string) => void;
  toggleChecklist: (tripId: string, itemId: string, memberId: string) => void;
  setBudget: (tripId: string, total: number) => void;
  addMessage: (tripId: string, text: string) => void;
  addDocument: (tripId: string, name: string, size: string) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: { demo: seedTrip },
  currentUserId: "m1",
  createTrip: (input) => {
    const id = uid();
    const inviteCode = id.toUpperCase().slice(0, 6);
    const extraMembers: Member[] = input.invites.map((name, i) => ({
      id: `n${i}${uid().slice(0, 4)}`,
      name,
      role: "member",
    }));
    const trip: Trip = {
      id,
      inviteCode,
      name: input.name,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      members: [{ id: "m1", name: "You", role: "organizer" }, ...extraMembers],
      budget: { total: input.travelers * 10000, categories: {} },
      packages: [],
      expenses: [],
      checklist: defaultChecklist(),
      places: munnar.places,
      routes: munnar.routes,
      messages: [],
      documents: [],
    };
    set((s) => ({ trips: { ...s.trips, [id]: trip } }));
    return id;
  },
  addExpense: (tripId, e) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      const expense: Expense = { ...e, id: uid(), date: new Date().toISOString() };
      return { trips: { ...s.trips, [tripId]: { ...trip, expenses: [expense, ...trip.expenses] } } };
    }),
  removeExpense: (tripId, id) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      return { trips: { ...s.trips, [tripId]: { ...trip, expenses: trip.expenses.filter((e) => e.id !== id) } } };
    }),
  addPackage: (tripId, p) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      const pkg: Package = { ...p, id: uid(), date: new Date().toISOString() };
      return { trips: { ...s.trips, [tripId]: { ...trip, packages: [pkg, ...trip.packages] } } };
    }),
  addChecklistItem: (tripId, label) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      return { trips: { ...s.trips, [tripId]: { ...trip, checklist: [...trip.checklist, { id: uid(), label, completedBy: [] }] } } };
    }),
  toggleChecklist: (tripId, itemId, memberId) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      const checklist = trip.checklist.map((it) => {
        if (it.id !== itemId) return it;
        const has = it.completedBy.includes(memberId);
        return { ...it, completedBy: has ? it.completedBy.filter((m) => m !== memberId) : [...it.completedBy, memberId] };
      });
      return { trips: { ...s.trips, [tripId]: { ...trip, checklist } } };
    }),
  setBudget: (tripId, total) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      return { trips: { ...s.trips, [tripId]: { ...trip, budget: { ...trip.budget, total } } } };
    }),
  addMessage: (tripId, text) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      const msg: ChatMessage = {
        id: uid(),
        memberId: s.currentUserId,
        text,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
      return { trips: { ...s.trips, [tripId]: { ...trip, messages: [...trip.messages, msg] } } };
    }),
  addDocument: (tripId, name, size) =>
    set((s) => {
      const trip = s.trips[tripId];
      if (!trip) return s;
      const doc: TripDocument = { id: uid(), name, uploadedBy: s.currentUserId, date: new Date().toISOString(), size };
      return { trips: { ...s.trips, [tripId]: { ...trip, documents: [doc, ...trip.documents] } } };
    }),
}));

export const memberInitials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const avatarColor = (id: string) => {
  const palette = ["bg-terracotta", "bg-forest", "bg-primary", "bg-warning", "bg-success"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};
