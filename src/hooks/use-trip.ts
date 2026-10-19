import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";
import type {
  Trip,
  TripMember,
  Invitation,
  Expense,
  ExpenseSplit,
  Package,
  ChecklistItem,
  ChatMessage,
  TripDocument,
  Place,
  TripRoute,
  Profile,
} from "@/lib/types";

/* ============================================================
 * KEYS
 * ============================================================ */
const keys = {
  myTrips: ["my-trips"] as const,
  myInvitations: ["my-invitations"] as const,
  trip: (id: string) => ["trip", id] as const,
  members: (id: string) => ["trip", id, "members"] as const,
  expenses: (id: string) => ["trip", id, "expenses"] as const,
  packages: (id: string) => ["trip", id, "packages"] as const,
  checklist: (id: string) => ["trip", id, "checklist"] as const,
  messages: (id: string) => ["trip", id, "messages"] as const,
  documents: (id: string) => ["trip", id, "documents"] as const,
  places: (id: string) => ["trip", id, "places"] as const,
  routes: (id: string) => ["trip", id, "routes"] as const,
};

async function readDocumentApiJson(response: Response): Promise<any> {
  const rawBody = await response.text();
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      "The document API returned HTML instead of a response. Restart the development server or deploy the latest build.",
    );
  }
}

/* ============================================================
 * QUERIES
 * ============================================================ */

/** My trips (via trip_members) */
export function useMyTrips() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.myTrips,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_members")
        .select(
          "trip_id, role, trips(id, name, destination, start_date, end_date, invite_code, budget_total, created_by, created_at, updated_at)",
        )
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row.trips,
        myRole: row.role,
      })) as (Trip & { myRole: string })[];
    },
  });
}

/** My pending invitations */
export function useMyInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.myInvitations,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select(
          "id, trip_id, invited_by, invited_user_id, status, created_at, responded_at, trips(id, name, destination, start_date, end_date, invite_code, budget_total, created_by, created_at, updated_at), inviter:invited_by(username, display_name)",
        )
        .eq("invited_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });
}

/** Single trip */
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: keys.trip(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, name, destination, start_date, end_date, invite_code, budget_total, created_by, created_at, updated_at",
        )
        .eq("id", tripId)
        .single();
      if (error) throw error;
      return data as Trip;
    },
  });
}

/** Trip members with profiles */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: keys.members(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_members")
        .select(
          "id, trip_id, user_id, role, joined_at, profiles(id, username, display_name, avatar_url, created_at, updated_at)",
        )
        .eq("trip_id", tripId);
      if (error) throw error;
      return (data ?? []) as TripMember[];
    },
  });
}

