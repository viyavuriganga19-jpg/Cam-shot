import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useShops, type Shop } from "@/hooks/use-shops";
import { BillUpload } from "@/components/bill-upload";
import { SmartBillCard, type BillRow } from "@/components/smart-bill-card";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const shops = useShops();
  const [shop, setShop] = useState<Shop | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { if (!shop && shops[0]) setShop(shops[0]); }, [shops, shop]);

  useEffect(() => {
    if (!shop) return;
    supabase.from("bills").select("*").eq("shop_id", shop.id).order("bill_date", { ascending: false }).limit(10)
      .then(({ data }) => setBills((data as BillRow[]) ?? []));
  }, [shop, refresh]);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-muted-foreground mb-2">షాప్ ఎంచుకోండి</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {shops.map((s) => (
            <button
              key={s.id}
              onClick={() => setShop(s)}
              className={`shrink-0 px-5 h-11 rounded-2xl font-bold text-sm transition relative ${
                shop?.id === s.id ? "gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-foreground"
              }`}
            >
              {s.code}
              {shop?.id === s.id && (
                <motion.span layoutId="shop-pill" className="absolute inset-0 rounded-2xl ring-2 ring-primary/30" />
              )}
            </button>
          ))}
        </div>
      </div>

      {shop && <BillUpload shop={shop} onSaved={() => setRefresh((r) => r + 1)} />}

      <div>
        <div className="text-xs text-muted-foreground mb-2">ఇటీవలి బిల్‌లు</div>
        {bills.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10 glass-card rounded-2xl">
            బిల్‌లు లేవు. ఫోటో అప్‌లోడ్ చేయండి.
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map((b) => <SmartBillCard key={b.id} bill={b} shop={shop ?? undefined} />)}
          </div>
        )}
      </div>
    </div>
  );
}
