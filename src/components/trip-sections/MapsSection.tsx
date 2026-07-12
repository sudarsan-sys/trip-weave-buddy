import { useState, useEffect } from "react";
import { useTrip } from "@/hooks/use-trip";
import { Cloud, MapPin, Navigation, Sparkles, Loader2, Wind, Droplets } from "lucide-react";

/* ============================================================
 * Weather Cache
 * ============================================================ */
const weatherCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchWeather(destination: string) {
  if (!destination) return null;
  const key = destination.trim().toLowerCase();
  
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = new URL("/api/serp/search.json", window.location.origin);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `weather in ${destination}`);
  url.searchParams.set("api_key", "b08f99fe9c6e8507fa20fb71f7a47da9a29e62739937c39e56092c24e6973e39");

  const res = await fetch(url.toString());
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
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const destination = trip?.destination || "";

  useEffect(() => {
    if (!destination) return;
    setLoadingWeather(true);
    fetchWeather(destination)
      .then(setWeather)
      .catch(console.error)
      .finally(() => setLoadingWeather(false));
  }, [destination]);

  if (!destination) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <div className="mt-3 font-display text-lg font-semibold">No destination set</div>
        <p className="mt-1 text-sm text-muted-foreground">Set a destination to view maps and weather.</p>
      </div>
    );
  }

  const mapQuery = encodeURIComponent(destination);
  // Free Google Maps iframe embed
  const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  
  // Directions links
  const normalRoute = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  // dirflg=h means Avoid Highways -> typically leads to more scenic backroads
  const scenicRoute = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}&dirflg=h`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map Embed */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden h-[400px]">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Destination Map"
          ></iframe>
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
              <p className="text-sm">Fetching weather...</p>
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
              Weather information is currently unavailable for this destination.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
