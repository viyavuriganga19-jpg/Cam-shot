// shared helpers
export const STATUS_COLOR: Record<string, string> = {
  paid: "bg-success text-success-foreground",
  pending: "bg-destructive text-destructive-foreground",
  partial: "bg-warning text-warning-foreground",
};

export const STATUS_LABEL_TE: Record<string, string> = {
  paid: "🟢 జమ వచ్చింది",
  pending: "🔴 జమ రాలేదు",
  partial: "🟡 Partial Payment",
};

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function computeStatus(total: number, jama: number): "paid" | "pending" | "partial" {
  if (jama <= 0) return "pending";
  if (jama >= total) return "paid";
  return "partial";
}

export const DAYS_TE = ["ఆది", "సోమ", "మంగ", "బుధ", "గురు", "శుక్ర", "శని"];
export const MONTHS_TE = [
  "జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్",
  "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్",
];
