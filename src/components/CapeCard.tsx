import { useState } from "react";
import { Cape } from "@/lib/capes";

interface Props {
  cape: Cape;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export function CapeCard({ cape, selected, onClick, onDoubleClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isLaby = cape.renderUrl.includes("laby.net") || cape.renderUrl.includes("/cache/") || cape.renderUrl.includes("/capu/");

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={cape.name}
      className={`group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-95 ${
        selected 
          ? "border-primary/50 bg-primary/5 ring-4 ring-primary/20" 
          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <div className="relative flex-1 overflow-hidden">
        {!loaded && !error && (
          <div className="absolute inset-0 bg-white/[0.02]" />
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/20 uppercase tracking-widest bg-white/5 backdrop-blur-sm">
            no image
          </div>
        ) : isLaby ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 [perspective:1000px]">
            <div 
              className={`relative w-24 aspect-[10/16] transition-all duration-300 [transform-style:preserve-3d] [transform:rotateY(-15deg)_rotateX(5deg)] group-hover:[transform:rotateY(-5deg)_rotateX(2deg)_scale(1.05)] ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="absolute inset-0 bg-neutral-900 shadow-2xl rounded-[1px] overflow-hidden border border-white/10">
                <img
                  src={cape.renderUrl}
                  alt={cape.name}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                  className="h-full w-full"
                  style={{ imageRendering: "pixelated", objectFit: "cover", objectPosition: "9% 50%" }}
                />
              </div>
              <div className="absolute inset-y-0 -right-[1.5px] w-[1.5px] bg-black/60 [transform:rotateY(90deg)] origin-left" />
              <div className="absolute inset-x-0 -bottom-[1.5px] h-[1.5px] bg-black/80 [transform:rotateX(-90deg)] origin-top" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/5 pointer-events-none" />
            </div>
          </div>
        ) : (
          <img
            src={cape.renderUrl}
            alt={cape.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-110 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 py-4 backdrop-blur-md bg-black/20 border-t border-white/5">
        <span className="truncate text-[13px] font-bold text-white tracking-tight">{cape.name}</span>
      </div>
    </button>
  );
}
