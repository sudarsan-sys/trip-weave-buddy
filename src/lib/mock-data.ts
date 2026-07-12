import type { Place, TripRoute } from "./types";

export interface DestinationData {
  name: string;
  packages: { name: string; priceRange: string; duration: string; agency: string }[];
  topPlaces: { name: string; image: string; tag: string }[];
  budget: string;
  season: string;
  crowd: "Low" | "Medium" | "High";
  scenicRoutesTeaser: string;
  experiences: string[];
  places: any[];
  routes: any[];
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?w=800&h=600&fit=crop&auto=format`;

export const munnar: DestinationData = {
  name: "Munnar",
  packages: [
    { name: "Munnar Classic 3N/4D", priceRange: "₹8,500 – ₹12,000", duration: "4 days", agency: "Kerala Trails" },
    { name: "Hills & Tea Weekend", priceRange: "₹6,000 – ₹9,000", duration: "3 days", agency: "SouthGo" },
    { name: "Offbeat Munnar Camp", priceRange: "₹11,000 – ₹14,500", duration: "4 days", agency: "Wild Roots" },
  ],
  topPlaces: [
    { name: "Eravikulam National Park", image: IMG("1587891367506-8f5a1e2c3f4d"), tag: "Wildlife" },
    { name: "Top Station", image: IMG("1506905925346-21bda4d32df4"), tag: "Viewpoint" },
    { name: "Mattupetty Dam", image: IMG("1470770841072-f978cf4d019e"), tag: "Lake" },
    { name: "Tea Museum", image: IMG("1524492412937-b28074a5d7da"), tag: "Culture" },
  ],
  budget: "₹6,000 – ₹9,000 per person",
  season: "Sept – Feb",
  crowd: "Medium",
  scenicRoutesTeaser: "3 AI-curated scenic routes available",
  experiences: [
    "Tea plantation walk",
    "Spice farm tour",
    "Sunrise at Kolukkumalai",
    "Homestay dinner with local family",
  ],
  places: [
    {
      id: "p1",
      name: "Anayirankal Reservoir",
      imageUrl: IMG("1470770841072-f978cf4d019e"),
      description: "Quiet lake surrounded by tea estates. Zero crowd on weekdays.",
      tag: "Nature",
      source: "From Reddit",
    },
    {
      id: "p2",
      name: "Rajesh's Tea Kada",
      imageUrl: IMG("1447933601403-0c6688de566e"),
      description: "Roadside chai stall locals swear by. Cardamom tea + banana fry.",
      tag: "Food",
      source: "From local blog",
    },
    {
      id: "p3",
      name: "Meesapulimala Viewpoint",
      imageUrl: IMG("1506905925346-21bda4d32df4"),
      description: "Second-highest peak in South India. Cloud sea at sunrise.",
      tag: "Viewpoints",
      source: "Uploaded by a traveler",
    },
    {
      id: "p4",
      name: "Attukad Waterfalls (back trail)",
      imageUrl: IMG("1447752875215-b2761acb3c5d"),
      description: "Skip the main viewpoint — take the side path for the pool below.",
      tag: "Offbeat",
      source: "From Reddit",
    },
    {
      id: "p5",
      name: "Kannan Devan Tea Trail",
      imageUrl: IMG("1524492412937-b28074a5d7da"),
      description: "Walk the working plantation instead of the museum queue.",
      tag: "Nature",
      source: "From local blog",
    },
    {
      id: "p6",
      name: "Saravana Bhavan (Munnar branch)",
      imageUrl: IMG("1567337710282-00832b415979"),
      description: "Filter coffee + ghee roast. Best breakfast in town.",
      tag: "Food",
      source: "Uploaded by a traveler",
    },
  ],
  routes: [
    {
      id: "r1",
      type: "fastest",
      name: "Fastest Route",
      duration: "2h 15m",
      distance: "78 km",
      stops: [
        { name: "Munnar Town", icon: "📍" },
        { name: "Top Station", icon: "🏔️" },
      ],
    },
    {
      id: "r2",
      type: "experience",
      name: "Best Experience Route (AI)",
      duration: "2h 40m",
      distance: "82 km",
      stops: [
        { name: "Tea Museum", icon: "🍵" },
        { name: "Hidden Waterfall", icon: "💧" },
        { name: "Best Chai Shop", icon: "☕" },
        { name: "Photography Viewpoint", icon: "📸" },
        { name: "Less Traffic Detour", icon: "🛣️" },
      ],
    },
  ],
};

export const destinations: Record<string, DestinationData> = {
  munnar: munnar,
};
