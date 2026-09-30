import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { earnKarma } from "@/lib/karma";

/**
 * Turns real time spent and features used into karma.
 * Counts only visible, recently-interacted minutes; sends in 5-minute batches.
 */
export default function KarmaTimeTracker() {
  const location = useLocation();
  const lastInput = useRef(Date.now());
  const minutes = useRef(0);
  const seenFeatures = useRef(new Set<string>());

  useEffect(() => {
    const mark = () => { lastInput.current = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const iv = setInterval(() => {
      const active = document.visibilityState === "visible" && Date.now() - lastInput.current < 120_000;
      if (active) minutes.current += 1;
      if (minutes.current >= 5) {
        const n = minutes.current;
        minutes.current = 0;
        void earnKarma("time_spent", n);
      }
    }, 60_000);
    return () => { clearInterval(iv); evs.forEach((e) => window.removeEventListener(e, mark)); };
  }, []);

  useEffect(() => {
    const feature = location.pathname.split("/")[1] || "home";
    if (seenFeatures.current.has(feature)) return;
    seenFeatures.current.add(feature);
    if (seenFeatures.current.size > 1) void earnKarma("feature_use", 1);
  }, [location.pathname]);

  return null;
}
