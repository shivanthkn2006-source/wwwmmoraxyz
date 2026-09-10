import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

interface Guide {
  id: string;
  title: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    id: 'first-day',
    title: 'Your first day',
    steps: [
      'Create your account and confirm the email we send you.',
      'Add a photo and a couple of lines about yourself on your profile.',
      'Open Home. That is the feed — posts from people you follow, newest first.',
      'Tap the round Zoe button in the corner and say hello. She answers in text or out loud.',
      'Find a friend on the Huddle page and follow them.',
    ],
  },
  {
    id: 'zoe',
    title: 'How Zoe helps',
    steps: [
      'Zoe is on every page. Tap her once to talk, tap twice to hide her.',
      'Ask anything: about the world, about the news, the weather, or about this platform.',
      'She can search inside M\u2019Mora, out on the web, or both — just say which you want.',
      'She can make pictures for you. Ask for one in plain words.',
      'The more you use the platform, the better she understands what you actually need.',
    ],
  },
  {
    id: 'posting',
    title: 'Posting, photos and loops',
    steps: [
      'Use the camera to take a photo or record a short loop.',
      'Write a line with it and post — it goes to Home for the people who follow you.',
      'Mosaic is a calmer grid of the same posts, ordered by who you are closest to.',
      'Selfie City pins your photos to the places they were taken.',
    ],
  },
  {
    id: 'unlocks',
    title: 'Things that open up later',
    steps: [
      'Some pages need to know you before they are useful, so they unlock after real use.',
      'Your DHF — the picture Zoe builds of your habits and rhythm.',
      'Astrology and the daily Compass, which use your birth details.',
      'Growth insights: small lessons chosen from what you actually do.',
      'The Digital Vault, for memories you want kept for a long time.',
    ],
  },
  {
    id: 'vault',
    title: 'Your Digital Vault',
    steps: [
      'Open Legacy from the site map.',
      'Press the dictate button and just talk — your words are saved as a memory.',
      'Everything in the vault is yours alone. Nobody else can read it.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy, your data, and leaving',
    steps: [
      'Go to Privacy to download a copy of everything we hold about you.',
      'The same page deletes your account and your data permanently.',
      'Read the Data Policy if you want the detail of what is stored and why.',
      'If something looks wrong or broken, use Bug report — it reaches us directly.',
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <Helmet>
        <title>Help and guides | M'Mora</title>
        <meta
          name="description"
          content="Short plain-language guides to M'Mora: your first day, how Zoe helps, posting, your vault, and your privacy."
        />
        <link rel="canonical" href="/help" />
      </Helmet>

      <div className="mx-auto w-full max-w-2xl space-y-10">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Help</h1>
          <p className="text-sm text-muted-foreground">
            Six short guides. Nothing technical. Start at the top if you have just joined.
          </p>
          <Link to="/map" className="inline-block text-sm underline underline-offset-4">
            See every page in M'Mora
          </Link>
        </header>

        <nav aria-label="Guides" className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
            >
              {g.title}
            </a>
          ))}
        </nav>

        {GUIDES.map((guide) => (
          <section key={guide.id} id={guide.id} className="space-y-3 scroll-mt-6">
            <h2 className="text-lg font-medium">{guide.title}</h2>
            <ol className="list-decimal space-y-2 pl-5">
              {guide.steps.map((step) => (
                <li key={step} className="text-sm leading-relaxed text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          Still stuck? Ask Zoe — she can open any of these pages for you.
        </footer>
      </div>
    </main>
  );
}
