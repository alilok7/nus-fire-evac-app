/**
 * Landing page carousel and section images.
 * Hero slides use local NUS accommodation photos in public/carousel.
 */

export interface LandingImage {
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
}

/** Hero carousel slides: NUS accommodation photos */
export const HERO_SLIDES: LandingImage[] = [
  {
    url: "/carousel/dorm-room.png",
    alt: "NUS student dormitory room with desk and natural light",
    photographer: "NUS",
    photographerUrl: "#",
  },
  {
    url: "/carousel/temasek-hall.png",
    alt: "Temasek Hall, NUS accommodation residence",
    photographer: "NUS",
    photographerUrl: "#",
  },
  {
    url: "/carousel/campus-buildings.png",
    alt: "NUS campus modern residence buildings and greenery",
    photographer: "NUS",
    photographerUrl: "#",
  },
  {
    url: "/carousel/nus-pool-sunset.png",
    alt: "NUS buildings and student accommodation reflected in pool at sunset",
    photographer: "NUS",
    photographerUrl: "#",
  },
];

/** Unsplash attribution link */
export const UNSPLASH_ATTRIBUTION = "https://unsplash.com";
