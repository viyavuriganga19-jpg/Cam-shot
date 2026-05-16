import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("ఖాతా సృష్టించబడింది! దయచేసి ఇమెయిల్ తనిఖీ చేయండి.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "లోపం జరిగింది");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card rounded-3xl p-8 shadow-elevated"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-2xl gradient-fresh shadow-glow grid place-items-center text-3xl text-primary-foreground font-bold mb-3">కూ</div>
          <h1 className="text-2xl font-bold">కూరగాయల లెడ్జర్</h1>
          <p className="text-sm text-muted-foreground mt-1">హోల్‌సేల్ మార్కెట్ లెక్కలు</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="మీ పేరు"
              className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            minLength={6}
            className="w-full h-12 px-4 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
          />
          <button
            disabled={loading}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "లాగిన్" : "నమోదు చేయండి"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center mt-4 text-sm text-muted-foreground hover:text-primary"
        >
          {mode === "signin" ? "కొత్త ఖాతా సృష్టించండి" : "ఇప్పటికే ఖాతా ఉందా? లాగిన్"}
        </button>
      </motion.div>
    </div>
  );
}
