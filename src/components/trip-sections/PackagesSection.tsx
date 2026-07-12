import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTripPackages, useAddPackage, useUploadPackageFile, getDocumentUrl, useTripMembers, useTrip } from "@/hooks/use-trip";
import { nameOf, inputCls } from "./helpers";
import { Search, ExternalLink, MapPin, Package, Loader2, Globe } from "lucide-react";

/* ============================================================
 * SerpApi in-memory cache — avoids duplicate API calls
 * ============================================================ */
const serpCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function serpSearch(query: string): Promise<any> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cached = serpCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = new URL("/api/serp/search.json", window.location.origin);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", "b08f99fe9c6e8507fa20fb71f7a47da9a29e62739937c39e56092c24e6973e39");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpApi error: ${res.status}`);
  const data = await res.json();
  serpCache.set(key, { data, ts: Date.now() });
  return data;
}

/* ============================================================
 * Sub-tab type
 * ============================================================ */
type SubTab = "packages" | "search" | "places";

/* ============================================================
 * PackagesSection
 * ============================================================ */
export function PackagesSection({ tripId }: { tripId: string }) {
  const { data: packages = [] } = useTripPackages(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const { data: trip } = useTrip(tripId);
  const addMut = useAddPackage(tripId);
  const uploadMut = useUploadPackageFile(tripId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"pdf" | "link" | "booking">("link");
  const [subTab, setSubTab] = useState<SubTab>("packages");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === "pdf" && file) {
      await uploadMut.mutateAsync({ title, file });
    } else {
      await addMut.mutateAsync({ title, url: url || "#", type });
    }
    setTitle(""); setUrl(""); setFile(null);
  };

  const handlePdfClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    try {
      const signedUrl = await getDocumentUrl(path);
      window.open(signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to open PDF.");
    }
  };

  const destination = trip?.destination || "";

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 w-max">
        {([
          { id: "packages" as SubTab, label: "My Packages", icon: Package },
          { id: "search" as SubTab, label: "Search Packages", icon: Search },
          { id: "places" as SubTab, label: "Discover Places", icon: MapPin },
        ]).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
                (active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* My Packages tab */}
      {subTab === "packages" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {packages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <div className="font-display text-lg font-semibold">No packages yet</div>
                <p className="mt-1 text-sm text-muted-foreground">Add the one your friend shared in WhatsApp so nobody has to ask for it again.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    onClick={p.type === "pdf" ? (e) => handlePdfClick(e, p.url) : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-border bg-card p-5 hover:border-primary transition cursor-pointer block"
                  >
                    <div className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-widest text-muted-foreground">{p.type}</div>
                    <div className="mt-2 font-medium">{p.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Uploaded by {nameOf(members, p.uploaded_by)} · {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 h-max">
            <h3 className="font-display text-xl font-semibold">Add a package</h3>
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Package title" className={inputCls} />
              <select value={type} onChange={(e) => setType(e.target.value as any)} className={inputCls}>
                <option value="link">Link</option><option value="pdf">PDF</option><option value="booking">Booking</option>
              </select>
              {type === "pdf" ? (
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className={inputCls} />
              ) : (
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" className={inputCls} />
              )}
              <button disabled={addMut.isPending || uploadMut.isPending || (type === "pdf" && !file)} className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {uploadMut.isPending ? "Uploading..." : "Add package"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Packages tab */}
      {subTab === "search" && (
        <SearchPackages destination={destination} />
      )}

      {/* Discover Places tab */}
      {subTab === "places" && (
        <DiscoverPlaces destination={destination} />
      )}
    </div>
  );
}

/* ============================================================
 * SearchPackages — SerpApi Google Search with debounce + cache
 * ============================================================ */
let globalSearchState = { query: "", results: null as any };

function SearchPackages({ destination }: { destination: string }) {
  const [query, setQuery] = useState(globalSearchState.query);
  const [results, setResults] = useState<any>(globalSearchState.results);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const suggestions = destination
    ? [
        `hotels in ${destination}`,
        `flights to ${destination}`,
        `things to do in ${destination}`,
        `restaurants in ${destination}`,
      ]
    : [];

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await serpSearch(q);
      setResults(data);
      globalSearchState.query = q;
      globalSearchState.results = data;
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const organicResults = results?.organic_results ?? [];
  const shoppingResults = results?.shopping_results ?? results?.immersive_products ?? [];

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              globalSearchState.query = e.target.value;
            }}
            placeholder={destination ? `Search packages for ${destination}...` : "Search travel packages..."}
            className={inputCls + " pl-10"}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Quick suggestions */}
      {suggestions.length > 0 && !results && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                globalSearchState.query = s;
                doSearch(s);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* Shopping results */}
      {shoppingResults.length > 0 && (
        <div>
          <h4 className="font-display text-lg font-semibold mb-3">Products & Deals</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shoppingResults.slice(0, 6).map((r: any, i: number) => (
              <a
                key={i}
                href={r.link}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition group"
              >
                {r.thumbnail && (
                  <img src={r.thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover mb-3" />
                )}
                <div className="text-sm font-medium group-hover:text-primary transition line-clamp-2">{r.title}</div>
                {r.price && <div className="mt-1 text-sm font-semibold text-emerald-600">{r.price}</div>}
                <div className="mt-1 text-xs text-muted-foreground">{r.source}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Organic results */}
      {organicResults.length > 0 && (
        <div>
          <h4 className="font-display text-lg font-semibold mb-3">Web Results</h4>
          <div className="grid gap-3">
            {organicResults.slice(0, 8).map((r: any, i: number) => (
              <a
                key={i}
                href={r.link}
                target="_blank"
                rel="noreferrer"
                className="flex gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition group"
              >
                {r.thumbnail && (
                  <img src={r.thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium group-hover:text-primary transition line-clamp-1">{r.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.snippet}</div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {r.displayed_link || r.source}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </a>
            ))}
          </div>
        </div>
      )}

      {results && organicResults.length === 0 && shoppingResults.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="font-display text-lg font-semibold">No results found</div>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search query.</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * DiscoverPlaces — auto-search with SerpApi + cache
 * ============================================================ */
function DiscoverPlaces({ destination }: { destination: string }) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search once when destination is available
  useEffect(() => {
    if (!destination || hasSearched) return;
    setHasSearched(true);
    setLoading(true);
    setError("");
    serpSearch(`best places to visit in ${destination}`)
      .then((data) => setResults(data))
      .catch((err: any) => setError(err.message || "Failed to discover places"))
      .finally(() => setLoading(false));
  }, [destination, hasSearched]);

  const placesSites = results?.places_sites ?? [];
  const localResults = results?.local_results?.places ?? [];
  const organicResults = results?.organic_results ?? [];

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Discovering places in {destination}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
    );
  }

  if (!destination) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <div className="mt-3 font-display text-lg font-semibold">No destination set</div>
        <p className="mt-1 text-sm text-muted-foreground">Set a destination for your trip to discover places.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Places Sites */}
      {placesSites.length > 0 && (
        <div>
          <h4 className="font-display text-lg font-semibold mb-3">Popular Sites</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {placesSites.map((p: any, i: number) => (
              <a
                key={i}
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition group"
              >
                {p.source_thumbnail && (
                  <img src={p.source_thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium group-hover:text-primary transition line-clamp-2">{p.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.source}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Local Results */}
      {localResults.length > 0 && (
        <div>
          <h4 className="font-display text-lg font-semibold mb-3">Nearby Places</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localResults.map((p: any, i: number) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition"
              >
                <div className="flex items-start gap-3">
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.type}</div>
                    {p.rating && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <span className="text-amber-500">★ {p.rating}</span>
                        <span className="text-muted-foreground">({p.reviews})</span>
                      </div>
                    )}
                    {p.address && (
                      <div className="mt-1 text-xs text-muted-foreground">{p.address}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organic fallback for places */}
      {placesSites.length === 0 && localResults.length === 0 && organicResults.length > 0 && (
        <div>
          <h4 className="font-display text-lg font-semibold mb-3">Places to Visit in {destination}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {organicResults.slice(0, 6).map((r: any, i: number) => (
              <a
                key={i}
                href={r.link}
                target="_blank"
                rel="noreferrer"
                className="flex gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition group"
              >
                {r.thumbnail && (
                  <img src={r.thumbnail} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium group-hover:text-primary transition line-clamp-1">{r.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.snippet}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!results && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="mt-3 font-display text-lg font-semibold">Couldn't find places</div>
          <p className="mt-1 text-sm text-muted-foreground">Try searching manually in the Search Packages tab.</p>
        </div>
      )}
    </div>
  );
}
