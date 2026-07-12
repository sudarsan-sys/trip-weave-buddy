export default async function handler(req, res) {
  // Extract all query parameters sent by the frontend
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  
  // Ensure we append the API key if it's somehow missing, 
  // though the frontend should pass it directly.
  if (!searchParams.has("api_key")) {
    searchParams.set("api_key", process.env.VITE_SERPAPI_KEY || "b08f99fe9c6e8507fa20fb71f7a47da9a29e62739937c39e56092c24e6973e39");
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
