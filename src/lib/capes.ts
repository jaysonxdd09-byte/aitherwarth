import { getLabyCloaks } from "./laby.functions";

export type CapeCategory = "normal" | "partner" | "skinmc" | "labymod" | "animated";

export interface Cape {
  id: string;
  name: string;
  category: CapeCategory;
  /** Preview render (rectangular, shown in the catalog grid) */
  renderUrl: string;
  /** Raw cape PNG texture used by skinview3d */
  textureUrl: string;
}

const CDN = "https://cdn.capeserver.picapes.syanic.org";

const LIST_URLS: Record<"normal" | "partner" | "animated", string> = {
  normal: `${CDN}/lists/capes.json`,
  partner: `${CDN}/lists/partner_capes.json`,
  animated: `${CDN}/lists/animated_capes.json`,
};

const cache = new Map<string, Cape[]>();

function titleCase(slug: string): string {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function loadCapes(category: CapeCategory): Promise<Cape[]> {
  if (category === "skinmc") return [];
  if (cache.has(category)) return cache.get(category)!;

  if (category === "labymod") {
    const { capes: list, error } = await getLabyCloaks();
    if (error && list.length === 0) throw new Error(error);
    const capes: Cape[] = list.map((c) => ({
      id: c.id,
      name: c.name,
      category: "labymod",
      renderUrl: c.renderUrl,
      textureUrl: c.textureUrl,
    }));
    cache.set(category, capes);
    return capes;
  }

  const res = await fetch(LIST_URLS[category]);
  if (!res.ok) throw new Error(`Failed to load ${category} capes`);
  const ids: string[] = await res.json();

  const capes: Cape[] = ids.map((id) => {
    if (category === "normal") {
      return {
        id,
        name: `Cape #${id}`,
        category,
        renderUrl: `${CDN}/renders/capes/webp/${id}.webp`,
        textureUrl: `${CDN}/capes/${id}.png`,
      };
    }
    if (category === "partner") {
      return {
        id,
        name: titleCase(id),
        category,
        renderUrl: `${CDN}/renders/partner_capes/webp/${id}.webp`,
        textureUrl: `${CDN}/partner_capes/${id}.png`,
      };
    }
    // animated
    return {
      id,
      name: titleCase(id),
      category,
      renderUrl: `${CDN}/renders/animated_capes/webp/${id}.webp`,
      textureUrl: `${CDN}/animated_capes/sprites/${id}.png`,
    };
  });

  cache.set(category, capes);
  return capes;
}

export const CATEGORIES: { id: CapeCategory; label: string }[] = [
  { id: "normal", label: "Normal Capes" },
  { id: "partner", label: "Partner Capes" },
  { id: "skinmc", label: "SkinMC Capes" },
  { id: "labymod", label: "Labymod Capes" },
  { id: "animated", label: "Animated Capes" },
];

export const SKIN_URL = (ign: string) =>
  `https://minotar.net/skin/${encodeURIComponent(ign || "steve")}.png`;
