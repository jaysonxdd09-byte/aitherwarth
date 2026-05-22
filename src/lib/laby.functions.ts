import { createServerFn } from "@tanstack/react-start";
import PocketBase from "pocketbase";
import type { AppliedCapeData } from "@/lib/applied-cape";

export interface LabyCloak {
  id: string;
  name: string;
  renderUrl: string;
  textureUrl: string;
}

const PB_URL = process.env["VITE_PB_URL"] ?? "http://127.0.0.1:8090";
const PB_ADMIN_EMAIL = process.env["VITE_PB_ADMIN_EMAIL"] ?? "";
const PB_ADMIN_PASSWORD = process.env["VITE_PB_ADMIN_PASSWORD"] ?? "";

async function adminPb() {
  const pb = new PocketBase(PB_URL);
  if (PB_ADMIN_EMAIL && PB_ADMIN_PASSWORD) {
    try {
      await pb.collection("_superusers").authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    } catch (_) {
      // Continue without admin auth — collection rules allow unauthenticated access
    }
  }
  return pb;
}

function pbWithUserAuth(token: string, record: Record<string, unknown> | null) {
  const pb = new PocketBase(PB_URL);
  if (token) pb.authStore.save(token, record);
  return pb;
}

async function upsertAppliedCapes(
  pb: PocketBase,
  username: string,
  data: AppliedCapeData,
) {
  const payload = {
    username: username.toLowerCase(),
    texture_url: data.textureUrl,
    cape_name: data.capeName ?? "",
    cape_category: data.capeCategory ?? "",
    applied_at: new Date().toISOString(),
  };

  let existing: { id: string } | null = null;
  try {
    existing = await pb.collection("applied_capes").getFirstListItem(
      `username = "${payload.username}"`,
    );
  } catch (_) {}

  if (existing) {
    await pb.collection("applied_capes").update(existing.id, payload);
  } else {
    await pb.collection("applied_capes").create(payload);
  }
}

async function fetchAppliedFromUsers(pb: PocketBase, username: string) {
  const key = username.trim();
  try {
    const record = await pb.collection("users").getFirstListItem(
      `minecraft_ign = "${key}" || username = "${key}"`,
    );
    const textureUrl = (record.applied_texture_url as string) || "";
    if (!textureUrl) return null;
    return {
      textureUrl,
      capeName: (record.applied_cape_name as string) || "Your Cape",
      capeCategory: (record.applied_cape_category as string) || "normal",
    } satisfies AppliedCapeData;
  } catch (_) {
    return null;
  }
}

export const saveAppliedCape = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      username: string;
      textureUrl: string;
      capeName?: string;
      capeCategory?: string;
      authToken?: string;
      authRecord?: Record<string, unknown>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const applied: AppliedCapeData = {
      textureUrl: data.textureUrl,
      capeName: data.capeName ?? "",
      capeCategory: data.capeCategory ?? "",
    };
    const username = data.username.trim();

    try {
      if (data.authToken) {
        const userPb = pbWithUserAuth(data.authToken, data.authRecord ?? null);
        await upsertAppliedCapes(userPb, username, applied);
        if (data.authRecord?.id) {
          await userPb.collection("users").update(data.authRecord.id as string, {
            applied_texture_url: applied.textureUrl,
            applied_cape_name: applied.capeName,
            applied_cape_category: applied.capeCategory,
          });
        }
        return { success: true };
      }

      const pb = await adminPb();
      await upsertAppliedCapes(pb, username, applied);
      const userRow = await fetchAppliedFromUsers(pb, username);
      if (!userRow) {
        try {
          const match = await pb.collection("users").getFirstListItem(
            `minecraft_ign = "${username.toLowerCase()}" || username = "${username.toLowerCase()}"`,
          );
          await pb.collection("users").update(match.id, {
            applied_texture_url: applied.textureUrl,
            applied_cape_name: applied.capeName,
            applied_cape_category: applied.capeCategory,
          });
        } catch (_) {}
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

export const getAppliedCape = createServerFn({ method: "GET" })
  .inputValidator((username: string) => username)
  .handler(async ({ data: username }) => {
    const key = username.toLowerCase();
    try {
      const pb = await adminPb();
      try {
        const record = await pb.collection("applied_capes").getFirstListItem(
          `username = "${key}"`,
        );
        const textureUrl = (record.texture_url as string) || null;
        if (textureUrl) {
          return {
            textureUrl,
            capeName: (record.cape_name as string) || "Your Cape",
            capeCategory: (record.cape_category as string) || "normal",
          };
        }
      } catch (_) {}

      const fromUser = await fetchAppliedFromUsers(pb, key);
      if (fromUser) return fromUser;

      return { textureUrl: null, capeName: null, capeCategory: null };
    } catch (_) {
      return { textureUrl: null, capeName: null, capeCategory: null };
    }
  });

let capesCache: { at: number; data: LabyCloak[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function getLabyCloaks(): Promise<{ capes: LabyCloak[]; error: string | null }> {
  if (capesCache && Date.now() - capesCache.at < TTL_MS) {
    return { capes: capesCache.data, error: null };
  }
  try {
    const all: LabyCloak[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(`/api/capes?page=${page}`);
      if (!res.ok) throw new Error(`/api/capes returned ${res.status}`);
      const data = await res.json() as { capes: LabyCloak[]; hasMore: boolean; error: string | null };
      all.push(...data.capes);
      hasMore = data.hasMore;
      page++;
    }
    capesCache = { at: Date.now(), data: all };
    return { capes: all, error: null };
  } catch (e) {
    return { capes: [], error: e instanceof Error ? e.message : "Failed to load capes" };
  }
}
