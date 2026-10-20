/**
 * Destination data for the fictional Nordair network.
 * Coordinates are real (used for the map projection and fake flight times);
 * everything else — facts, fares, flight numbers — is invented for the demo.
 */

export type AirportCode = "PHC" | "LOS" | "ACC" | "LHR" | "DXB";

export interface Airport {
  code: AirportCode;
  city: string;
  country: string;
  lat: number;
  lon: number;
  /** Fixed UTC offset in hours used for demo timetables (no daylight saving). */
  utcOffset: number;
  /** Short line used on the route map card. */
  tagline: string;
  /** Longer copy for the destination list. */
  description: string;
  highlights: string[];
  /** Fictional "best time to fly" note. */
  bestTime: string;
  image: {
    src: string;
    alt: string;
  };
}

export const airports: Airport[] = [
  {
    code: "PHC",
    city: "Port Harcourt",
    country: "Nigeria",
    lat: 4.82,
    lon: 7.03,
    utcOffset: 1,
    tagline: "Garden city of creeks and early light",
    description:
      "Our founding base in this story. Mornings over the Niger Delta creeks are why every Nordair schedule starts at dawn.",
    highlights: ["Creek-side waterfronts", "Lively food markets", "Gateway to the Delta"],
    bestTime: "November to February, when the harmattan softens the sky",
    image: {
      src: "/images/dest-phc.webp",
      alt: "Illustration of a sunrise over calm creeks with palm silhouettes",
    },
  },
  {
    code: "LOS",
    city: "Lagos",
    country: "Nigeria",
    lat: 6.52,
    lon: 3.38,
    utcOffset: 1,
    tagline: "The hub that never quite sleeps",
    description:
      "The imaginary heart of the Nordair network. Every route on the map connects through Lagos at least once a day.",
    highlights: ["Lagoon bridges at golden hour", "Music on every corner", "Fast connections"],
    bestTime: "December, for festival season (in our imagination)",
    image: {
      src: "/images/dest-los.webp",
      alt: "Illustration of a lagoon bridge and a city skyline at golden hour",
    },
  },
  {
    code: "ACC",
    city: "Accra",
    country: "Ghana",
    lat: 5.6,
    lon: -0.19,
    utcOffset: 0,
    tagline: "Short hop, long beaches",
    description:
      "A quick coastal hop from Lagos. Our fictional crews swear the evening sea breeze is the best part of the rotation.",
    highlights: ["Atlantic coastline", "Craft markets", "Evening sea breeze"],
    bestTime: "July to August, the cooler months",
    image: {
      src: "/images/dest-acc.webp",
      alt: "Illustration of a palm-lined beach with waves at sunset",
    },
  },
  {
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    lat: 51.47,
    lon: -0.45,
    utcOffset: 0,
    tagline: "Overnight north, breakfast by the river",
    description:
      "Our longest northbound route in the demo. Leave Lagos at dusk and land in time for a riverside breakfast.",
    highlights: ["Riverside walks", "Museums and theatres", "Rainy-day cafés"],
    bestTime: "May to September, for the long evenings",
    image: {
      src: "/images/dest-lhr.webp",
      alt: "Illustration of a river with bridges and a soft pastel sky",
    },
  },
  {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    lat: 25.25,
    lon: 55.36,
    utcOffset: 4,
    tagline: "Desert dusk and city light",
    description:
      "Eastbound into the evening. Watch the sky shift from orange to violet over the dunes before you land.",
    highlights: ["Desert sunsets", "Waterfront promenades", "Night markets"],
    bestTime: "November to March, when evenings are mild",
    image: {
      src: "/images/dest-dxb.webp",
      alt: "Illustration of desert dunes under a violet dusk with distant towers",
    },
  },
];

/** Routes drawn on the map. All are fictional. */
export const routes: Array<[AirportCode, AirportCode]> = [
  ["PHC", "LOS"],
  ["LOS", "ACC"],
  ["LOS", "LHR"],
  ["LOS", "DXB"],
  ["ACC", "LHR"],
  ["PHC", "DXB"],
];

export const airportByCode = (code: AirportCode): Airport => {
  const airport = airports.find((a) => a.code === code);
  if (!airport) throw new Error(`Unknown airport ${code}`);
  return airport;
};

export const airportCodes = airports.map((a) => a.code) as [AirportCode, ...AirportCode[]];
