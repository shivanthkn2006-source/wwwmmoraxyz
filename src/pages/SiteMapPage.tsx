import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { siteMapByArea, type AccessTier } from '@/config/siteMap';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const TIER_LABEL: Record<AccessTier, string> = {
  public: 'open',
  earned: 'unlocks with use',
  admin: 'staff',
};

const AREA_BLURB: Record<string, string> = {
  Start: 'Joining, signing in, and understanding the place.',
  Daily: 'What you open every day.',
  Create: 'Making something.',
  Connect: 'People.',
  Zoe: 'Your assistant and everything she runs on.',
  Growth: 'Things that help you understand yourself.',
  Vault: 'What you keep, and what we hold about you.',
  Settings: 'Controls and preferences.',
  Admin: 'Staff only.',
  Internal: 'Engineering and diagnostics.',
};

export default function SiteMapPage() {
  const isAdmin = useIsAdmin();
  const groups = siteMapByArea(isAdmin === true);

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <Helmet>
        <title>Site map | M'Mora</title>
        <meta
          name="description"
          content="Every page in M'Mora, grouped into areas with a plain-language explanation of what each one is for."
        />
        <link rel="canonical" href="/map" />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl space-y-10">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Site map</h1>
          <p className="text-sm text-muted-foreground">
            Everything M'Mora can do, grouped by what you would be trying to do. Pages marked
            "unlocks with use" open up once you have been here a while — they need to know you first.
          </p>
          <Link to="/help" className="inline-block text-sm underline underline-offset-4">
            New here? Read the short guides
          </Link>
        </header>

        {groups.map(({ area, entries }) => (
          <section key={area} className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">{area}</h2>
              <p className="text-xs text-muted-foreground">{AREA_BLURB[area]}</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.path}>
                  <Link
                    to={entry.path}
                    className="block h-full rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{entry.label}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {TIER_LABEL[entry.tier]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.purpose}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
