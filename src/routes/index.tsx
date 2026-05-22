import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CATEGORIES, Cape, CapeCategory, loadCapes } from "@/lib/capes";
import { CapeCard } from "@/components/CapeCard";
import { PlayerPreview } from "@/components/PlayerPreview";
import { AuthModal } from "@/components/AuthModal";
import { AccountModal } from "@/components/AccountModal";
import { pb } from "@/lib/pb";
import { saveAppliedCape, getAppliedCape } from "@/lib/laby.functions";
import {
  capeFromApplied,
  clearAppliedCapeCache,
  loadAppliedCapeForUser,
  minecraftIgnFromRecord,
  readAppliedCapeCache,
  saveAppliedCapeClient,
  writeAppliedCapeCache,
} from "@/lib/applied-cape";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AitherWarth Catalog Dashboard" },
      { name: "description", content: "Browse and preview AitherWarth Minecraft capes — normal, partner, SkinMC, Labymod and animated capes." },
      { property: "og:title", content: "AitherWarth Catalog Dashboard" },
      { property: "og:description", content: "Browse and preview AitherWarth Minecraft capes." },
    ],
  }),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState<CapeCategory>("normal");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Cape | null>(null);
  const [ign, setIgn] = useState("Sethjuhh_");
  const [limit, setLimit] = useState(48);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [appliedCape, setAppliedCape] = useState<Cape | null>(null);
  const [applying, setApplying] = useState(false);

  // Restore session from PocketBase authStore on mount, and load applied cape
  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.record) return;

    const name = minecraftIgnFromRecord(pb.authStore.record as Record<string, unknown>);
    setIgn(name);
    setIsLoggedIn(true);

    const cached = readAppliedCapeCache(name);
    if (cached) setAppliedCape(cached);

    void (async () => {
      const fromPb = await loadAppliedCapeForUser(name);
      if (fromPb) {
        setAppliedCape(fromPb);
        return;
      }
      const remote = await getAppliedCape({ data: name });
      if (remote.textureUrl) {
        const cape = capeFromApplied({
          textureUrl: remote.textureUrl,
          capeName: remote.capeName ?? "Your Cape",
          capeCategory: remote.capeCategory ?? "normal",
        });
        setAppliedCape(cape);
        writeAppliedCapeCache(name, cape);
      }
    })();
  }, []);

  const handleLogin = (username: string) => {
    setIgn(username);
    setIsLoggedIn(true);
    toast.success(`Logged in as ${username}`);
    void (async () => {
      const fromPb = await loadAppliedCapeForUser(username);
      if (fromPb) {
        setAppliedCape(fromPb);
        return;
      }
      const remote = await getAppliedCape({ data: username });
      if (remote.textureUrl) {
        setAppliedCape(
          capeFromApplied({
            textureUrl: remote.textureUrl,
            capeName: remote.capeName ?? "Your Cape",
            capeCategory: remote.capeCategory ?? "normal",
          }),
        );
      }
    })();
  };

  const handleLogout = () => {
    if (pb.authStore.record) {
      const name = minecraftIgnFromRecord(pb.authStore.record as Record<string, unknown>);
      clearAppliedCapeCache(name);
    }
    pb.authStore.clear();
    setIsLoggedIn(false);
    setIgn("Sethjuhh_");
    setAppliedCape(null);
    setSelected(null);
    toast.info("Logged out successfully");
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
        setLimit((prev) => prev + 48);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [capes, setCapes] = useState<Cape[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLimit(48);
    if (category === "skinmc") {
      setCapes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCapes(category)
      .then((list) => { if (!cancelled) setCapes(list); })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load capes"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);


  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return capes.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [capes, search]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const isPanelCategory = category === "skinmc";

  const handleApply = async (cape: Cape) => {
    if (!isLoggedIn || !pb.authStore.isValid) {
      toast.error("Please log in to apply a cape!");
      setIsAuthModalOpen(true);
      return;
    }
    setApplying(true);
    try {
      let result = await saveAppliedCapeClient(ign, cape);

      if (!result.success) {
        result = await saveAppliedCape({
          data: {
            username: ign,
            textureUrl: cape.textureUrl,
            capeName: cape.name,
            capeCategory: cape.category,
            authToken: pb.authStore.token,
            authRecord: pb.authStore.record as Record<string, unknown>,
          },
        });
      }

      if (result.success) {
        setAppliedCape(cape);
        setSelected(null);
        writeAppliedCapeCache(ign, cape);
        toast.success(`Cape "${cape.name}" applied and saved!`);
      } else {
        toast.error(result.error ?? "Failed to save cape to PocketBase.");
      }
    } catch {
      toast.error("Failed to apply cape. Is PocketBase running?");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-foreground selection:bg-primary/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-brand/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full" />
      </div>

      {/* Floating Header */}
      <div className="px-4 pt-5 lg:px-10 relative z-50">
        <header className="mx-auto flex max-w-[1600px] items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="AitherWarth"
              className="h-16 w-16 rounded-2xl object-cover shadow-lg border border-white/10"
            />
            <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">AitherWarth</span>
          </div>
          <nav className="hidden items-center gap-2 text-sm font-medium md:flex">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.id); setSelected(null); }}
                className={`whitespace-nowrap rounded-2xl px-4 py-2 transition-all duration-300 ${
                  category === c.id 
                    ? "bg-white/10 text-white border border-white/10 shadow-lg" 
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {c.label.replace(" Capes", "").replace(" Cape", "")}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="https://dsc.gg/picapes" target="_blank" rel="noreferrer" className="hidden text-white/40 hover:text-white/70 transition-colors sm:inline text-sm font-medium">Discord</a>
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAccountOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/10"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white/10 border border-white/10">
                    <img
                      src={`https://minotar.net/avatar/${ign}/36`}
                      alt={ign}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {ign}
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-white/40 hover:text-destructive transition-colors text-sm font-bold px-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)} 
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-all active:scale-95 shadow-lg"
              >
                Login
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Mobile tab strip */}
      <div className="border-b border-border/40 px-4 md:hidden">
        <div className="flex gap-1 overflow-x-auto py-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); setSelected(null); }}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
                category === c.id ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-8 lg:flex-row lg:px-10 lg:py-12">
        <PlayerPreview
          cape={selected ?? appliedCape}
          ign={ign}
          setIgn={setIgn}
          onApply={() => {
            const toApply = selected ?? appliedCape;
            if (toApply) void handleApply(toApply);
          }}
          applying={applying}
        />

        <section className="flex-1">
          {/* Hero */}
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 relative z-10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl text-white">
                {category === "skinmc" ? "SkinMC Capes"
                  : category === "labymod" ? "LabyMod Cloaks"
                  : category === "partner" ? "Partner Capes"
                  : category === "animated" ? "Animated Capes"
                  : "Normal Capes"}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-white/50 font-medium leading-relaxed">
                Discover unique capes with custom textures for your Minecraft character.
                Browse community designs and apply your favorite to your account.
              </p>
            </div>
          </div>

          {isPanelCategory ? (
            <PanelInfo category={category} />
          ) : (
            <div className="relative z-10">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="relative min-w-0 flex-1 group">
                  <svg className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3-3" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search capes..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-14 pr-6 text-base outline-none transition-all focus:border-primary/50 focus:bg-white/10 text-white placeholder:text-white/20 shadow-lg backdrop-blur-md"
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-lg backdrop-blur-md">
                  <span className="text-sm font-bold text-white/60">
                    {filtered.length} <span className="text-white/30 font-medium ml-1">{filtered.length === 1 ? "cape" : "capes"}</span>
                  </span>
                </div>
              </div>

              {loading && (
                <div className="mt-20 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {visible.map((cape) => (
                      <CapeCard
                        key={`${cape.category}-${cape.id}`}
                        cape={cape}
                        selected={selected?.id === cape.id && selected?.category === cape.category}
                        onClick={() => setSelected(cape)}
                        onDoubleClick={() => { setSelected(cape); handleApply(cape); }}
                      />
                    ))}
                  </div>

                  {filtered.length === 0 && (
                    <div className="mt-20 text-center text-sm text-muted-foreground">No capes match your search.</div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-4 py-8 text-center text-sm font-medium text-white/20 lg:px-10">
        Copyright (C) AitherWarth — clone demo
      </footer>


      {accountOpen && (
        <AccountModal
          ign={ign}
          appliedCape={appliedCape}
          onClose={() => setAccountOpen(false)}
        />
      )}

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}

function PanelInfo({ category }: { category: CapeCategory }) {
  if (category !== "skinmc") return null;

  const label = "SkinMC";
  const url = "https://skinmc.net/capes";
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-2xl relative z-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Apply {label} Cape</h2>
      </div>
      <p className="text-white/50 font-medium mb-6">
        Apply any cape from <strong>{label}</strong> directly to your AitherWarth account by following these steps:
      </p>
      <ol className="space-y-4 mb-8">
        {[
          `Open ${url} and pick your favorite cape.`,
          `Copy the direct cape link from ${label}.`,
          `Paste the link below and press Apply to sync it.`
        ].map((step, i) => (
          <li key={i} className="flex gap-4 text-white/70">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/40">{i + 1}</span>
            <span className="font-medium leading-relaxed">{i === 0 ? (
              <>Open <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{url}</a> and pick a cape.</>
            ) : step}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-4">
        <input
          placeholder={`Paste ${label} cape link here...`}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base outline-none transition-all focus:border-primary/50 focus:bg-white/10 text-white placeholder:text-white/20"
        />
        <div className="flex gap-3">
          <button className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-95">Preview</button>
          <button className="flex-1 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95">Apply Now</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow for modal */}
        <div className="absolute -top-[20%] -right-[20%] w-[50%] h-[50%] bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="mb-6 flex items-center justify-between relative z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
