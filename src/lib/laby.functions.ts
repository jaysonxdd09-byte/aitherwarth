import { createServerFn } from "@tanstack/react-start";
import PocketBase from "pocketbase";

export interface LabyCloak {
  id: string;
  name: string;
  renderUrl: string;
  textureUrl: string;
}

const PB_URL = process.env["VITE_PB_URL"] ?? "http://127.0.0.1:8090";

function adminPb() {
  return new PocketBase(PB_URL);
}

export const saveAppliedCape = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; textureUrl: string; capeName?: string; capeCategory?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const pb = adminPb();
      const username = data.username.toLowerCase();

      // Upsert: find existing record for this user then update, or create new
      let existing: { id: string } | null = null;
      try {
        existing = await pb.collection("applied_capes").getFirstListItem(
          `username = "${username}"`
        );
      } catch (_) {}

      const payload = {
        username,
        texture_url: data.textureUrl,
        cape_name: data.capeName ?? "",
        cape_category: data.capeCategory ?? "",
        applied_at: new Date().toISOString(),
      };

      if (existing) {
        await pb.collection("applied_capes").update(existing.id, payload);
      } else {
        await pb.collection("applied_capes").create(payload);
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

export const getAppliedCape = createServerFn({ method: "GET" })
  .inputValidator((username: string) => username)
  .handler(async ({ data: username }) => {
    try {
      const pb = adminPb();
      const record = await pb.collection("applied_capes").getFirstListItem(
        `username = "${username.toLowerCase()}"`
      );
      return { textureUrl: record.texture_url as string ?? null };
    } catch (_) {
      return { textureUrl: null };
    }
  });

let cache: { at: number; data: LabyCloak[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

export const getLabyCloaks = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ capes: LabyCloak[]; error: string | null }> => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return { capes: cache.data, error: null };
    }

    try {
      cache = null; // Force clear cache for this request to ensure fresh paths
      const capes: LabyCloak[] = [];
      const seen = new Set<string>();

      // Load metadata from static JSON served by the app itself
      let metadata: Record<string, any> = {};
      try {
        const metaRes = await fetch("http://localhost:3000/cloaks-meta.json");
        if (metaRes.ok) {
          const list = await metaRes.json() as any[];
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item.image_hash) metadata[item.image_hash] = item;
            });
          }
        }
      } catch (_) {}

      // 1. Load cape file list from pre-generated static index
      try {
        const indexRes = await fetch("http://localhost:3000/capu-index.json");
        if (!indexRes.ok) throw new Error(`capu-index.json returned ${indexRes.status}`);
        const files = await indexRes.json() as string[];
        const limitedFiles = files.filter((f: string) => f.endsWith(".png") && f.length > 10).slice(0, 10000);

        const technicalTags = new Set([
          "text", "graphics", "font", "brand", "screenshot", "illustration", "design", "graphic",
          "digital", "compositing", "software", "poster", "logo", "clipart", "animation", "animated",
          "drawing", "sketch", "art", "artwork", "frame", "display", "screen", "indoor", "outdoor",
          "building", "wall", "style", "staring", "domestic"
        ]);

        for (const file of limitedFiles) {
          const hash = file.replace(".png", "");
          if (seen.has(hash)) continue;
          seen.add(hash);

          const meta = metadata[hash];
          let name = `Cloak #${hash.slice(0, 6)}`;
          if (meta && meta.tags) {
            const rawTags = meta.tags.split(" ");
            const descriptiveTags = rawTags.filter((t: string) => !technicalTags.has(t.toLowerCase()));
            name = descriptiveTags.length > 0
              ? descriptiveTags.slice(0, 3).join(" ")
              : rawTags.slice(0, 2).join(" ");
          }

          capes.push({
            id: file,
            name,
            renderUrl: `/capu/${file}`,
            textureUrl: `/capu/${file}`,
          });
        }
      } catch (e) {
        console.warn("Failed to load capu-index.json:", e);
      }

      // 2. Fetch trending/popular cloaks from laby.net
      try {
        const res = await fetch("https://laby.net/cloaks", {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PiCapesCatalog/1.0; +https://picapes.syanic.org)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        
        if (res.ok) {
          const html = await res.text();
          const re = /https:\/\/laby\.net\/api\/v3\/texture\/([a-f0-9]{16,64})\/cloakFront\.png[^>]*?alt="([^"]*?)\s*Minecraft Cloak"|alt="([^"]*?)\s*Minecraft Cloak"[^>]*?https:\/\/laby\.net\/api\/v3\/texture\/([a-f0-9]{16,64})\/cloakFront\.png/g;

          let m: RegExpExecArray | null;
          while ((m = re.exec(html)) !== null) {
            const hash = m[1] ?? m[4];
            const rawName = (m[2] ?? m[3] ?? "").trim();
            if (!hash || seen.has(hash)) continue;
            seen.add(hash);
            capes.push({
              id: hash,
              name: rawName || `Cloak ${hash.slice(0, 8)}`,
              renderUrl: `https://laby.net/api/v3/texture/${hash}/cloak.png`, // Use flat texture for catalog
              textureUrl: `https://laby.net/api/v3/texture/${hash}/cloak.png`,
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch laby.net trending cloaks:", e);
      }

      cache = { at: Date.now(), data: capes };
      return { capes, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load laby.net cloaks";
      return { capes: [], error: msg };
    }
  },
);
