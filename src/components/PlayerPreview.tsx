import { useEffect, useRef, useState } from "react";
import * as skinview3d from "skinview3d";
import * as THREE from "three";
import { Cape, SKIN_URL } from "@/lib/capes";
import { 
  Footprints, 
  Wind, 
  Plane, 
  ShieldCheck, 
  Upload, 
  User,
  Loader2
} from "lucide-react";

interface Props {
  cape: Cape | null;
  ign: string;
  setIgn: (v: string) => void;
  onApply: () => void;
  applying?: boolean;
}


export function PlayerPreview({ cape, ign, setIgn, onApply, applying = false }: Props) {
  const prevApplyingRef = useRef(false);
  const [justApplied, setJustApplied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedIgnRef = useRef<string>("");

  // Detect when applying finishes (true → false) and flash green for 1s
  useEffect(() => {
    if (prevApplyingRef.current === true && applying === false) {
      setJustApplied(true);
      const t = setTimeout(() => setJustApplied(false), 1000);
      return () => clearTimeout(t);
    }
    prevApplyingRef.current = applying;
  }, [applying]);

  const [sneak, setSneak] = useState(false);
  const [sprint, setSprint] = useState(false);
  const [flying, setFlying] = useState(false);
  const [elytra, setElytra] = useState(false);
  const [loadingElytra, setLoadingElytra] = useState(false);

  // Cache animation objects to prevent constant re-creation
  const animations = useRef<{
    walking: skinview3d.WalkingAnimation | null;
    running: skinview3d.RunningAnimation | null;
    flying: skinview3d.FlyingAnimation | null;
    crouch: skinview3d.CrouchAnimation | null;
  }>({ walking: null, running: null, flying: null, crouch: null });

  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  // Init viewer once
  useEffect(() => {
    if (!canvasRef.current) return;
    textureLoaderRef.current = new THREE.TextureLoader();
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: 280,
      height: 340,
      skin: SKIN_URL(ign || "Sethjuhh_"),
      // Optimize pixel ratio for performance
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    });
    
    // Transparent background
    viewer.background = null; 
    
    loadedIgnRef.current = ign || "Sethjuhh_";
    viewer.fov = 40;
    viewer.zoom = 0.85;
    viewer.controls.enableZoom = true;
    viewer.controls.enableRotate = true;
    viewer.controls.enablePan = false;
    viewer.autoRotate = false;

    // Initialize cached animations
    animations.current = {
      walking: new skinview3d.WalkingAnimation(),
      running: new skinview3d.RunningAnimation(),
      flying: new skinview3d.FlyingAnimation(),
      crouch: new skinview3d.CrouchAnimation(),
    };
    
    // Set default speed
    Object.values(animations.current).forEach(a => { if (a) a.speed = 0.6; });

    viewer.animation = animations.current.walking;
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync skin when ign changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ign || loadedIgnRef.current === ign) return;

    viewer.loadSkin(SKIN_URL(ign)).then(() => {
      loadedIgnRef.current = ign;
    }).catch(e => console.warn("Failed to load skin for", ign, e));
  }, [ign]);

  // Sync animations
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !animations.current.walking) return;

    // Handle equipment first
    viewer.playerObject.backEquipment = elytra ? "elytra" : "cape";

    // Select the correct animation
    let targetAnimation: skinview3d.PlayerAnimation | null = null;

    if (elytra) {
      targetAnimation = null;
    } else if (flying) {
      targetAnimation = animations.current.flying;
    } else if (sneak) {
      targetAnimation = animations.current.crouch;
    } else if (sprint) {
      targetAnimation = animations.current.running;
    } else {
      targetAnimation = animations.current.walking;
    }

    // Only update if the animation instance actually changed
    if (viewer.animation !== targetAnimation) {
      viewer.animation = targetAnimation;
    }
  }, [sneak, sprint, flying, elytra]);

  // Cape changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let animationId: number | null = null;
    let currentTexture: THREE.Texture | null = null;

    if (cape) {
      // Ensure equipment is set to cape
      viewer.playerObject.backEquipment = "cape";
      viewer.playerObject.cape.visible = true;

      const isAnimated = cape.category === "animated";
      if (isAnimated) {
        // ... (keep animated logic as is)
        viewer.playerObject.cape.map = null;
        const textureLoader = textureLoaderRef.current;
        if (textureLoader) {
          textureLoader.load(cape.textureUrl, (texture) => {
            if (!viewer.playerObject) {
              texture.dispose();
              return;
            }
            const animatedTexture = texture.clone();
            currentTexture = animatedTexture;
            animatedTexture.magFilter = THREE.NearestFilter;
            animatedTexture.minFilter = THREE.NearestFilter;
            animatedTexture.wrapS = THREE.ClampToEdgeWrapping;
            animatedTexture.wrapT = THREE.RepeatWrapping;
            const image = animatedTexture.image;
            const frameHeight = image.width / 2;
            const frameCount = Math.floor(image.height / frameHeight);
            if (frameCount <= 1) {
              viewer.loadCape(cape.textureUrl);
              texture.dispose();
              animatedTexture.dispose();
              return;
            }
            animatedTexture.repeat.set(1, 1 / frameCount);
            viewer.playerObject.cape.map = animatedTexture;
            let frame = 0;
            let lastTime = performance.now();
            const animateFrame = (time: number) => {
              if (!viewer.playerObject || viewer.playerObject.cape.map !== animatedTexture) return;
              if (time - lastTime >= 100) {
                frame = (frame + 1) % frameCount;
                animatedTexture.offset.y = (frameCount - 1 - frame) / frameCount;
                animatedTexture.needsUpdate = true;
                lastTime = time;
              }
              animationId = requestAnimationFrame(animateFrame);
            };
            animationId = requestAnimationFrame(animateFrame);
            texture.dispose();
          });
        }
      } else {
        // Construct full URL for local files to ensure skinview3d can resolve them
        const textureUrl = cape.textureUrl.startsWith("/")
          ? window.location.origin + cape.textureUrl
          : cape.textureUrl;

        // Force a fresh load by clearing first
        viewer.playerObject.cape.map = null;

        viewer.loadCape(textureUrl).then(() => {
          const map = viewer.playerObject.cape.map;
          if (map) {
            map.magFilter = THREE.NearestFilter;
            map.minFilter = THREE.NearestFilter;
            map.needsUpdate = true;
          }
        }).catch((e: unknown) => {
          console.warn("viewer.loadCape failed, using fallback", e);
          if (textureLoaderRef.current) {
            textureLoaderRef.current.setCrossOrigin("anonymous");
            textureLoaderRef.current.load(textureUrl, (texture) => {
              texture.magFilter = THREE.NearestFilter;
              texture.minFilter = THREE.NearestFilter;
              viewer.playerObject.cape.map = texture;
              currentTexture = texture;
            });
          }
        });
      }
    } else {
      viewer.loadCape(null);
    }

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (currentTexture) {
        currentTexture.dispose();
      }
    };
  }, [cape]);

  const loadSkin = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const next = (inputRef.current?.value || "steve").trim();
    if (!next || next === loadedIgnRef.current) return;
    viewer.loadSkin(SKIN_URL(next)).then(
      () => {
        loadedIgnRef.current = next;
        setIgn(next);
      },
      (e) => console.warn("skin load failed", e),
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewerRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      viewerRef.current?.loadSkin(dataUrl);
      setIgn("Local Skin");
      loadedIgnRef.current = "";
    };
    reader.readAsDataURL(file);
  };

  const toggleElytra = () => {
    if (!elytra) {
      setLoadingElytra(true);
      // Simulate Minecraft loading time
      setTimeout(() => {
        setLoadingElytra(false);
        setElytra(true);
        setSneak(false);
        setSprint(false);
        setFlying(false);
      }, 800);
    } else {
      setElytra(false);
    }
  };

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2.5 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl lg:sticky lg:top-6 lg:w-[320px] lg:self-start shadow-2xl">
      <div className="text-center">
        <div className="text-[10px] font-medium uppercase tracking-widest text-white/40">In-Game Preview</div>
        <div className="truncate text-sm font-bold text-white">{cape ? cape.name : "No cape selected"}</div>
      </div>

      <div className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner" style={{width:280,height:340}}>
        <canvas ref={canvasRef} className="block" />
        {loadingElytra && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mt-1 text-xs font-bold text-white uppercase tracking-widest">Loading...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => { setSneak(!sneak); setSprint(false); setFlying(false); setElytra(false); }}
          className={`flex flex-col items-center justify-center rounded-xl border transition-all duration-300 py-2 ${sneak ? "bg-primary/30 border-primary text-primary shadow-[0_0_20px_-5px_oklch(0.65_0.18_255_/_0.5)] scale-95" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20"}`}
          title="Sneak"
        >
          <Footprints className="h-4 w-4" />
          <span className="mt-1 text-[10px] font-bold">Sneak</span>
        </button>
        <button
          onClick={() => { setSprint(!sprint); setSneak(false); setFlying(false); setElytra(false); }}
          className={`flex flex-col items-center justify-center rounded-xl border transition-all duration-300 py-2 ${sprint ? "bg-primary/30 border-primary text-primary shadow-[0_0_20px_-5px_oklch(0.65_0.18_255_/_0.5)] scale-95" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20"}`}
          title="Sprint"
        >
          <Wind className="h-4 w-4" />
          <span className="mt-1 text-[10px] font-bold">Sprint</span>
        </button>
        <button
          onClick={() => { setFlying(!flying); setSneak(false); setSprint(false); setElytra(false); }}
          className={`flex flex-col items-center justify-center rounded-xl border transition-all duration-300 py-2 ${flying ? "bg-primary/30 border-primary text-primary shadow-[0_0_20px_-5px_oklch(0.65_0.18_255_/_0.5)] scale-95" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20"}`}
          title="Fly"
        >
          <Plane className="h-4 w-4" />
          <span className="mt-1 text-[10px] font-bold">Fly</span>
        </button>
        <button
          onClick={toggleElytra}
          className={`flex flex-col items-center justify-center rounded-xl border transition-all duration-300 py-2 ${elytra ? "bg-primary/30 border-primary text-primary shadow-[0_0_20px_-5px_oklch(0.65_0.18_255_/_0.5)] scale-95" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20"}`}
          title="Elytra"
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="mt-1 text-[10px] font-bold">Elytra</span>
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            defaultValue={ign}
            onKeyDown={(e) => e.key === "Enter" && loadSkin()}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-3 pr-8 py-2 text-xs outline-none transition-all focus:border-primary/50 focus:bg-white/10 text-white placeholder:text-white/30"
            placeholder="Minecraft IGN"
          />
          <User className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        </div>
        <button
          onClick={loadSkin}
          className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all active:scale-95"
        >
          Load
        </button>
      </div>

      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/png"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 border-dashed bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all active:scale-95"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Local Skin
        </button>
      </div>

      <button
        onClick={onApply}
        disabled={!cape || applying || justApplied}
        className={`rounded-xl border px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 ${
          justApplied
            ? "border-green-500/60 bg-green-500/30 shadow-[0_0_30px_-10px_rgba(34,197,94,0.8)] scale-[1.02]"
            : "border-primary/30 bg-primary/20 shadow-[0_0_30px_-10px_oklch(0.65_0.18_255_/_0.6)] hover:bg-primary/30 disabled:opacity-20"
        }`}
      >
        {applying ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : justApplied ? (
          <><span className="text-green-400 text-lg">✓</span> Applied!</>
        ) : (
          "Apply Cape →"
        )}
      </button>

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Scroll to zoom · drag to rotate · dblclick to apply
      </p>
    </aside>
  );
}

