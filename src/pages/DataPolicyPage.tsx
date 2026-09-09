import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const UPDATED = 'September 2026';

export default function DataPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <Helmet>
        <title>Data Policy | M'Mora</title>
        <meta
          name="description"
          content="What M'Mora collects, why, who can see it, how long it is kept, and how to export or delete everything."
        />
        <link rel="canonical" href="/data-policy" />
      </Helmet>

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
            Your vault memories, closeness scores, Zoe cards, Zoe conversations, sensor readings and
            direct messages are readable only by you. Posts are visible to the audience you pick.
            Administrators can reach safety logs and moderation reports, and every privileged access
            is written to an append-only ledger.
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
            Content and account data stay until you delete them. Closeness signals fade out of the
            ranking after 90 days. Safety and uptime logs are kept up to 12 months, then pruned.
            Deleted files are removed from storage immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Your controls</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            From <Link className="underline underline-offset-4" to="/privacy">Your data</Link> you can
            download a machine-readable copy of everything tied to your account, or delete the account
            outright. Deletion removes your profile, posts, media, vault, messages, signals and Zoe
            memories, and cannot be undone. You can also correct your profile at any time, and turn
            off any sensor permission from your browser.
          </p>
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
            without undue delay. For any data question, use the in-app report option or reply to your
            invitation email.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          See also the <Link className="underline underline-offset-4" to="/terms">Terms of Service</Link>.
        </footer>
      </article>
    </main>
  );
}
