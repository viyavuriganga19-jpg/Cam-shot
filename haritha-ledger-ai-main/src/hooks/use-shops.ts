import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Shop = { id: string; code: string; name: string; name_te: string | null };

export function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  useEffect(() => {
    supabase.from("shops").select("*").order("code").then(({ data }) => {
      if (data) setShops(data as Shop[]);
    });
  }, []);
  return shops;
}
