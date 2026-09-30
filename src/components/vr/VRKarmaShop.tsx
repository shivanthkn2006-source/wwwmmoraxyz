import { useCallback, useEffect, useState } from "react";
import { X, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getKarmaBalance, spendKarmaVR, type ActivityKind } from "@/lib/karma";
import { useTrackedActivity } from "@/hooks/useTrackedActivity";

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
    if (r.ok) window.dispatchEvent(new CustomEvent("vr-item-purchased", { detail: { id: it.id, name: it.name, category: it.category } }));
    if (r.ok) toast.success(`${it.name} unlocked`, { description: `${r.balance} karma left` });
    else toast.error(r.error?.includes("not enough") ? "Not enough karma yet" : "Couldn't complete that");
  };

  const tracker = useTrackedActivity();
  const earn = async (kind: ActivityKind, label: string) => {
    if (tracker.active) {
      const r = await tracker.stop();
      if (!r) return;
      const km = (r.distanceM / 1000).toFixed(2);
      const pace = r.paceMinPerKm ? ` · ${r.paceMinPerKm} min/km` : "";
      const summary = kind === "workout" ? `${Math.round(r.minutes)} min` : `${km} km · ${r.steps} steps${pace}`;
      toast[r.karma > 0 ? "success" : "info"](r.karma > 0 ? `+${r.karma} karma earned` : "Saved — not enough real movement for karma yet", { description: `${summary} · saved to your activity` });
      return;
    }
    const err = await tracker.start(kind);
    if (err) toast.error(err); else toast.info(`${label} started`, { description: "Move for real — tap again to finish and collect karma" });
  };

  return (
    <div className="absolute right-3 top-16 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl surface-warm-tan p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><Coins className="h-4 w-4 text-primary" /> {balance} karma</div>
        <button aria-label="Close wallet" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        {tracker.active
          ? tracker.active === "workout" ? `Workout: ${tracker.progress} active min` : `${Math.round(tracker.progress)} m · ${tracker.steps} steps`
          : "Earn by really moving (asks for location and motion to count steps)"}
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EARN.map((e) => (
          <Button key={e.kind} size="sm" variant={tracker.active === e.kind ? "default" : "secondary"} disabled={!!tracker.active && tracker.active !== e.kind} onClick={() => earn(e.kind, e.label)}>{tracker.active === e.kind ? "Finish" : e.label}</Button>
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
