import { Link } from 'react-router-dom';
import PageSeo from '@/components/seo/PageSeo';
import { ROUTE_SEO } from '@/config/routeSeo';
import { Button } from '@/components/ui/button';
import PublicInfoFooter from '@/components/legal/PublicInfoFooter';

const UPDATED = '25 October 2026';

export default function DataPolicyPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground px-5 py-10">
      <PageSeo title={ROUTE_SEO['/data-policy'].title} description={ROUTE_SEO['/data-policy'].description} path="/data-policy" />

      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Data Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">What we hold</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li><strong className="font-medium text-foreground">Account</strong> — email, profile name and photo, birth date if you give one, and the invitation code you used.</li>
            <li><strong className="font-medium text-foreground">Content</strong> — posts, photos, videos, comments, messages and Digital Vault memories.</li>
            <li><strong className="font-medium text-foreground">Closeness signals</strong> — which posts you view, linger on, skip, like, save, comment on or reply to. These build your private closeness graph and nothing else.</li>
            <li><strong className="font-medium text-foreground">Zoe conversations</strong> — what you ask her and what she answers, so she remembers context.</li>
            <li><strong className="font-medium text-foreground">Device signals you switch on</strong> — motion, battery, heart rate from a paired strap, location. Nothing is read without a browser permission, and we never invent a reading; unavailable values show as "—".</li>
            <li><strong className="font-medium text-foreground">Safety and reliability logs</strong> — sign-in attempts, blocked uploads, rate-limit hits, error and uptime records.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Why we hold it</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To run your account, show your feed in the order that reflects your real relationships,
            let Zoe answer you usefully, keep the service safe from abuse, and meet legal
            obligations. We do not sell your data, and we do not use it to build advertising profiles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Who can see it</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every table is protected by row-level rules enforced by the database, not by the app.
            Private account records have access controls; direct messages are shared with their
            conversation participants, and posts depend on their chosen audience. Service operators
            and connected processors may handle records to run the service and address safety issues.
            This is not a claim that all data is end-to-end encrypted or inaccessible to operators.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Services that process data for us</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Cloud database, authentication, storage and CDN hosting.</li>
            <li>AI model providers, for Zoe's replies, images and understanding of your questions.</li>
            <li>Deepgram, for Zoe's voice and for speech you dictate.</li>
            <li>News and web search sources, when you ask something Zoe must look up. Your identity is not sent with those lookups.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">How long we keep it</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Content and account data are stored to provide the service. The final retention schedule,
            backup expiry, deletion completion times and legally required exceptions need confirmation
            before global launch; immediate erasure of every backup is not promised.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Your controls</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            From <Link className="underline underline-offset-4" to="/privacy">Your data</Link> you can
            request an export or account deletion. Full export/deletion coverage and retained security
            records still require verification. You can correct your profile and revoke device permissions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Cookies and measurement consent</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            M'Mora sets no advertising or third-party tracking cookies. Sign-in and security
            records are essential and always kept. Separately, we run first-party visit
            measurement — which pages are visited, time spent, and device type — processed only
            by our own cloud backend, never sold and never used for advertising profiles.
            In regions whose laws require prior consent, this measurement stays off until you
            accept; everywhere else it runs unless you turn it off. Your choice is stored on
            your device with the date and the region it was made in, applies immediately, and
            can be changed at any time.
          </p>
          <Button
            variant="outline"
            type="button"
            onClick={() => import('@/lib/consent').then((m) => m.openConsentSettings())}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cookie settings
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">DHF, birth details and connected experiences</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">DHF, Compass and astrology may use the birth date, place and time you provide, along with chosen interests and settings. These are reflection tools, not reliable life or health predictions. Voice, photos, calls, music, maps and virtual worlds may contact external services when used; measurement consent is not permission for sensitive advertising profiling.</p>
          <p className="text-sm leading-relaxed text-muted-foreground">Before global launch, the final processor list, processing countries, transfer safeguards, biometric consent and retention rules need confirmation. No certified global-compliance status is claimed.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Children</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            M'Mora is not for people under 16. If we learn an account belongs to a child, we delete it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Breach and contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If member data is ever exposed, affected members are notified inside the app and by email
            without undue delay. For data questions, members can use the in-app report option. A public privacy contact
            and legal operator address still need confirmation for people who cannot sign in.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          See also the <Link className="underline underline-offset-4" to="/terms">Terms of Service</Link>.
        </footer>
        <PublicInfoFooter />
      </article>
    </main>
  );
}
