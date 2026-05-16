import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { fmtINR } from "@/lib/format";
import { useShops } from "@/hooks/use-shops";

export const Route = createFileRoute("/_app/jama")({ component: JamaPage });

type J = { id: string; amount: number; jama_date: string; shop_id: string };
type B = { shop_id: string; new_balance: number; bill_date: string };

function JamaPage() {
  const shops = useShops();
  const [jama, setJama] = useState<J[]>([]);
  const [bills, setBills] = useState<B[]>([]);

  useEffect(() => {
    supabase.from("jama_history").select("id,amount,jama_date,shop_id").order("jama_date", { ascending: false }).limit(200)
      .then(({ data }) => setJama((data as J[]) ?? []));
    supabase.from("bills").select("shop_id,new_balance,bill_date").order("bill_date", { ascending: false }).limit(500)
      .then(({ data }) => setBills((data as B[]) ?? []));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const todayJama = jama.filter((j) => j.jama_date === today).reduce((s, j) => s + j.amount, 0);
  const yestJama = jama.filter((j) => j.jama_date === yest).reduce((s, j) => s + j.amount, 0);

  const pendingPerShop = useMemo(() => {
    const m = new Map<string, { amount: number; lastJamaDays: number | null }>();
    for (const b of bills) {
      const cur = m.get(b.shop_id) ?? { amount: 0, lastJamaDays: null };
      if (b.new_balance > 0) cur.amount += b.new_balance;
      m.set(b.shop_id, cur);
    }
    const now = Date.now();
    for (const [shopId, v] of m) {
      const last = jama.filter((j) => j.shop_id === shopId).sort((a, b) => (a.jama_date < b.jama_date ? 1 : -1))[0];
      if (last) v.lastJamaDays = Math.floor((now - new Date(last.jama_date).getTime()) / 86400000);
    }
    return m;
  }, [bills, jama]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Big title="ఈరోజు జమ" value={fmtINR(todayJama)} tone="success" />
        <Big title="నిన్నటి జమ" value={fmtINR(yestJama)} tone="muted" />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">షాప్ ప్రకారం బాకీ</div>
        <div className="space-y-2">
          {shops.map((s) => {
            const p = pendingPerShop.get(s.id);
            const days = p?.lastJamaDays;
            const smart = days != null && days > 0 ? `${days} రోజులుగా జమ రాలేదు` : "నేడే జమ వచ్చింది";
            return (
              <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{s.name_te ?? s.code}</div>
                  <div className={`text-xs ${days && days >= 3 ? "text-destructive" : "text-muted-foreground"}`}>{smart}</div>
                </div>
                <div className={`text-right font-extrabold ${p?.amount ? "text-destructive" : "text-success"}`}>
                  {fmtINR(p?.amount ?? 0)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">జమ చరిత్ర</div>
        <div className="space-y-2">
          {jama.slice(0, 30).map((j) => {
            const shop = shops.find((s) => s.id === j.shop_id);
            return (
              <div key={j.id} className="flex justify-between items-center bg-secondary rounded-xl px-4 py-2.5">
                <div>
                  <div className="text-sm font-semibold">{shop?.name_te ?? shop?.code}</div>
                  <div className="text-[11px] text-muted-foreground">{j.jama_date}</div>
                </div>
                <div className="text-success font-bold">{fmtINR(j.amount)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Big({ title, value, tone }: { title: string; value: string; tone: "success" | "muted" }) {
  return (
    <div className={`rounded-2xl p-5 ${tone === "success" ? "gradient-fresh text-primary-foreground shadow-glow" : "glass-card"}`}>
      <div className={`text-xs ${tone === "success" ? "opacity-90" : "text-muted-foreground"}`}>{title}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}
