import { createFileRoute } from "@tanstack/react-router";
import { getAppliedCape } from "@/lib/laby.functions";

export const Route = createFileRoute("/api/cape")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const username = url.searchParams.get("username");

        if (!username) {
          return new Response(JSON.stringify({ error: "Username query parameter is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // Query the applied capes store from laby.functions
          const { textureUrl } = await getAppliedCape({ data: username });

          return new Response(JSON.stringify({ username, textureUrl }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*", // Allow cross-origin requests from the Minecraft client
            },
          });
        } catch (e) {
          const err = e instanceof Error ? e.message : "Failed to load applied cape";
          return new Response(JSON.stringify({ error: err }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
