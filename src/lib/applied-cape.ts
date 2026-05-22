import type { Cape, CapeCategory } from "@/lib/capes";
import { pb } from "@/lib/pb";

export interface AppliedCapeData {
  textureUrl: string;
  capeName: string;
  capeCategory: CapeCategory | string;
}

export function minecraftIgnFromRecord(
  record: Record<string, unknown> | null | undefined,
): string {
  if (!record) return "";
  return (
    (record.minecraft_ign as string) ||
    (record.username as string) ||
    ""
  ).trim();
}

export function appliedCapeFromRecord(
  record: Record<string, unknown> | null | undefined,
): AppliedCapeData | null {
  if (!record) return null;
  const textureUrl = (record.applied_texture_url as string) || "";
  if (!textureUrl) return null;
  return {
    textureUrl,
    capeName: (record.applied_cape_name as string) || "Your Cape",
    capeCategory: (record.applied_cape_category as string) || "normal",
  };
}

export function capeFromApplied(data: AppliedCapeData): Cape {
  const category = (data.capeCategory || "normal") as CapeCategory;
  return {
    id: "applied",
    name: data.capeName,
    category,
    renderUrl: data.textureUrl,
    textureUrl: data.textureUrl,
  };
}

export function appliedCapeCacheKey(ign: string): string {
  return `applied_cape_${ign.toLowerCase()}`;
}

export function readAppliedCapeCache(ign: string): Cape | null {
  const cached = localStorage.getItem(appliedCapeCacheKey(ign));
  if (!cached) return null;
  try {
    return JSON.parse(cached) as Cape;
  } catch {
    return null;
  }
}

export function writeAppliedCapeCache(ign: string, cape: Cape): void {
  localStorage.setItem(appliedCapeCacheKey(ign), JSON.stringify(cape));
}

export function clearAppliedCapeCache(ign: string): void {
  localStorage.removeItem(appliedCapeCacheKey(ign));
}

/** Persist applied cape on the logged-in user (PocketBase users + applied_capes). */
export async function saveAppliedCapeClient(
  ign: string,
  cape: Cape,
): Promise<{ success: boolean; error?: string }> {
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return { success: false, error: "Not logged in" };
  }

  const username = ign.trim().toLowerCase(); // applied_capes key (always lowercase)
  const payload = {
    username,
    texture_url: cape.textureUrl,
    cape_name: cape.name,
    cape_category: cape.category,
    applied_at: new Date().toISOString(),
  };

  const userPayload = {
    applied_texture_url: cape.textureUrl,
    applied_cape_name: cape.name,
    applied_cape_category: cape.category,
  };

  try {
    await pb.collection("users").update(pb.authStore.record.id, userPayload);

    let existing: { id: string } | null = null;
    try {
      existing = await pb.collection("applied_capes").getFirstListItem(
        `username = "${username}"`,
      );
    } catch {
      /* no row yet */
    }

    if (existing) {
      await pb.collection("applied_capes").update(existing.id, payload);
    } else {
      await pb.collection("applied_capes").create(payload);
    }

    await pb.collection("users").authRefresh();
    writeAppliedCapeCache(ign, cape);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Load applied cape from the current auth record (after refresh). */
export async function loadAppliedCapeForUser(ign: string): Promise<Cape | null> {
  if (pb.authStore.isValid) {
    try {
      await pb.collection("users").authRefresh();
    } catch {
      /* keep existing token */
    }
    const fromUser = appliedCapeFromRecord(
      pb.authStore.record as Record<string, unknown> | null,
    );
    if (fromUser) {
      const cape = capeFromApplied(fromUser);
      writeAppliedCapeCache(ign, cape);
      return cape;
    }
  }

  const cached = readAppliedCapeCache(ign);
  if (cached) return cached;

  return null;
}
