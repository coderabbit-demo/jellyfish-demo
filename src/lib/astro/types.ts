export type EventLink = {
  label: string;
  url: string;
};

/** Normalised event shape used across all fetchers before DB write */
export type RawAstroEvent = {
  slug: string;
  title: string;
  type: "SOLAR_SYSTEM" | "NIGHT_SKY" | "LUNAR" | "DEEP_SPACE";
  description: string;
  source: string;
  startAt: Date;
  endAt?: Date;
  links: EventLink[];
  isLocationSpecific: boolean;
};
