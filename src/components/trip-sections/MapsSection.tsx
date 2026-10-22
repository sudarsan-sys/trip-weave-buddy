import { useState, useEffect } from "react";
import { useTrip } from "@/hooks/use-trip";
import { useAuth } from "@/hooks/use-auth";
import { Cloud, MapPin, Navigation, Sparkles, Loader2, Wind, Droplets, ExternalLink, Globe } from "lucide-react";

/* ============================================================
 * Destination Sanitizer Helper
 * Cleans queries like "japan2027" -> "Japan" or "paris_vacation" -> "Paris"
 * so maps and weather APIs return direct 200 OK without failing.
 * ============================================================ */
export function cleanDestination(dest: string): string {
  if (!dest) return "";
  let clean = dest.trim().replace(/[_-]+/g, " ");
  // Strip trailing years or embedded years (e.g. 2027 in japan2027)
  clean = clean.replace(/(20\d\d)$/i, "").replace(/\b(20\d\d)\b/g, "");
  // Strip common travel filler words
  clean = clean.replace(/\b(trip|tour|vacation|holiday|visit|getaway)\b/gi, "").trim();
  // Capitalize first letter if all lowercase
  if (clean.length > 0 && clean === clean.toLowerCase()) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || dest;
}

/* ============================================================
 * Weather Cache
 * ============================================================ */
const weatherCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchWeather(destination: string, token: string) {
  if (!destination) return null;
  const key = destination.trim().toLowerCase();
  
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const apiKey = import.meta.env.VITE_SERPAPI_KEY;
  if (!apiKey) {
    console.warn("VITE_SERPAPI_KEY is not set in .env");
  }

  const url = new URL("/api/serp", window.location.origin);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `weather in ${destination}`);
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error("Failed to fetch weather");
  const data = await res.json();
  const weatherResult = data.answer_box || null;
  
  if (weatherResult) {
    weatherCache.set(key, { data: weatherResult, ts: Date.now() });
  }
  return weatherResult;
}

export function MapsSection({ tripId }: { tripId: string }) {
  const { data: trip } = useTrip(tripId);
  const { session } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const rawDestination = trip?.destination || "";
  const destination = cleanDestination(rawDestination);

  useEffect(() => {
    if (!destination || !session?.access_token) return;
    setLoadingWeather(true);
    fetchWeather(destination, session.access_token)
      .then(setWeather)
      .catch(console.error)
      .finally(() => setLoadingWeather(false));
  }, [destination, session?.access_token]);

  if (!rawDestination) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <div className="mt-3 font-display text-lg font-semibold">No destination set</div>
        <p className="mt-1 text-sm text-muted-foreground">Set a destination to view maps and weather.</p>
      </div>
    );
  }

  const mapQuery = encodeURIComponent(destination);
  // Direct Google Maps embed URL (allowed by CSP frame-src)
  const mapUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  
  // Directions links (opens natively in Google Maps app or web)
  const normalRoute = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  const scenicRoute = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}&dirflg=h`;
  const osmUrl = `https://www.openstreetmap.org/search?query=${mapQuery}`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map Embed & Actions */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          {/* Header bar with location & external links */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{destination}</span>
              {rawDestination !== destination && (
                <span className="text-xs text-muted-foreground">({rawDestination})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={normalRoute}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-muted-foreground/40">•</span>
              <a
                href={osmUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>OSM</span>
                <Globe className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Map Frame */}
          <div className="relative h-[380px] w-full bg-muted/20">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${destination}`}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Routes */}
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href={normalRoute}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground group-hover:text-primary transition">Normal Route</div>
              <p className="mt-1 text-sm text-muted-foreground">Fastest way to {destination} using major highways.</p>
            </div>
          </a>
          
          <a
            href={scenicRoute}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-4 rounded-2xl border border-terracotta/40 bg-terracotta/5 p-5 hover:border-terracotta transition group"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-terracotta/20 text-terracotta group-hover:bg-terracotta group-hover:text-terracotta-foreground transition">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-terracotta">Scenic Route</div>
              <p className="mt-1 text-sm text-muted-foreground/80">Avoids highways for a better roadtrip experience.</p>
            </div>
          </a>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="h-max space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-sky-500" /> Weather
          </h3>
          
          {loadingWeather ? (
            <div className="mt-6 flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Fetching weather for {destination}...</p>
            </div>
          ) : weather ? (
            <div className="mt-6">
              <div className="flex items-center gap-4">
                {weather.thumbnail && (
                  <img src={weather.thumbnail} alt={weather.weather} className="h-16 w-16" />
                )}
                <div>
                  <div className="text-4xl font-display font-semibold">
                    {weather.temperature}°{weather.unit === "Celsius" ? "C" : weather.unit === "Fahrenheit" ? "F" : weather.unit}
                  </div>
                  <div className="text-lg font-medium">{weather.weather}</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Droplets className="h-3.5 w-3.5" /> Precipitation
                  </div>
                  <div className="font-medium text-sm">{weather.precipitation || "0%"}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Wind className="h-3.5 w-3.5" /> Wind
                  </div>
                  <div className="font-medium text-sm">{weather.wind || "N/A"}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    Humidity
                  </div>
                  <div className="font-medium text-sm">{weather.humidity || "N/A"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-muted-foreground">
              Weather information is currently unavailable for {destination}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
