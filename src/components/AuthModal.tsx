import { useState, useEffect, useCallback } from "react";
import { X, User, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pb";
import {
  isValidEmail,
  isValidMinecraftUsername,
  normalizeMinecraftUsername,
  passwordResetUrl,
} from "@/lib/auth";
import { checkUsernameAvailable } from "@/lib/auth.functions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => void;
}

function pbError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (e.response && typeof e.response === "object") {
      const r = e.response as Record<string, unknown>;
      if (r.message && typeof r.message === "string") return r.message;
      if (r.data && typeof r.data === "object") {
        const msgs = Object.values(r.data as Record<string, { message?: string }>)
          .map((v) => v?.message)
          .filter(Boolean)
          .join(", ");
        if (msgs) return msgs;
      }
    }
    if (typeof e.message === "string") return e.message;
  }
  return "Something went wrong. Please try again.";
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const switchView = (v: "login" | "register" | "forgot") => {
    setView(v);
    setFormError(null);
    setPassword("");
    setUsernameStatus("idle");
    setUsernameHint(null);
  };

  const verifyUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setUsernameStatus("idle");
      setUsernameHint(null);
      return;
    }
    if (!isValidMinecraftUsername(trimmed)) {
      setUsernameStatus("invalid");
      setUsernameHint("3–16 characters: letters, numbers, and underscores only.");
      return;
    }
    setUsernameStatus("checking");
    setUsernameHint(null);
    try {
      const { available, reason } = await checkUsernameAvailable({ data: trimmed });
      if (available) {
        setUsernameStatus("available");
        setUsernameHint("Username is available.");
      } else {
        setUsernameStatus("taken");
        setUsernameHint(reason ?? "This username is already taken.");
      }
    } catch {
      setUsernameStatus("idle");
      setUsernameHint(null);
    }
  }, []);

  useEffect(() => {
    if (view !== "register" || !username.trim()) return;
    const t = setTimeout(() => void verifyUsername(username), 400);
    return () => clearTimeout(t);
  }, [username, view, verifyUsername]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const emailTrimmed = email.trim();

      if (view === "register") {
        if (!isValidEmail(emailTrimmed)) {
          throw new Error("Enter a valid email address (e.g. you@example.com).");
        }
        if (!isValidMinecraftUsername(username)) {
          throw new Error("Minecraft username must be 3–16 characters (letters, numbers, underscore).");
        }
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");

        const { available, reason } = await checkUsernameAvailable({ data: username.trim() });
        if (!available) {
          throw new Error(reason ?? "This Minecraft username is already registered.");
        }

        const ign = username.trim();
        const ignKey = normalizeMinecraftUsername(ign);

        await pb.collection("users").create({
          username: ign,
          email: emailTrimmed,
          emailVisibility: false,
          password,
          passwordConfirm: password,
          minecraft_ign: ign,
          minecraft_ign_normalized: ignKey,
        });

        try {
          await pb.collection("users").requestVerification(emailTrimmed);
        } catch {
          /* SMTP may be off locally */
        }

        const authData = await pb.collection("users").authWithPassword(emailTrimmed, password);
        const loggedIgn = (authData.record["minecraft_ign"] as string) || ign;
        toast.success(`Welcome to AitherWarth, ${loggedIgn}!`);
        onLogin(loggedIgn);
        setUsername("");
        setEmail("");
        setPassword("");
        onClose();
      } else if (view === "login") {
        if (!isValidEmail(emailTrimmed)) {
          throw new Error("Enter the email address linked to your account.");
        }
        const authData = await pb.collection("users").authWithPassword(emailTrimmed, password);
        const ign = (authData.record["minecraft_ign"] as string) || (authData.record["username"] as string);
        toast.success(`Welcome back, ${ign}!`);
        onLogin(ign);
        setEmail("");
        setPassword("");
        onClose();
      } else if (view === "forgot") {
        if (!isValidEmail(emailTrimmed)) {
          throw new Error("Enter the email address you used when registering.");
        }
        await pb.collection("users").requestPasswordReset(emailTrimmed, {
          url: passwordResetUrl(),
        });
        toast.success("If that email is registered, we sent a reset link. Check your inbox.");
        switchView("login");
      }
    } catch (err: unknown) {
      const msg = pbError(err);
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already")) {
        const friendly =
          msg.toLowerCase().includes("email")
            ? "This email is already registered. Try signing in or use Forgot Password."
            : "This Minecraft username is already registered.";
        setFormError(friendly);
        toast.error(friendly);
      } else {
        setFormError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616]/80 p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 shadow-inner border border-white/10">
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-white/40 animate-[spin_10s_linear_infinite]" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {view === "login" ? "Sign In" : view === "register" ? "Register" : "Reset Password"}
          </h2>
          <p className="mt-2 text-sm text-white/40">
            {view === "login"
              ? "Sign in with the email you registered with."
              : view === "register"
                ? "Use a real email — each Minecraft username can only be claimed once."
                : "We'll email you a link to choose a new password."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
            />
          </div>

          {view !== "forgot" && (
            <>
              {view === "register" && (
                <div>
                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
                    <input
                      required
                      type="text"
                      autoComplete="username"
                      placeholder="Minecraft username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={() => void verifyUsername(username)}
                      maxLength={16}
                      className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
                    />
                    {usernameStatus === "checking" && (
                      <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/30" />
                    )}
                  </div>
                  {usernameHint && (
                    <p
                      className={`mt-1.5 text-xs px-1 ${
                        usernameStatus === "available"
                          ? "text-green-400"
                          : usernameStatus === "taken" || usernameStatus === "invalid"
                            ? "text-red-400"
                            : "text-white/40"
                      }`}
                    >
                      {usernameHint}
                    </p>
                  )}
                </div>
              )}

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
                <input
                  required
                  type="password"
                  autoComplete={view === "register" ? "new-password" : "current-password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
                />
              </div>
            </>
          )}

          {view === "login" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchView("forgot")}
                className="text-xs font-medium text-white/30 hover:text-white/60 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {formError && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 text-center">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (view === "register" &&
                (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "checking"))
            }
            className="w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Processing..." : view === "login" ? "Sign in" : view === "register" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/40">
          {view === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => switchView("register")} className="font-bold text-white hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => switchView("login")} className="font-bold text-white hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
