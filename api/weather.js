export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = url.searchParams.get('q') || '';
  
  const targetUrl = new URL('https://serpapi.com/search.json');
  targetUrl.searchParams.set('engine', 'google');
  targetUrl.searchParams.set('q', q);
  targetUrl.searchParams.set('api_key', 'b08f99fe9c6e8507fa20fb71f7a47da9a29e62739937c39e56092c24e6973e39');

  try {
    const response = await fetch(targetUrl.toString());
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
}
