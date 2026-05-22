import { createServerFn } from "@tanstack/react-start";
import PocketBase from "pocketbase";
import { normalizeMinecraftUsername } from "@/lib/auth";

const PB_URL = process.env["VITE_PB_URL"] ?? "http://127.0.0.1:8090";
const PB_ADMIN_EMAIL = process.env["VITE_PB_ADMIN_EMAIL"] ?? "";
const PB_ADMIN_PASSWORD = process.env["VITE_PB_ADMIN_PASSWORD"] ?? "";

async function adminPb() {
  const pb = new PocketBase(PB_URL);
  if (PB_ADMIN_EMAIL && PB_ADMIN_PASSWORD) {
    await pb.collection("_superusers").authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  }
  return pb;
}

export const checkUsernameAvailable = createServerFn({ method: "GET" })
  .inputValidator((username: string) => username)
  .handler(async ({ data: username }) => {
    const trimmed = username.trim();
    if (!trimmed) return { available: false, reason: "Username is required." };

    const key = normalizeMinecraftUsername(trimmed);

    try {
      const pb = await adminPb();
      try {
        await pb.collection("users").getFirstListItem(
          `minecraft_ign_normalized = "${key}"`,
        );
        return {
          available: false,
          reason: "This Minecraft username is already registered.",
        };
      } catch {
        /* not found — available */
      }

      try {
        await pb.collection("users").getFirstListItem(`username = "${trimmed}"`);
        return {
          available: false,
          reason: "This Minecraft username is already registered.",
        };
      } catch {
        /* not found */
      }

      return { available: true, reason: null };
    } catch {
      return { available: false, reason: "Could not verify username. Please try again." };
    }
  });
