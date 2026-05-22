import { useEffect, useState } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { pb } from "@/lib/pb";
import { emailFromRecord, isEmailVerified } from "@/lib/auth";
import type { Cape } from "@/lib/capes";

interface Props {
  ign: string;
  appliedCape: Cape | null;
  onClose: () => void;
}

export function AccountModal({ ign, appliedCape, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pb.authStore.isValid) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        await pb.collection("users").authRefresh();
      } catch {
        /* keep cached record */
      }
      if (cancelled) return;
      const rec = pb.authStore.record as Record<string, unknown> | null;
      setEmail(emailFromRecord(rec));
      setVerified(isEmailVerified(rec));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-[20%] -right-[20%] w-[50%] h-[50%] bg-primary/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="mb-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-lg">
              <img
                src={`https://minotar.net/avatar/${encodeURIComponent(ign || "steve")}/56`}
                alt={ign || "Player"}
                className="h-full w-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold text-white truncate">My Account</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all shrink-0"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <dl className="space-y-2 text-sm relative z-10">
          <Row label="Minecraft IGN" value={ign || "—"} />
          <Row
            label="Email"
            value={
              loading ? (
                "Loading…"
              ) : email ? (
                <span className="inline-flex items-center gap-1.5 justify-end">
                  <Mail className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  <span className="truncate max-w-[200px]">{email}</span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Email status"
            value={
              loading ? (
                "—"
              ) : verified ? (
                <span className="inline-flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : email ? (
                <span className="inline-flex items-center gap-1 text-amber-400/90">
                  <AlertCircle className="h-3.5 w-3.5" /> Not verified
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row label="Tier" value="Free" />
          <Row label="Current Cape" value={appliedCape?.name ?? "None"} />
        </dl>

        <p className="mt-4 text-xs text-muted-foreground relative z-10">
          Use a real email you own — password reset links are sent there. Each Minecraft username can only be registered once.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
