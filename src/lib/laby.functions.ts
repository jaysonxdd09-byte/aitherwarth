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

let capesCache: { at: number; data: LabyCloak[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function getLabyCloaks(): Promise<{ capes: LabyCloak[]; error: string | null }> {
  if (capesCache && Date.now() - capesCache.at < TTL_MS) {
    return { capes: capesCache.data, error: null };
  }
  try {
    const res = await fetch("/api/capes");
    if (!res.ok) throw new Error(`/api/capes returned ${res.status}`);
    const data = await res.json() as { capes: LabyCloak[]; error: string | null };
    capesCache = { at: Date.now(), data: data.capes };
    return data;
  } catch (e) {
    return { capes: [], error: e instanceof Error ? e.message : "Failed to load capes" };
  }
}
