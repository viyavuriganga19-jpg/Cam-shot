import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { fmtINR } from "@/lib/format";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/totals")({ component: TotalsPage });

type Bill = { bill_date: string; total_amount: number; jama_amount: number; new_balance: number; shop_id: string; status: string };

function TotalsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  useEffect(() => {
    supabase.from("bills").select("bill_date,total_amount,jama_amount,new_balance,shop_id,status")
      .order("bill_date", { ascending: false }).limit(500)
      .then(({ data }) => setBills((data as Bill[]) ?? []));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const totals = useMemo(() => {
    const acc = { today: 0, week: 0, month: 0, pending: 0, jama: 0, balance: 0 };
    for (const b of bills) {
      if (b.bill_date === today) acc.today += b.total_amount;
      if (b.bill_date >= weekAgo) acc.week += b.total_amount;
      if (b.bill_date >= monthStart) acc.month += b.total_amount;
      acc.pending += b.new_balance > 0 ? b.new_balance : 0;
      acc.jama += b.jama_amount;
      acc.balance += b.new_balance;
    }
    return acc;
  }, [bills]);

  const chartDaily = useMemo(() => {
    const map = new Map<string, { date: string; total: number; jama: number; pending: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(d, { date: d.slice(5), total: 0, jama: 0, pending: 0 });
    }
    for (const b of bills) {
      const k = b.bill_date.slice(5);
      const row = [...map.values()].find((r) => r.date === k);
      if (row) { row.total += b.total_amount; row.jama += b.jama_amount; row.pending += Math.max(0, b.new_balance); }
    }
    return [...map.values()];
  }, [bills]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(bills);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, "ledger.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KPI title="ఈరోజు" value={fmtINR(totals.today)} accent="primary" />
        <KPI title="వారం" value={fmtINR(totals.week)} accent="primary" />
        <KPI title="నెల" value={fmtINR(totals.month)} accent="primary" />
        <KPI title="మొత్తం జమ" value={fmtINR(totals.jama)} accent="success" />
        <KPI title="పెండింగ్" value={fmtINR(totals.pending)} accent="danger" />
        <KPI title="మిగిలిన బ్యాలెన్స్" value={fmtINR(totals.balance)} accent="warning" />
      </div>

      <ChartCard title="రోజువారీ వ్యాపారం">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartDaily}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.6 0.18 145)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.6 0.18 145)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.9 0.02 130)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="total" stroke="oklch(0.55 0.18 145)" fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="జమ vs పెండింగ్">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartDaily}>
            <CartesianGrid stroke="oklch(0.9 0.02 130)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="jama" fill="oklch(0.65 0.18 145)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="oklch(0.6 0.22 25)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <button onClick={exportExcel} className="w-full h-12 rounded-xl bg-secondary font-semibold flex items-center justify-center gap-2">
        <Download className="size-4" /> Excel ఎగుమతి
      </button>
    </div>
  );
}

function KPI({ title, value, accent }: { title: string; value: string; accent: "primary" | "success" | "danger" | "warning" }) {
  const c = { primary: "text-primary", success: "text-success", danger: "text-destructive", warning: "text-warning" }[accent];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
      <div className="text-[11px] text-muted-foreground">{title}</div>
      <div className={`text-lg font-extrabold ${c}`}>{value}</div>
    </motion.div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
