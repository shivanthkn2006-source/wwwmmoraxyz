import PageSeo from '@/components/seo/PageSeo';
import PublicInfoFooter from '@/components/legal/PublicInfoFooter';
import { SAFETY_EMAIL } from '@/config/contacts';

export default function ReportAbusePage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <PageSeo title="Report abuse — M'Mora" description="How to report harmful content on M'Mora, with or without an account." path="/report-abuse" />
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Report abuse</h1>
          <p className="text-sm text-muted-foreground">Anyone can report harmful content, even without an account.</p>
        </header>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">If you have an account</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Open the post's menu and choose Report. Pick the reason that fits best and add any detail that helps.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">If you don't have an account</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Email us at <a className="underline underline-offset-4" href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">What to include</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>A link to the content.</li>
            <li>What is wrong with it.</li>
            <li>Your contact details, so we can reply.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">How quickly we respond</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Intimate images shared without consent and child-safety reports: within 24 hours.</li>
            <li>All other reports: within 48 hours.</li>
          </ul>
        </section>
      </div>
      <PublicInfoFooter />
    </main>
  );
}
