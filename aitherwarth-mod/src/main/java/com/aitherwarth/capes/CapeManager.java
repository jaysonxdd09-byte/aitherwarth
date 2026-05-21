package com.aitherwarth.capes;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

public class CapeManager {
    // Modify this URL to point to your live deployed dashboard URL in production!
    private static final String API_BASE_URL = "http://localhost:8080/api/cape?username=";
    
    private static final Map<String, Identifier> CAPE_CACHE = new HashMap<>();
    private static final Map<String, Identifier> SKIN_CACHE = new HashMap<>();
    private static final Set<String> PENDING_REQUESTS = new HashSet<>();

    /**
     * Gets the custom cape texture identifier for a player if cached, or triggers an async fetch.
     */
    public static Identifier getOrCreateCape(String username) {
        String key = username.toLowerCase();
        if (CAPE_CACHE.containsKey(key)) {
            return CAPE_CACHE.get(key);
        }
        triggerFetchIfNeeded(username);
        return null;
    }

    /**
     * Gets the custom skin texture identifier for a player if cached, or triggers an async fetch.
     */
    public static Identifier getOrCreateSkin(String username) {
        String key = username.toLowerCase();
        if (SKIN_CACHE.containsKey(key)) {
            return SKIN_CACHE.get(key);
        }
        triggerFetchIfNeeded(username);
        return null;
    }

    private static synchronized void triggerFetchIfNeeded(String username) {
        String key = username.toLowerCase();
        if (!PENDING_REQUESTS.contains(key)) {
            PENDING_REQUESTS.add(key);
            fetchAssetsAsync(username);
        }
    }

    private static void fetchAssetsAsync(String username) {
        CompletableFuture.runAsync(() -> {
            try {
                URL url = new URL(API_BASE_URL + username);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.connect();

                if (conn.getResponseCode() == 200) {
                    JsonObject json = JsonParser.parseReader(new InputStreamReader(conn.getInputStream())).getAsJsonObject();
                    
                    // 1. Process Custom Cape
                    if (json.has("textureUrl") && !json.get("textureUrl").isJsonNull()) {
                        String capeUrl = json.get("textureUrl").getAsString();
                        downloadAsset(username, capeUrl, true);
                    }
                    
                    // 2. Process Custom Skin (Optional extension if you configure it on the website)
                    if (json.has("skinUrl") && !json.get("skinUrl").isJsonNull()) {
                        String skinUrl = json.get("skinUrl").getAsString();
                        downloadAsset(username, skinUrl, false);
                    }
                }
            } catch (Exception e) {
                AitherWarthCapes.LOGGER.error("Failed to query AitherWarth API for player " + username + ": " + e.getMessage());
            }
        });
    }

    private static void downloadAsset(String username, String assetUrl, boolean isCape) {
        CompletableFuture.runAsync(() -> {
            try {
                URL url = new URL(assetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.connect();

                if (conn.getResponseCode() == 200) {
                    try (InputStream in = conn.getInputStream()) {
                        NativeImage image = NativeImage.read(in);
                        
                        // Register the downloaded texture safely on Minecraft's render thread
                        MinecraftClient.getInstance().execute(() -> {
                            String type = isCape ? "capes" : "skins";
                            Identifier textureId = Identifier.of("aitherwarth-capes", type + "/" + username.toLowerCase());
                            
                            MinecraftClient.getInstance().getTextureManager().registerTexture(
                                textureId, 
                                new NativeImageBackedTexture(image)
                            );

                            if (isCape) {
                                CAPE_CACHE.put(username.toLowerCase(), textureId);
                                AitherWarthCapes.LOGGER.info("Successfully loaded custom cape texture for: " + username);
                            } else {
                                SKIN_CACHE.put(username.toLowerCase(), textureId);
                                AitherWarthCapes.LOGGER.info("Successfully loaded custom skin texture for: " + username);
                            }
                        });
                    }
                }
            } catch (Exception e) {
                AitherWarthCapes.LOGGER.error("Failed to download or register " + (isCape ? "cape" : "skin") + " for player " + username + ": " + e.getMessage());
            }
        });
    }
}
