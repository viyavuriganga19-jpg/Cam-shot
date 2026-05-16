import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OcrSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/jpeg"),
});

const SYSTEM_PROMPT = `You are an expert Telugu wholesale vegetable market bill OCR system.
Extract structured data from the bill image. Bills may be hand-written in Telugu/English with numbers in Indian numerals.

Return ONLY valid JSON in this exact shape (no markdown):
{
  "bill_date": "YYYY-MM-DD or null",
  "shop_name": "string or null",
  "total_amount": number (మొత్తం),
  "jama_amount": number (జమ paid),
  "old_balance": number (పాత బాకీ),
  "new_balance": number (కొత్త బాకీ),
  "items": [{"item_name":"string","quantity":number,"unit":"string","price":number,"amount":number}],
  "notes": "string or empty"
}
If a number is missing default to 0. Compute new_balance = old_balance + total_amount - jama_amount if missing.`;

export const ocrBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => OcrSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract bill data as JSON only." },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit: please try again shortly");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits in Settings");
    if (!res.ok) throw new Error(`OCR failed: ${res.status} ${await res.text()}`);

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { notes: content }; }

    // Normalize numbers
    const num = (v: any) => Number(v) || 0;
    const total = num(parsed.total_amount);
    const jama = num(parsed.jama_amount);
    const oldBal = num(parsed.old_balance);
    const newBal = parsed.new_balance != null ? num(parsed.new_balance) : oldBal + total - jama;

    return {
      bill_date: parsed.bill_date || new Date().toISOString().slice(0, 10),
      shop_name: parsed.shop_name || null,
      total_amount: total,
      jama_amount: jama,
      old_balance: oldBal,
      new_balance: newBal,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      notes: parsed.notes || "",
      raw: parsed,
    };
  });
