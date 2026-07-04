export type Role = "organizer" | "member";

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export interface Expense {
  id: string;
  amount: number;
  paidBy: string;
  description: string;
  splitBetween: string[];
  date: string;
  category?: "Stay" | "Food" | "Travel" | "Activities" | "Other";
}

export interface Package {
  id: string;
  title: string;
  type: "pdf" | "link" | "booking";
  uploadedBy: string;
  url: string;
  date: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completedBy: string[];
}

export interface Place {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  tag: "Nature" | "Food" | "Viewpoints" | "Offbeat";
  source: string;
}

export interface RouteStop {
  name: string;
  icon: string;
}

export interface TripRoute {
  id: string;
  type: "fastest" | "experience";
  name: string;
  duration: string;
  distance: string;
  stops: RouteStop[];
}

export interface ChatMessage {
  id: string;
  memberId: string;
  text: string;
  time: string;
}

export interface TripDocument {
  id: string;
  name: string;
  uploadedBy: string;
  date: string;
  size: string;
}

export interface Trip {
  id: string;
  inviteCode: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: Member[];
  budget: { total: number; categories: Record<string, number> };
  packages: Package[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  places: Place[];
  routes: TripRoute[];
  messages: ChatMessage[];
  documents: TripDocument[];
}
