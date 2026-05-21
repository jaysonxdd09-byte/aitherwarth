import { useState, useEffect } from "react";
import { X, User, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pb";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => void;
}

function pbError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // PocketBase ClientResponseError
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

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === "register") {
        await pb.collection("users").create({
          username,
          email,
          password,
          passwordConfirm: password,
          minecraft_ign: username,
        });
        // Auto login after register using email
        const authData = await pb.collection("users").authWithPassword(email, password);
        toast.success("Account created successfully!");
        onLogin((authData.record["minecraft_ign"] as string) || (authData.record["username"] as string));
        onClose();
      } else if (view === "login") {
        // PocketBase auth: identity = email
        const authData = await pb.collection("users").authWithPassword(email, password);
        toast.success(`Welcome back, ${authData.record["username"]}!`);
        onLogin((authData.record["minecraft_ign"] as string) || (authData.record["username"] as string));
        onClose();
      } else if (view === "forgot") {
        await pb.collection("users").requestPasswordReset(email);
        toast.success("Reset link sent to your email!");
        setView("login");
      }
    } catch (err: unknown) {
      toast.error(pbError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616]/80 p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Light Ray */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 shadow-inner border border-white/10">
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-white/40 animate-[spin_10s_linear_infinite]" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {view === "login" ? "Sign In" : view === "register" ? "Register" : "Reset Password"}
          </h2>
          <p className="mt-2 text-sm text-white/40">
            {view === "login" 
              ? "Please enter your details to sign in." 
              : view === "register"
              ? "Join AitherWarth to customize your character."
              : "Enter your email to receive a reset link."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email — shown on register, login, forgot */}
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
            <input
              required
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
            />
          </div>

          {/* Username + Password — shown on register and login */}
          {view !== "forgot" && (
            <>
              {view === "register" && (
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="Choose Minecraft Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
                  />
                </div>
              )}

              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" size={18} />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50 focus:bg-white/10 placeholder:text-white/20"
                />
              </div>
            </>
          )}

          {view === "login" && (
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => setView("forgot")}
                className="text-xs font-medium text-white/30 hover:text-white/60 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Processing..." : view === "login" ? "Sign in" : view === "register" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-white/40">
          {view === "login" ? (
            <>
              Don't have an account?{" "}
              <button 
                onClick={() => setView("register")}
                className="font-bold text-white hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button 
                onClick={() => setView("login")}
                className="font-bold text-white hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
