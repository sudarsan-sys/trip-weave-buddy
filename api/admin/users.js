import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default async function handler(req, res) {
  // 1. Authentication Verification (JWT)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const token = authHeader.split(" ")[1];

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server misconfiguration: Supabase keys are missing." });
  }

  // We use the anon key here because we want to act on behalf of the user sending the JWT
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return res.status(403).json({ error: "Forbidden: Invalid or expired token." });
  }

  const userId = authData.user.id;

  // 2. Authorization (RBAC)
  // Fetch the user's role from the profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: "Could not verify user role." });
  }

  if (profile.role !== "admin") {
    console.warn(`Unauthorized admin access attempt by user: ${userId}`);
    return res.status(403).json({ error: "Forbidden: Admin privileges required." });
  }

  // 3. Perform Privileged Operation
  // In a real scenario, this is where you might use the Service Role Key to fetch data 
  // bypassing RLS for admin panels, but for this demonstration we will just return a success message.
  
  return res.status(200).json({
    message: "Welcome to the Admin API",
    adminId: userId,
    status: "You have verified global admin privileges."
  });
}
