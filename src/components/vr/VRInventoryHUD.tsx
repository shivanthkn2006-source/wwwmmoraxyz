import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Owned = { item_id: string; name: string; category: string; count: number };

const ICON: Record<string, string> = {
  food: "🍗", drink: "☕", transport: "🚆", fuel: "⛽", vehicle: "🚗", entertainment: "🎢",
  adventure: "🏔️", recharge: "📱", fitness: "🚴",
};
const iconFor = (id: string, cat: string) =>
  id.includes("kfc") ? "🍗" : id.includes("mcd") ? "🍔" : id.includes("coffee") ? "☕" : id.includes("bus") ? "🚌"
  : id.includes("metro") ? "🚇" : id.includes("train") ? "🚂" : id.includes("fuel") ? "⛽" : id.includes("motor") ? "🏍️"
  : id.includes("car") ? "🚗" : id.includes("f1") ? "🏎️" : id.includes("zoo") ? "🦁" : id.includes("theme") ? "🎢"
  : id.includes("cycl") ? "🚴" : id.includes("climb") || id.includes("everest") ? "🏔️" : id.includes("recharge") ? "📱"
  : ICON[cat?.toLowerCase()] ?? "🎁";

/** In-world inventory: every VR purchase shows as an owned item; new buys pop in like a game pickup. */
export default function VRInventoryHUD() {
  const [items, setItems] = useState<Owned[]>([]);
  const [pickup, setPickup] = useState<{ name: string; icon: string } | null>(null);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: buys }, { data: cat }] = await Promise.all([
      supabase.from("vr_purchases" as never).select("item_id").eq("user_id", u.user.id).limit(500),
      supabase.from("vr_catalog" as never).select("id,name,category"),
    ]);
    const meta = new Map(((cat as unknown as { id: string; name: string; category: string }[]) ?? []).map((c) => [c.id, c]));
    const counts = new Map<string, number>();
    for (const b of (buys as unknown as { item_id: string }[]) ?? []) counts.set(b.item_id, (counts.get(b.item_id) ?? 0) + 1);
    setItems([...counts].map(([id, count]) => ({ item_id: id, count, name: meta.get(id)?.name ?? id, category: meta.get(id)?.category ?? "" })));
  }, []);

  useEffect(() => {
    void load();
    const onBuy = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; name: string; category: string }>).detail;
      setPickup({ name: d.name, icon: iconFor(d.id, d.category) });
      window.setTimeout(() => setPickup(null), 2600);
      void load();
    };
    window.addEventListener("vr-item-purchased", onBuy);
    return () => window.removeEventListener("vr-item-purchased", onBuy);
  }, [load]);

  return (
    <>
      <AnimatePresence>
        {pickup && (
          <motion.div
            key={pickup.name}
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, x: -200, y: 260 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="pointer-events-none fixed left-1/2 top-1/3 z-[60] -translate-x-1/2 rounded-3xl surface-warm-tan px-8 py-6 text-center shadow-2xl"
          >
            <div className="text-6xl">{pickup.icon}</div>
            <div className="mt-2 text-lg font-semibold">{pickup.name}</div>
            <div className="text-xs text-muted-foreground">Added to your items</div>
          </motion.div>
        )}
      </AnimatePresence>
      {items.length > 0 && (
        <div className="fixed bottom-4 left-3 z-40 flex max-w-[60vw] gap-1.5 overflow-x-auto rounded-2xl surface-warm-tan px-2 py-1.5 shadow-lg" aria-label="Your VR items">
          {items.map((it) => (
            <div key={it.item_id} title={it.name} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/20 text-2xl">
              {iconFor(it.item_id, it.category)}
              {it.count > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-foreground px-1 text-[10px] text-background">{it.count}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
