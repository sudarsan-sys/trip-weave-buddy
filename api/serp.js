import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Basic in-memory rate limiter (per Vercel instance)
const rateLimit = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

const querySchema = z.object({
  q: z.string().min(1).max(100),
  engine: z.string().optional(),
});

export default async function handler(req, res) {
  // 1. Basic IP Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
  } else {
    const data = rateLimit.get(ip);
    if (now > data.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
    }
  }

  // 2. Authentication Verification (JWT)
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

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    console.error("Auth Error:", authError);
    return res.status(403).json({ error: "Forbidden: Invalid or expired token." });
  }

  // Extract all query parameters sent by the frontend
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  
  // 3. Input Validation with Zod
  const queryResult = querySchema.safeParse({
    q: searchParams.get("q"),
    engine: searchParams.get("engine") || undefined,
  });

  if (!queryResult.success) {
    return res.status(400).json({ error: "Invalid search query parameters.", details: queryResult.error.format() });
  }
  
  // Ensure we append the API key if it's somehow missing, 
  // though the frontend should pass it directly.
  if (!searchParams.has("api_key")) {
    if (!process.env.VITE_SERPAPI_KEY) {
      return res.status(500).json({ error: "Server misconfiguration: VITE_SERPAPI_KEY is missing." });
    }
    searchParams.set("api_key", process.env.VITE_SERPAPI_KEY);
  }

  const targetUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
