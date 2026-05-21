import { createFileRoute } from "@tanstack/react-router";
import capuIndexRaw from "../../public/capu-index.json";

const CAPE_FILES: string[] = (capuIndexRaw as string[])
  .filter((f: string) => f.endsWith(".png") && f.length > 10)
  .slice(0, 500);

export const Route = createFileRoute("/api/capes")({
  server: {
    handlers: {
      GET: async () => {
        const capes = CAPE_FILES.map((file: string) => {
          const hash = file.replace(".png", "");
          return {
            id: file,
            name: `Cloak #${hash.slice(0, 6)}`,
            renderUrl: `/capu/${file}`,
            textureUrl: `/capu/${file}`,
          };
        });

        return new Response(JSON.stringify({ capes, error: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
