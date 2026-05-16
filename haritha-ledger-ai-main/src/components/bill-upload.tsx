import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, X, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ocrBill } from "@/lib/ocr.functions";
import { toast } from "sonner";
import { computeStatus, fmtINR } from "@/lib/format";
import type { Shop } from "@/hooks/use-shops";

type OcrData = {
  bill_date: string;
  total_amount: number;
  jama_amount: number;
  old_balance: number;
  new_balance: number;
  items: any[];
  notes: string;
  raw?: any;
};

export function BillUpload({ shop, onSaved }: { shop: Shop; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "scanning" | "preview" | "saving">("idle");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgPath, setImgPath] = useState<string | null>(null);
  const [data, setData] = useState<OcrData | null>(null);
  const runOcr = useServerFn(ocrBill);

  const reset = () => {
    setStage("idle"); setImgUrl(null); setImgPath(null); setData(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStage("uploading");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("bills").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("bills").getPublicUrl(path);
      setImgUrl(pub.publicUrl); setImgPath(path);

      setStage("scanning");
      const base64 = await toBase64(file);
      const ocr = await runOcr({ data: { imageBase64: base64, mimeType: file.type } });
      setData(ocr);
      setStage("preview");
    } catch (err: any) {
      toast.error(err.message ?? "అప్‌లోడ్ విఫలమైంది");
      reset();
    }
  };

  const save = async () => {
    if (!data || !imgUrl) return;
    try {
      setStage("saving");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const status = computeStatus(data.total_amount, data.jama_amount);
      const { data: bill, error } = await supabase.from("bills").insert({
        user_id: u.user.id,
        shop_id: shop.id,
        bill_date: data.bill_date,
        image_url: imgUrl,
        total_amount: data.total_amount,
        jama_amount: data.jama_amount,
        old_balance: data.old_balance,
        new_balance: data.new_balance,
        status,
        items: data.items,
        notes: data.notes,
        ocr_raw: data.raw ?? null,
      }).select().single();
      if (error) throw error;

      if (data.jama_amount > 0) {
        await supabase.from("jama_history").insert({
          user_id: u.user.id, shop_id: shop.id, bill_id: bill.id,
          amount: data.jama_amount, jama_date: data.bill_date,
        });
      }
      if (data.new_balance > 0) {
        await supabase.from("pending_records").insert({
          user_id: u.user.id, shop_id: shop.id, bill_id: bill.id,
          amount: data.new_balance, due_date: data.bill_date,
        });
      }
      await supabase.from("notifications").insert({
        user_id: u.user.id,
        type: status === "paid" ? "jama_received" : status === "pending" ? "jama_missing" : "pending_alert",
        title: status === "paid" ? `🟢 ${fmtINR(data.jama_amount)} జమ వచ్చింది` :
               status === "pending" ? `🔴 ఈరోజు జమ రాలేదు (${shop.code})` :
               `🟡 Partial Payment ${shop.code}`,
        message: `${shop.name_te ?? shop.name}`,
      });

      toast.success("బిల్ సేవ్ అయింది");
      reset();
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "సేవ్ విఫలమైంది");
      setStage("preview");
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />

      {stage === "idle" && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-3xl p-6 gradient-fresh text-primary-foreground shadow-glow relative overflow-hidden"
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="size-20 rounded-full bg-white/20 grid place-items-center backdrop-blur"
            >
              <Camera className="size-10" />
            </motion.div>
            <div className="text-center">
              <div className="text-lg font-bold">బిల్ ఫోటో అప్‌లోడ్ చేయండి</div>
              <div className="text-xs opacity-90">Tap to scan with AI</div>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-3 py-1">
              <Sparkles className="size-3" /> Gemini Vision OCR
            </div>
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {(stage === "uploading" || stage === "scanning") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-3xl p-6 glass-card relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="size-6 animate-spin text-primary" />
              <div>
                <div className="font-semibold">{stage === "uploading" ? "అప్‌లోడ్ అవుతోంది..." : "AI బిల్ చదువుతోంది..."}</div>
                <div className="text-xs text-muted-foreground">{stage === "scanning" ? "Gemini Vision is extracting Telugu text" : "Saving image"}</div>
              </div>
            </div>
            {imgUrl && (
              <div className="mt-4 relative rounded-xl overflow-hidden scan-line">
                <img src={imgUrl} alt="bill" className="w-full max-h-64 object-contain bg-black/5" />
              </div>
            )}
          </motion.div>
        )}

        {stage === "preview" && data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 glass-card shadow-elevated"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground">OCR ప్రివ్యూ</div>
                <div className="font-bold">{shop.name_te ?? shop.name} · {data.bill_date}</div>
              </div>
              <button onClick={reset} className="size-8 rounded-full bg-secondary grid place-items-center"><X className="size-4" /></button>
            </div>
            {imgUrl && <img src={imgUrl} className="w-full max-h-48 object-contain rounded-xl bg-black/5 mb-3" />}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <EditField label="మొత్తం" value={data.total_amount} onChange={(v) => setData({ ...data, total_amount: v })} />
              <EditField label="జమ" value={data.jama_amount} onChange={(v) => setData({ ...data, jama_amount: v })} />
              <EditField label="పాత బాకీ" value={data.old_balance} onChange={(v) => setData({ ...data, old_balance: v })} />
              <EditField label="కొత్త బాకీ" value={data.new_balance} onChange={(v) => setData({ ...data, new_balance: v })} />
            </div>
            {data.items?.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                {data.items.length} items extracted
              </div>
            )}
            <button onClick={save} className="mt-4 w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-glow">
              <Save className="size-4" /> సేవ్ చేయండి
            </button>
          </motion.div>
        )}

        {stage === "saving" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl p-6 glass-card flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-primary" /> సేవ్ అవుతోంది...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number" inputMode="decimal" value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-10 px-3 rounded-lg bg-secondary border border-border focus:border-primary outline-none font-semibold"
      />
    </label>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
