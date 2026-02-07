/**
 * Unsplash image URLs for landing page carousel and sections.
 * Uses direct Unsplash URLs with query params for sizing.
 * Attribution required per Unsplash guidelines.
 */

const UNSPLASH_BASE = "https://images.unsplash.com";

export interface LandingImage {
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
}

function buildUrl(id: string, w = 1920, q = 80): string {
  return `${UNSPLASH_BASE}/photo-${id}?w=${w}&q=${q}&fit=crop`;
}

/** Hero carousel slides: NUS accommodation themed - Singapore university, residence halls, campus */
export const HERO_SLIDES: LandingImage[] = [
  {
    url: buildUrl("1542019886894-8346ec5e3e4b"),
    alt: "Graduates in front of Singapore university building",
    photographer: "Lucas Law",
    photographerUrl: "https://unsplash.com/@lucaslaw__",
  },
  {
    url: buildUrl("1677594334053-afe4b41aa0a3"),
    alt: "Students in front of university residence building",
    photographer: "The Jopwell Collection",
    photographerUrl: "https://unsplash.com/@jopwell",
  },
  {
    url: buildUrl("1581634928711-e19c3d57478d"),
    alt: "NUS-style residence hall with stone facade",
    photographer: "Adam Bouse",
    photographerUrl: "https://unsplash.com/@adambouse",
  },
  {
    url: buildUrl("1714494976468-3948f7fa4a2a"),
    alt: "University campus building with clock tower",
    photographer: "Austin",
    photographerUrl: "https://unsplash.com/@austin_7792",
  },
];

/** Unsplash attribution link */
export const UNSPLASH_ATTRIBUTION = "https://unsplash.com";
