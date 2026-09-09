import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const UPDATED = 'September 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <Helmet>
        <title>Terms of Service | M'Mora</title>
        <meta
          name="description"
          content="The rules for using M'Mora: membership, invitations, your content, Zoe, acceptable use, and how accounts end."
        />
        <link rel="canonical" href="/terms" />
      </Helmet>

      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">1. Who can join</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            M'Mora is invitation-based during early access. You need a valid invitation code and an
            email address you control. You must be at least 16 years old. Invitation codes are
            single-use, issued only by the M'Mora team, and are redeemed and retired on our servers —
            members cannot create, edit or reuse them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">2. Your account</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are responsible for what happens under your login. Keep your password and device
            secure, and tell us straight away if you think someone else has access. We may suspend an
            account that is being used to attack the service, impersonate someone, or harm other
            members.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">3. Your content stays yours</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You keep ownership of everything you post, record, dictate or store in your Digital
            Vault. You grant M'Mora only the permission we need to host it, show it to the people you
            chose, generate covers and smaller video versions for smooth playback, and back it up. That
            permission ends when you delete the content or your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">4. Zoe</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zoe is an assistant. She can search inside M'Mora, search the open web, read the signals
            you have allowed, and write cards for your feed. Her answers can be wrong or incomplete
            and are not medical, legal, financial or astrological advice you should rely on alone.
            Zoe never speaks on your behalf to other members without your action.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">5. What you may not do</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Post sexual content involving minors, or any content that exploits or endangers a child.</li>
            <li>Post threats, harassment, hate, or content that encourages self-harm or violence.</li>
            <li>Upload material you have no right to share, or someone else's private data.</li>
            <li>Impersonate another person, or use someone else's face or identity photos.</li>
            <li>Scrape, resell, overload or reverse-engineer the service, or bypass its security.</li>
            <li>Automate mass accounts, spam invitations, or manipulate the feed.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Uploads are screened before they become visible. Content that clearly breaks these rules
            is refused, deleted from storage, and logged for review.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">6. Early access</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            M'Mora is in early access. Features change, some are experimental, and short outages
            happen. We monitor uptime continuously, but we do not offer a service-level guarantee
            during this period, and the service is provided "as is" to the extent the law allows.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">7. Ending your membership</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can export or permanently delete your account and everything in it at any time from{' '}
            <Link className="underline underline-offset-4" to="/privacy">Your data</Link>. Deletion is
            immediate and cannot be reversed. We may end an account that repeatedly breaks these
            terms, and will tell you why unless the law prevents it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">8. Changes and contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If we change these terms in a way that matters, you will see a notice inside the app
            before the change takes effect. For anything about these terms, use the in-app report
            option or reply to your invitation email.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          See also the{' '}
          <Link className="underline underline-offset-4" to="/data-policy">Data Policy</Link>.
        </footer>
      </article>
    </main>
  );
}
