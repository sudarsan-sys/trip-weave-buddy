// Basic in-memory rate limiter (per Vercel instance)
const rateLimit = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

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

  // Extract all query parameters sent by the frontend
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  
  // 2. Input Validation
  const query = searchParams.get("q");
  if (!query || typeof query !== 'string' || query.length > 100) {
    return res.status(400).json({ error: "Invalid or missing search query (max 100 chars)." });
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
