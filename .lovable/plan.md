## Goal

Replace the static "paste a link" panel in the **Labymod Capes** tab with a real catalog of cloaks pulled from laby.net/cloaks, behaving like the other categories (grid + click-to-preview on the 3D player).

## Reality check on "all capes"

laby.net does not expose a public list of every cloak — there are tens of thousands and they're only retrievable individually by hash. The `/cloaks` page itself only renders two curated lists: **Trending** and **Most Used** (~60 cloaks combined, refreshed by laby.net periodically). That's what we can realistically pull. I'll treat that page as the source of truth.

## Approach

1. **Server function `getLabyCloaks`** (`src/lib/laby.functions.ts`)
   - Fetches `https://laby.net/cloaks` server-side (avoids CORS, keeps the browser fast).
   - Parses the HTML with a regex over `<img ... src="https://laby.net/api/v3/texture/{hash}/cloakFront.png" alt="{name} Minecraft Cloak">` pairs.
   - Returns `[{ id: hash, name, renderUrl, textureUrl }]`, de-duplicated.
   - In-memory cache with ~10 min TTL so we don't hammer laby.net.
   - Wrapped in try/catch returning `{ capes: [], error }` on failure.

2. **Extend `src/lib/capes.ts`**
   - Remove `labymod` from the "panel category" branch.
   - Add a `loadCapes("labymod")` path that calls the server function instead of fetching a JSON list.
   - Texture URL pattern: `https://laby.net/api/v3/texture/{hash}/cloak.png` (the raw skin-format texture skinview3d needs). Render preview stays `cloakFront.png`.

3. **`src/routes/index.tsx`**
   - Drop `labymod` from `isPanelCategory` so it uses the normal grid + search + load-more flow.
   - "Apply Cape" modal: show a LabyMod-specific message (link to laby.net cloak page + the cloak hash to share), since the `!applycape` Discord command is PiCapes-specific and doesn't apply here. SkinMC stays as the only remaining panel category.

4. **`CapeCard`** — no changes; it already handles arbitrary `renderUrl`.

## Technical details

- Server function uses native `fetch` (Worker-safe). Sets a browser-like `User-Agent` header.
- Parser is a single regex match over the response text — no DOM library needed. If laby.net changes markup, the server function returns an empty list + error string that the UI surfaces.
- Texture format: laby.net serves cloaks at the standard 64×32 Minecraft cape layout, which skinview3d's `loadCape` accepts directly. No conversion needed.
- Cache key is global (single curated list); reset on server cold start.

## What this won't do

- It won't give you every cloak ever uploaded to laby.net (no such endpoint exists).
- It won't auto-update — the catalog refreshes when laby.net updates their trending/most-used lists (and our 10-min cache expires).

If you later want a "search by hash" input to load any specific cloak by its laby.net URL, that's a small follow-up.
