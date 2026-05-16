import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Calendar, PieChart, Wallet, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function AppLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.navigate({ to: "/login" });
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  const tabs = [
    { to: "/", icon: Home, label: "హోమ్" },
    { to: "/calendar", icon: Calendar, label: "క్యాలెండర్" },
    { to: "/totals", icon: PieChart, label: "మొత్తాలు" },
    { to: "/jama", icon: Wallet, label: "జమ" },
  ] as const;

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl gradient-fresh shadow-glow grid place-items-center text-primary-foreground font-bold">కూ</div>
            <div>
              <h1 className="text-sm font-bold leading-tight">కూరగాయల లెడ్జర్</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">{email}</p>
            </div>
          </div>
          <button onClick={signOut} className="size-9 rounded-xl bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border/40 backdrop-blur-xl bg-background/85">
        <div className="mx-auto max-w-2xl grid grid-cols-4">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="relative flex flex-col items-center gap-1 py-3 text-muted-foreground"
              activeOptions={{ exact: true }}
              activeProps={{ className: "!text-primary" }}
            >
              <t.icon className="size-5" />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
