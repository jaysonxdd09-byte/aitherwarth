import { createFileRoute } from "@tanstack/react-router";
import capuIndexRaw from "../../public/capu-index.json";

const ALL_CAPE_FILES: string[] = (capuIndexRaw as string[])
  .filter((f: string) => f.endsWith(".png") && f.length > 10);

const PAGE_SIZE = 200;

export const Route = createFileRoute("/api/capes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10));
        const slice = ALL_CAPE_FILES.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

        const capes = slice.map((file: string) => {
          const hash = file.replace(".png", "");
          return {
            id: file,
            name: `Cloak #${hash.slice(0, 6)}`,
            renderUrl: `/capu/${file}`,
            textureUrl: `/capu/${file}`,
          };
        });

        return new Response(JSON.stringify({
          capes,
          page,
          total: ALL_CAPE_FILES.length,
          hasMore: (page + 1) * PAGE_SIZE < ALL_CAPE_FILES.length,
          error: null,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
