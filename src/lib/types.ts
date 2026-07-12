/* ============================================================
 * Database-aligned types for TripOS
 * ============================================================ */

export type Role = "organizer" | "member";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  invite_code: string;
  budget_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  /* joined via query */
  profiles?: Profile;
}

export interface Invitation {
  id: string;
  trip_id: string;
  invited_by: string;
  invited_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  /* joined via query */
  trips?: Trip;
  inviter?: Profile;
}

export interface Expense {
  id: string;
  trip_id: string;
  paid_by: string;
  amount: number;
  description: string;
  category: "Stay" | "Food" | "Travel" | "Activities" | "Other" | null;
  created_at: string;
  /* joined */
  expense_splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
}

export interface Package {
  id: string;
  trip_id: string;
  title: string;
  type: "pdf" | "link" | "booking";
  uploaded_by: string;
  url: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  trip_id: string;
  label: string;
  created_at: string;
  /* joined */
  checklist_completions?: ChecklistCompletion[];
}

export interface ChecklistCompletion {
  id: string;
  item_id: string;
  user_id: string;
  completed_at: string;
}

export interface ChatMessage {
  id: string;
  trip_id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to_id?: string | null;
  /* joined */
  profiles?: Profile;
  reply_to_message?: { message: string, profiles?: Profile } | null;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  tag: "Nature" | "Food" | "Viewpoints" | "Offbeat" | null;
  source: string | null;
  created_at: string;
}

export interface TripRoute {
  id: string;
  trip_id: string;
  type: "fastest" | "experience";
  name: string;
  duration: string | null;
  distance: string | null;
  created_at: string;
  /* joined */
  route_stops?: RouteStop[];
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  icon: string;
  sort_order: number;
}

/* ============================================================
 * Convenience types for the settlement calculator
 * ============================================================ */
export interface SettlementMember {
  id: string;
  name: string;
}

export interface SettlementExpense {
  amount: number;
  paidBy: string;
  splitBetween: string[];
}
