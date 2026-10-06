/** Applies the admin's platform-wide Real Map settings (demo bot, shop relic drops) for every member. */
import { useEffect } from 'react';
import { loadRealmapSettings } from './realmapAdminSettings';
import { setDemoExplorer } from './demoExplorerSwitch';
import { dropRelicsAtPlaces, today } from './streetRelics';

export async function applyRealmapSettings() {
  const s = await loadRealmapSettings();
  if (typeof s.demo_bot === 'boolean') setDemoExplorer(s.demo_bot);
  const drops = (s.relic_drops ?? []).filter((d) => d.day === today());
  if (drops.length) dropRelicsAtPlaces(drops);
}

export const AdminRealmapSync: React.FC = () => {
  useEffect(() => {
    void applyRealmapSettings().catch(() => {});
    const t = setInterval(() => void applyRealmapSettings().catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, []);
  return null;
};
export default AdminRealmapSync;
