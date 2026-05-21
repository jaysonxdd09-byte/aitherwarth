# AitherWarth Capes & Skins Minecraft Mod (Fabric 1.21.1)

A fully functional, client-side Minecraft mod that fetches custom capes and skins applied by players on your AitherWarth web dashboard and renders them in real-time in-game.

---

## ✨ Features
* **Real-time Synced Capes & Skins**: Fetches custom cape and skin assets asynchronously as soon as player entities enter your render distance.
* **Online & Offline (Cracked) Account Support**: Fetches custom textures based purely on the player's in-game name (IGN), making it fully compatible with both online premium and offline profile configurations.
* **Lag-Free Rendering**: Heavy HTTP queries and image downloads run concurrently on separate background threads (`CompletableFuture`), preventing any game stutters or drops in framerates.
* **Community-Wide Visibility**: Any player who has this mod installed will be able to see their own custom cape and skin, as well as the custom capes and skins of any other players in the same multiplayer lobby!

---

## 🛠️ Mod Structure
* `src/main/java/com/aitherwarth/capes/AitherWarthCapes.java` - Client mod entrypoint.
* `src/main/java/com/aitherwarth/capes/CapeManager.java` - Manager handling HTTP connections, asset downloads, and custom texture registrations.
* `src/main/java/com/aitherwarth/capes/mixin/AbstractClientPlayerEntityMixin.java` - SpongePowered mixin injecting into Minecraft's `getSkinTextures()` method to dynamically overlay custom skin and cape texture identifiers.
* `src/main/resources/fabric.mod.json` - Mod metadata manifest.
* `src/main/resources/aitherwarth.mixins.json` - Mixin configuration registry.

---

## 🚀 How to Compile & Build the Mod

### 📋 Prerequisites
* **Java JDK 21** installed on your system (Minecraft 1.21+ requires JDK 21).

### 📦 Building the `.jar` File
1. Open a terminal or Command Prompt inside the `aitherwarth-mod` directory:
   ```bash
   cd aitherwarth-mod
   ```
2. Generate the Gradle wrapper (if not already initialized) and build:
   ```bash
   # On Windows:
   gradle build
   
   # On Linux/macOS:
   ./gradlew build
   ```
3. Once the build completes, the compiled mod file will be located at:
   `build/libs/aitherwarth-capes-1.0.0.jar`

---

## 🔗 Custom Deployed Website Configuration
By default, the mod queries the local development dashboard:
`http://localhost:8080/api/cape?username=`

When you deploy your web dashboard to a live production server, remember to update the **`API_BASE_URL`** constant inside:
`src/main/java/com/aitherwarth/capes/CapeManager.java` (Line 18)

Change it to your live deployed domain name, for example:
```java
private static final String API_BASE_URL = "https://your-aitherwarth-website.com/api/cape?username=";
```
Recompile the mod, and distribute it to your players!

---

## ⚙️ Installation
1. Install [Fabric Loader](https://fabricmc.net/) for Minecraft version **1.21.1**.
2. Place the compiled `aitherwarth-capes-1.0.0.jar` file inside your `.minecraft/mods/` directory.
3. Launch Minecraft and log in to a singleplayer world or multiplayer server. Custom capes applied on your dashboard will load automatically!
