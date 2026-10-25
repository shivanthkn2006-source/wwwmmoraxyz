import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PublicInfoFooter from '@/components/legal/PublicInfoFooter';

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
      'Open Zoe from her control on supported member pages; availability can depend on the page and your device.',
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
      'DHF and the daily Compass offer personalised cards and reflection; availability depends on your account and settings.',
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
      'Vault memories are intended to be private to your account. Do not assume they are end-to-end encrypted; review the Data Policy before storing sensitive information.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy, your data, and leaving',
    steps: [
      'Go to Privacy to use your account export controls.',
      'The same page offers account deletion; review retention information in the Data Policy.',
      'Read the Data Policy if you want the detail of what is stored and why.',
      'If something looks wrong or broken, use Bug report — it reaches us directly.',
    ],
  },
];

interface FaqItem {
  q: string;
  a: string;
}

// Every answer below is checked against how the platform actually works today.
// Items that depend on a decision only Marc can confirm are marked as such.
const FAQ: FaqItem[] = [
  {
    q: 'Is M\u2019Mora free?',
    a: 'Yes. Creating an account and using the platform costs nothing. There is no paid plan today. (If a paid tier is ever added, this answer should be updated — worth confirming before global launch.)',
  },
  {
    q: 'Who can see my posts?',
    a: 'Post visibility depends on the audience you choose. Direct messages are shared with conversation participants; private memories and Zoe conversations have account access controls. Review the Data Policy before sharing sensitive information.',
  },
  {
    q: 'What does Zoe do with what I tell her?',
    a: 'She uses your conversations to remember context and answer you better. Your questions may be processed by the AI providers listed in the Data Policy. We do not sell your data or build advertising profiles from it.',
  },
  {
    q: 'Why does M\u2019Mora ask for my birth date, place and time?',
    a: 'Only if you use astrology or the daily Compass — those features need real birth details to calculate your chart. You can use the rest of the platform without ever providing them.',
  },
  {
    q: 'Does M\u2019Mora track me?',
    a: 'We keep essential sign-in and security records, and — where your region requires it, only with your consent — first-party measurement of which pages are visited and for how long. You can accept, reject or change this any time from Cookie settings in the Data Policy. There is no third-party advertising tracking.',
  },
  {
    q: 'How do I sign in?',
    a: 'With your email and password, Google, or a passkey or face sign-in you set up. The 5-digit Quick Unlock code only unlocks an existing signed-in session; it does not create an account or replace sign-in. Google sign-in shares only your name, email and profile photo — never your Google password.',
  },
  {
    q: 'Can I download or delete my data?',
    a: 'The Your data page provides export and account-deletion controls. Full export coverage, deletion timing and legally retained records still need confirmation before global launch.',
  },
  {
    q: 'Is M\u2019Mora available in my country?',
    a: 'M'Mora is in early access. Measurement consent adapts to detected region, but this does not establish legal availability in every country. A confirmed country-by-country launch list and eligibility rules are still needed before global launch.',
  },
  {
    q: 'How do I report a problem or a person?',
    a: 'Use Bug report from the site map — it reaches the team directly. Safety and moderation reports go to the administrator, and every privileged access is recorded.',
  },
  {
    q: 'Does M\u2019Mora work on my phone?',
    a: 'Yes. It runs in any modern mobile browser and can be installed to your home screen. Android and iOS shells exist; (confirm the public app-store links before quoting them here.)',
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
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1 text-xs hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
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

        <section id="faq" className="space-y-4 scroll-mt-6 border-t border-border pt-8">
          <h2 className="text-lg font-medium">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          Still stuck? Ask Zoe — she can open any of these pages for you.
        </footer>
        <PublicInfoFooter />
      </div>
    </main>
  );
}