/** Expenses with splits */
export function useTripExpenses(tripId: string) {
  return useQuery({
    queryKey: keys.expenses(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id, trip_id, paid_by, amount, description, category, created_at, expense_splits(id, expense_id, user_id)",
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}

/** Packages */
export function useTripPackages(tripId: string) {
  return useQuery({
    queryKey: keys.packages(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, trip_id, title, type, uploaded_by, url, created_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Package[];
    },
  });
}

/** Checklist items with completions */
export function useTripChecklist(tripId: string) {
  return useQuery({
    queryKey: keys.checklist(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_items")
        .select(
          "id, trip_id, label, created_at, checklist_completions(id, item_id, user_id, completed_at)",
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
  });
}

/** Chat messages with profiles and reply_to_message */
export function useTripMessages(tripId: string) {
  return useQuery({
    queryKey: keys.messages(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          "id, trip_id, user_id, message, reply_to_id, created_at, profiles(id, username, display_name, avatar_url), reply_to_message:chat_messages!reply_to_id(message, user_id, profiles(id, username, display_name, avatar_url))",
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });
}

/** Documents */
export function useTripDocuments(tripId: string) {
  return useQuery({
    queryKey: keys.documents(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, trip_id, uploaded_by, file_name, storage_path, file_size, content_type, created_at",
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripDocument[];
    },
  });
}

/** Places */
export function useTripPlaces(tripId: string) {
  return useQuery({
    queryKey: keys.places(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("id, trip_id, name, image_url, description, tag, source, created_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Place[];
    },
  });
}

/** Routes with stops */
export function useTripRoutes(tripId: string) {
  return useQuery({
    queryKey: keys.routes(tripId),
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select(
          "id, trip_id, type, name, duration, distance, created_at, route_stops(id, route_id, name, icon, sort_order)",
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Sort stops by sort_order
      return ((data ?? []) as TripRoute[]).map((r) => ({
        ...r,
        route_stops: (r.route_stops ?? []).sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });
}

/* ============================================================
 * MUTATIONS
 * ============================================================ */

/** Create a trip */
export function useCreateTrip() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      destination: string;
      startDate: string;
      endDate: string;
      budget: number;
      inviteUsernames: string[];
    }) => {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      // 1. Insert trip
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          name: input.name,
          destination: input.destination,
          start_date: input.startDate || null,
          end_date: input.endDate || null,
          invite_code: code,
          budget_total: input.budget,
          created_by: user!.id,
        })
        .select()
        .single();
      if (tripErr) throw tripErr;

      // 2. Add creator as organizer
      const { error: memErr } = await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user!.id,
        role: "organizer",
      });
      if (memErr) throw memErr;

      // 3. Add default checklist items
      const defaults = [
        "Power bank",
        "Medicines",
        "Tickets",
        "ID / Aadhaar",
        "Raincoat",
        "Chargers",
      ];
      await supabase
        .from("checklist_items")
        .insert(defaults.map((label) => ({ trip_id: trip.id, label })));

      // 4. Send invitations
      for (const uname of input.inviteUsernames) {
        const trimmed = uname.trim().toLowerCase();
        if (!trimmed) continue;
        const { data: target, error: targetErr } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", trimmed)
          .maybeSingle();
        if (targetErr || !target) {
          throw new Error(`User @${trimmed} does not exist.`);
        }
        const { error: invErr } = await supabase.from("invitations").insert({
          trip_id: trip.id,
          invited_by: user!.id,
          invited_user_id: target.id,
        });
        if (invErr) throw invErr;
      }
      return trip as Trip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myTrips });
    },
  });
}

/** Add expense */
export function useAddExpense(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      description: string;
      paidBy: string;
      category?: string;
      splitBetween: string[];
    }) => {
      const { data: exp, error } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          paid_by: input.paidBy,
          amount: input.amount,
          description: input.description,
          category: input.category || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.splitBetween.length > 0) {
        await supabase.from("expense_splits").insert(
          input.splitBetween.map((uid) => ({
            expense_id: exp.id,
            user_id: uid,
          })),
        );
      }
      return exp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expenses(tripId) });
    },
  });
}
/** Remove expense */
export function useRemoveExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expenses(tripId) });
    },
  });
}

/** Add package */
export function useAddPackage(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; url: string; type: "pdf" | "link" | "booking" }) => {
      const { error } = await supabase.from("packages").insert({
        trip_id: tripId,
        title: input.title,
        url: input.url || "#",
        type: input.type,
        uploaded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.packages(tripId) });
    },
  });
}

