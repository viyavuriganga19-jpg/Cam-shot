import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useShops } from "@/hooks/use-shops";
import { fmtINR, STATUS_LABEL_TE } from "@/lib/format";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

type Bill = {
  id: string; bill_date: string; total_amount: number; jama_amount: number;
  old_balance: number; new_balance: number; status: string; image_url: string | null;
  notes: string | null; shop_id: string;
};

function CalendarPage() {
  const shops = useShops();
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  useEffect(() => {
    supabase.from("bills").select("*").order("bill_date", { ascending: false }).limit(500)
      .then(({ data }) => setBills((data as Bill[]) ?? []));
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, Bill[]>();
    for (const b of bills) {
      const k = b.bill_date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return m;
  }, [bills]);

  const modifiers = useMemo(() => {
    const paid: Date[] = [], pending: Date[] = [], partial: Date[] = [];
    for (const [k, bs] of byDate) {
      const d = new Date(k + "T00:00:00");
      const allPaid = bs.every(b => b.status === "paid");
      const anyPending = bs.some(b => b.status === "pending");
      const anyPartial = bs.some(b => b.status === "partial");
      if (allPaid) paid.push(d);
      else if (anyPartial && !anyPending) partial.push(d);
      else pending.push(d);
    }
    return { paid, pending, partial };
  }, [byDate]);

  const selKey = selected?.toISOString().slice(0, 10);
  const todays = selKey ? byDate.get(selKey) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-3xl p-3">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={modifiers}
          modifiersClassNames={{
            paid: "!bg-success !text-success-foreground !rounded-full",
            pending: "!bg-destructive !text-destructive-foreground !rounded-full",
            partial: "!bg-warning !text-warning-foreground !rounded-full",
          }}
          className="!m-0"
        />
        <div className="flex gap-3 text-[11px] px-2 pb-1">
          <Legend dot="bg-success" label="🟢 Paid" />
          <Legend dot="bg-destructive" label="🔴 Pending" />
          <Legend dot="bg-warning" label="🟡 Partial" />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {todays.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center text-sm text-muted-foreground py-10 glass-card rounded-2xl">
            ఈ తేదీకి బిల్‌లు లేవు
          </motion.div>
        ) : (
          todays.map((b) => {
            const shop = shops.find((s) => s.id === b.shop_id);
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="font-bold">{shop?.name_te ?? shop?.code}</div>
                  <span className="text-xs">{STATUS_LABEL_TE[b.status]}</span>
                </div>
                {b.image_url && <img src={b.image_url} className="w-full rounded-xl max-h-56 object-contain bg-black/5" />}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <Mini label="మొత్తం" v={fmtINR(b.total_amount)} />
                  <Mini label="జమ" v={fmtINR(b.jama_amount)} />
                  <Mini label="పాత" v={fmtINR(b.old_balance)} />
                  <Mini label="కొత్త" v={fmtINR(b.new_balance)} />
                </div>
                {b.notes && <div className="text-xs italic text-muted-foreground">{b.notes}</div>}
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return <div className="flex items-center gap-1"><span className={`size-2 rounded-full ${dot}`} /> {label}</div>;
}
function Mini({ label, v }: { label: string; v: string }) {
  return <div className="bg-secondary rounded-lg px-2 py-1.5"><div className="text-[10px] text-muted-foreground">{label}</div><div className="font-semibold text-xs">{v}</div></div>;
}
