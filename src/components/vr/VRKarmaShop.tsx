import { useCallback, useEffect, useState } from "react";
import { X, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { earnKarma, getKarmaBalance, spendKarmaVR, type ActivityKind } from "@/lib/karma";

interface Item { id: string; name: string; category: string; price: number }

const EARN: { kind: ActivityKind; label: string }[] = [
  { kind: "walking", label: "Walk" }, { kind: "running", label: "Run" },
  { kind: "cycling", label: "Cycle" }, { kind: "workout", label: "Workout" },
  { kind: "riding", label: "Ride" },
];

/** Real, account-backed VR wallet: balance, shop and activity earning. */
export default function VRKarmaShop({ onClose }: { onClose: () => void }) {
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => { void getKarmaBalance().then(setBalance); }, []);

  useEffect(() => {
    refresh();
    supabase.from("vr_catalog" as never).select("id,name,category,price").eq("active", true).order("price")
      .then(({ data }) => setItems((data as unknown as Item[]) ?? []));
    window.addEventListener("karma-changed", refresh);
    return () => window.removeEventListener("karma-changed", refresh);
  }, [refresh]);

  const buy = async (it: Item) => {
    setBusy(it.id);
    const r = await spendKarmaVR(it.id);
    setBusy(null);
    if (r.ok) toast.success(`${it.name} unlocked`, { description: `${r.balance} karma left` });
    else toast.error(r.error?.includes("not enough") ? "Not enough karma yet" : "Couldn't complete that");
  };

  const earn = async (kind: ActivityKind, label: string) => {
    setBusy(kind);
    const n = await earnKarma(kind, 10);
    setBusy(null);
    toast[n > 0 ? "success" : "info"](n > 0 ? `+${n} karma for ${label.toLowerCase()}ing` : "Today's limit reached for this activity");
  };

  return (
    <div className="absolute right-3 top-16 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><Coins className="h-4 w-4 text-primary" /> {balance} karma</div>
        <button aria-label="Close wallet" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Earn in the world (10 min session)</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EARN.map((e) => (
          <Button key={e.kind} size="sm" variant="secondary" disabled={busy === e.kind} onClick={() => earn(e.kind, e.label)}>{e.label}</Button>
        ))}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Spend</p>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm">
            <span>{it.name}</span>
            <Button size="sm" disabled={busy === it.id || balance < it.price} onClick={() => buy(it)}>{it.price}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