/** Upload package file */
export function useUploadPackageFile(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { file: File; title: string }) => {
      const docId = crypto.randomUUID();
      const storagePath = `${tripId}/packages/${docId}/${input.file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("trip-documents")
        .upload(storagePath, input.file, { contentType: input.file.type });
      if (uploadErr) throw uploadErr;

      const { error: dbErr } = await supabase.from("packages").insert({
        trip_id: tripId,
        title: input.title,
        url: storagePath,
        type: "pdf",
        uploaded_by: user!.id,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.packages(tripId) });
    },
  });
}

/** Add checklist item */
export function useAddChecklistItem(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from("checklist_items").insert({ trip_id: tripId, label });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.checklist(tripId) });
    },
  });
}

/** Toggle checklist completion */
export function useToggleChecklist(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (itemId: string) => {
      // Check if already completed
      const { data: existing } = await supabase
        .from("checklist_completions")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("checklist_completions").delete().eq("id", existing.id);
      } else {
        await supabase.from("checklist_completions").insert({ item_id: itemId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.checklist(tripId) });
    },
  });
}

/** Set budget */
export function useSetBudget(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (total: number) => {
      const { error } = await supabase
        .from("trips")
        .update({ budget_total: total })
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.trip(tripId) });
    },
  });
}

/** Send chat message */
export function useSendMessage(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ message, replyToId }: { message: string; replyToId?: string | null }) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ trip_id: tripId, user_id: user!.id, message, reply_to_id: replyToId || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.messages(tripId) });
    },
  });
}

/** Upload document */
export function useUploadDocument(tripId: string) {
  const qc = useQueryClient();
  const { user, session } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!user || !session?.access_token)
        throw new Error("Please sign in before uploading a document.");
      const contentType = file.type || "application/octet-stream";
      const signResponse = await fetch("/api/s3-presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "upload",
          tripId,
          fileName: file.name,
          contentType,
          fileSize: file.size,
        }),
      });
      const signedUpload = await readDocumentApiJson(signResponse);
      if (!signResponse.ok) throw new Error(signedUpload.error || "Could not prepare S3 upload.");

      const uploadResponse = await fetch(signedUpload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Upload to S3 failed.");

      // Insert document record
      const { error: dbErr } = await supabase.from("documents").insert({
        trip_id: tripId,
        uploaded_by: user!.id,
        file_name: file.name,
        storage_path: signedUpload.storagePath,
        file_size: file.size,
        content_type: contentType,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.documents(tripId) });
    },
  });
}

/** Delete document (storage + db record) */
export function useDeleteDocument(tripId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async ({ docId, storagePath }: { docId: string; storagePath: string }) => {
      if (!session?.access_token) throw new Error("Please sign in before deleting a document.");
      const deleteResponse = await fetch("/api/s3-presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "delete", tripId, storagePath }),
      });
      const deleted = await readDocumentApiJson(deleteResponse);
      if (!deleteResponse.ok) throw new Error(deleted.error || "Could not delete the S3 document.");

      // Delete metadata after removing the S3 object.
      const { error: dbErr } = await supabase.from("documents").delete().eq("id", docId);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.documents(tripId) });
    },
  });
}

/** Accept invitation */
export function useAcceptInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      // Get invitation details
      const { data: inv, error: fetchErr } = await supabase
        .from("invitations")
        .select("id, trip_id, invited_by, invited_user_id, status, created_at, responded_at")
        .eq("id", invitationId)
        .single();
      if (fetchErr) throw fetchErr;

      // Update status
      await supabase
        .from("invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      // Add as trip member
      await supabase.from("trip_members").insert({
        trip_id: inv.trip_id,
        user_id: user!.id,
        role: "member",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myInvitations });
      qc.invalidateQueries({ queryKey: keys.myTrips });
    },
  });
}

/** Decline invitation */
export function useDeclineInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await supabase
        .from("invitations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", invitationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myInvitations });
    },
  });
}

/** Invite user by username */
export function useInviteUser(tripId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (username: string) => {
      const { data: target, error: lookupErr } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username.toLowerCase())
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!target) throw new Error("User not found");

      if (target.id === user!.id) throw new Error("You can't invite yourself");

      // Check if already a member
      const { data: existing } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", target.id)
        .maybeSingle();
      if (existing) throw new Error("User is already a member");

      const { error } = await supabase.from("invitations").insert({
        trip_id: tripId,
        invited_by: user!.id,
        invited_user_id: target.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.members(tripId) });
    },
  });
}

/** Join via invite code */
export function useJoinViaCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data: tripId, error } = await supabase.rpc("join_trip_by_code", {
        p_invite_code: inviteCode,
      });
      if (error) throw new Error(error.message || "Invalid invite code");
      if (!tripId) throw new Error("Invalid invite code");

      return { id: tripId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myTrips });
    },
  });
}

/** Get signed download URL for a document */
export async function getDocumentUrl(
  tripId: string,
  storagePath: string,
  accessToken: string | undefined,
): Promise<string> {
  if (!accessToken) throw new Error("Please sign in before opening a document.");
  const response = await fetch("/api/s3-presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "download", tripId, storagePath }),
  });
  const signedDownload = await readDocumentApiJson(response);
  if (!response.ok) throw new Error(signedDownload.error || "Could not open the S3 document.");
  return signedDownload.downloadUrl;
}

export { keys as queryKeys };
