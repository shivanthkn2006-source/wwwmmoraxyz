import PageSeo from '@/components/seo/PageSeo';
import PublicInfoFooter from '@/components/legal/PublicInfoFooter';

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <PageSeo title="About M'Mora — Zoe, DHF and Community" description="Explore M'Mora's social posts, Zoe assistant, DHF Compass, growth, private memories and virtual worlds; read help, terms and privacy information." path="/about" />
      <article className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold">About M'Mora</h1>
          <p className="text-sm text-muted-foreground">Community, creativity and personal reflection with Zoe.</p>
        </header>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">People and creativity</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Home brings together posts, photos, loops, growth and DHF cards. Chat and Huddle connect members; music, camera and virtual worlds offer other ways to create and explore.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Zoe and your DHF Compass</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Zoe supports conversation, voice, search and image creation. DHF and Compass offer personalised reflection; astrology uses birth details you provide. AI answers and astrology are not guaranteed predictions or professional health, financial or legal advice.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Your choices</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Profile and Security contain account controls. Privacy contains export and deletion tools. The Data Policy explains data use and measurement choices. Feature availability may depend on your account, device and connected services.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Early access and country availability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">M'Mora is in early access. A confirmed country launch list, legal operator details and a public support contact are still being prepared. This page is not a claim of worldwide regulatory approval or certification.</p>
        </section>
        <PublicInfoFooter />
      </article>
    </main>
  );
}
