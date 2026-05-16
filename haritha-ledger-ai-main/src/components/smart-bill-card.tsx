import { useRef } from "react";
import { motion } from "framer-motion";
import { Share2, Download, FileText } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { fmtINR, STATUS_LABEL_TE } from "@/lib/format";
import type { Shop } from "@/hooks/use-shops";

export type BillRow = {
  id: string; bill_date: string; total_amount: number; jama_amount: number;
  old_balance: number; new_balance: number; status: string; image_url: string | null;
  notes: string | null; shop_id: string;
};

export function SmartBillCard({ bill, shop }: { bill: BillRow; shop?: Shop }) {
  const ref = useRef<HTMLDivElement>(null);

  const tone =
    bill.status === "paid" ? "from-success/15 to-success/5 border-success/30"
    : bill.status === "partial" ? "from-warning/15 to-warning/5 border-warning/30"
    : "from-destructive/15 to-destructive/5 border-destructive/30";

  const share = async () => {
    if (!ref.current) return;
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `bill-${bill.id}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Bill Summary" });
    } else {
      downloadImage();
    }
  };

  const downloadImage = async () => {
    if (!ref.current) return;
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `bill-${bill.id}.png`; a.click();
  };

  const downloadPdf = async () => {
    if (!ref.current) return;
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2 });
    const pdf = new jsPDF({ unit: "px", format: [600, 400] });
    pdf.addImage(dataUrl, "PNG", 0, 0, 600, 400);
    pdf.save(`bill-${bill.id}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div ref={ref} className={`rounded-2xl border bg-gradient-to-br ${tone} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-muted-foreground">{bill.bill_date}</div>
            <div className="font-bold">{shop?.name_te ?? shop?.code ?? "Shop"}</div>
          </div>
          <span className="text-xs font-semibold">{STATUS_LABEL_TE[bill.status]}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="మొత్తం" value={fmtINR(bill.total_amount)} />
          <Stat label="జమ" value={fmtINR(bill.jama_amount)} accent="success" />
          <Stat label="పాత బాకీ" value={fmtINR(bill.old_balance)} />
          <Stat label="కొత్త బాకీ" value={fmtINR(bill.new_balance)} accent={bill.new_balance > 0 ? "danger" : "success"} />
        </div>
        {bill.notes && <div className="mt-2 text-xs italic text-muted-foreground">{bill.notes}</div>}
      </div>
      <div className="flex gap-2">
        <ActBtn onClick={share}><Share2 className="size-3.5" /> Share</ActBtn>
        <ActBtn onClick={downloadImage}><Download className="size-3.5" /> PNG</ActBtn>
        <ActBtn onClick={downloadPdf}><FileText className="size-3.5" /> PDF</ActBtn>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <div className="rounded-xl bg-card/60 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-bold ${accent === "success" ? "text-success" : accent === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function ActBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 h-9 rounded-lg bg-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-secondary/70">
      {children}
    </button>
  );
}
