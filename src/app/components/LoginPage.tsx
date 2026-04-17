import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { toast } from "sonner";
import { Eye, EyeOff, FlaskConical, LogIn, UserPlus, Loader2 } from "lucide-react";

interface LoginPageProps {
  onLogin: (session: any) => void;
  apiUrl: string;
  apiKey: string;
}

export function LoginPage({ onLogin, apiUrl, apiKey }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(`Sign in failed: ${error.message}`); return; }
      toast.success(`Welcome back${data.user?.user_metadata?.name ? `, ${data.user.user_metadata.name}` : ""}!`);
      onLogin(data.session);
    } catch (err) {
      toast.error("An unexpected error occurred during sign in.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all required fields."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(`Sign up failed: ${data.error || "Unknown error"}`); return; }
      toast.success("Account created! Please sign in.");
      setName("");
      setPassword("");
      setMode("signin");
    } catch (err) {
      toast.error("An unexpected error occurred during sign up.");
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-green-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-900 shadow-lg mb-4">
            <FlaskConical className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-green-950 tracking-tight">
            Wonder<span className="text-amber-500">zyme</span>
          </h1>
          <p className="text-green-700 mt-1 text-base">Inventory Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
          {/* Tab strip */}
          <div className="flex border-b border-amber-100">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-base font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-green-950 text-white"
                  : "text-green-700 hover:bg-green-50"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-base font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-green-950 text-white"
                  : "text-green-700 hover:bg-green-50"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
            className="p-8 space-y-5"
          >
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-bold text-green-900 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-green-200 bg-[#FDF8F0] text-green-950 text-base placeholder:text-green-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-green-900 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-12 px-4 rounded-xl border-2 border-green-200 bg-[#FDF8F0] text-green-950 text-base placeholder:text-green-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-green-900 mb-1.5">
                Password <span className="text-red-500">*</span>
                {mode === "signup" && (
                  <span className="text-xs font-normal text-green-500 ml-1">(min. 6 characters)</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-green-200 bg-[#FDF8F0] text-green-950 text-base placeholder:text-green-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-800 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-colors mt-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "signin" ? (
                <><LogIn className="h-5 w-5" /> Sign In</>
              ) : (
                <><UserPlus className="h-5 w-5" /> Create Account</>
              )}
            </button>

            <p className="text-center text-sm text-green-600 pt-1">
              {mode === "signin" ? (
                <>Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-amber-600 font-bold hover:underline">
                    Sign up here
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-amber-600 font-bold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-green-600/60 mt-6">
          © {new Date().getFullYear()} Wonderzyme · Inventory Management System
        </p>
      </div>
    </div>
  );
}