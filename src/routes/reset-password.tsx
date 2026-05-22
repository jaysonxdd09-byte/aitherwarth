import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pb";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password — AitherWarth" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    if (!t) setError("Invalid or missing reset link. Request a new one from the login screen.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await pb.collection("users").confirmPasswordReset(token, password, passwordConfirm);
      setDone(true);
      toast.success("Password updated! You can sign in now.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "This reset link is invalid or has expired.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white text-center">Set a new password</h1>
        <p className="mt-2 text-center text-sm text-white/50">
          Choose a new password for your AitherWarth account.
        </p>

        {done ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-green-400 font-medium">Your password has been updated.</p>
            <Link
              to="/"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white py-3.5 text-sm font-bold text-black hover:bg-white/90"
            >
              Back to home & sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="group relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                required
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                disabled={!token}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-50"
              />
            </div>
            <div className="group relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                size={18}
              />
              <input
                required
                type="password"
                placeholder="Confirm new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={8}
                disabled={!token}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-white/40">
          <Link to="/" className="text-white/60 hover:text-white hover:underline">
            Return to catalog
          </Link>
        </p>
      </div>
    </div>
  );
}
