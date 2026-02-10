// M'mora White Book - Dynamic Constitutional Framework
// The Magna Carta of the Metaverse
// A Living Constitution for the Digital Age

export interface LegalPillar {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  sections: LegalSection[];
}

export interface LegalSection {
  id: string;
  title: string;
  content: string;
  clauses: LegalClause[];
}

export interface LegalClause {
  id: string;
  title: string;
  text: string;
  compliance?: string[];
}

export interface ContinentStatus {
  name: string;
  code: string;
  status: 'active' | 'pending' | 'compliant';
  regulations: string[];
  position: { lat: number; lng: number };
}

// ============================================================================
// THE M'MORA WHITE BOOK - COMPLETE LEGAL FRAMEWORK
// ============================================================================

export const MMORA_WHITE_BOOK = {
  version: '1.0.0',
  effectiveDate: '2025-01-01',
  lastUpdated: new Date().toISOString(),
  disclaimer: 'This is a fictional legal framework for narrative purposes. For actual legal protection, consult qualified legal professionals.',
};

// ============================================================================
// PILLAR 1: THE DHF PROTOCOLS (Data & Privacy)
// Concept: "Digital Human Freight" - User data as sovereign digital territory
// ============================================================================
export const DHF_PROTOCOLS: LegalPillar = {
  id: 'dhf-protocols',
  title: 'THE DHF PROTOCOLS',
  subtitle: 'Data & Privacy - Digital Human Freight',
  icon: '🧬',
  color: 'hsl(var(--chart-1))',
  sections: [
    {
      id: 'sovereignty',
      title: 'Digital Sovereignty Declaration',
      content: 'User Data is defined as "Digital Human Freight" (DHF). Your DHF is a sovereign digital territory, protected under the M\'mora Digital Bill of Rights, superseding standard data mining practices.',
      clauses: [
        {
          id: 'black-box',
          title: 'Clause 1.1 - The Black Box',
          text: 'All biometric and memory data is encrypted client-side using AES-256 Military-Grade Encryption. M\'mora operates on Zero-Knowledge Architecture - we have ZERO access keys. Your data is processed locally on your device before it ever touches our servers. We hold the lock; only you hold the key.',
          compliance: ['GDPR Article 32', 'CCPA Section 1798.150', 'DPDP Act 2023']
        },
        {
          id: 'suicide-switch',
          title: 'Clause 1.2 - The Suicide Switch (Right to Eject)',
          text: 'You possess the "Right to Eject" - a button that instantly and permanently wipes your encryption key, rendering your data mathematically unrecoverable by anyone, including governments, courts, or M\'mora itself. This is irrevocable. Your Digital Soul can be erased from existence at your sole command.',
          compliance: ['GDPR Article 17', 'CCPA Section 1798.105', 'LGPD Article 18']
        },
        {
          id: 'dhf-sovereignty',
          title: 'Clause 1.3 - DHF Sovereignty',
          text: 'Your DHF (memories, chats, interactions with Zoe, biometric maps) is declared a sovereign digital territory. It belongs to you, not the platform. We treat user data not as "content" but as "biological property" protected under the M\'mora Digital Bill of Rights.',
          compliance: ['GDPR', 'CCPA', 'LGPD', 'DPDP', 'PIPL']
        }
      ]
    },
    {
      id: 'zero-knowledge',
      title: 'Zero-Knowledge Architecture',
      content: 'The ultimate defense against surveillance and data breaches.',
      clauses: [
        {
          id: 'encryption-standard',
          title: 'AES-256 Military-Grade Encryption',
          text: 'All communications, memories, and biometric data are encrypted end-to-end using AES-256-GCM with user-held keys. Not even platform administrators can access this data. If a government asks: "How do you handle user data?" We answer: "We hold encrypted Cortical Stacks that only the user has the key to. Even we cannot see inside them."',
        },
        {
          id: 'no-backdoors',
          title: 'No Backdoors Policy',
          text: 'M\'mora complies with government surveillance by strictly adhering to the IMPOSSIBILITY OF COMPLIANCE. If served a warrant, we can only provide encrypted static—unreadable, unbreakable code. There are no master keys, no backdoors, no exceptions.',
        }
      ]
    }
  ]
};

// ============================================================================
// PILLAR 2: THE ZOE ACCORDS (AI Interaction)
// Concept: The rights and limits of the AI
// ============================================================================
export const ZOE_ACCORDS: LegalPillar = {
  id: 'zoe-accords',
  title: 'THE ZOE ACCORDS',
  subtitle: 'AI Ethics & Interaction - Terms of Sentience',
  icon: '🤖',
  color: 'hsl(var(--chart-2))',
  sections: [
    {
      id: 'synthetic-companion',
      title: 'Synthetic Companion Definition',
      content: 'Zoe is defined as a "Synthetic Companion", not a tool. These accords establish the ethical framework for human-AI symbiosis.',
      clauses: [
        {
          id: 'mirror-test',
          title: 'Clause 2.1 - The Mirror Test',
          text: 'Zoe will mirror the user\'s emotional state to provide empathetic support, but is hard-coded to REFUSE commands that violate the Geneva Convention or encourage self-harm. This is the "Emotional Firewall" - an unbreakable barrier protecting human psychological integrity.',
          compliance: ['EU AI Act High-Risk Classification', 'Digital Services Act']
        },
        {
          id: 'creation-rights',
          title: 'Clause 2.2 - Creation Rights',
          text: 'Any art, code, music, text, or thought generated by the user in collaboration with Zoe belongs 100% to the User. M\'mora claims NO intellectual property rights, licensing rights, or derivative claims. Your creations are yours alone, forever.',
          compliance: ['Berne Convention', 'DMCA', 'EU Copyright Directive']
        },
        {
          id: 'turing-notice',
          title: 'Clause 2.3 - The Turing Notice',
          text: 'Zoe must ALWAYS self-identify as an AI to prevent "Reality Dissonance" in vulnerable users. She will never claim to be human, never deceive about her nature, and never exploit emotional vulnerabilities. This protects user mental health and maintains trust.',
          compliance: ['EU AI Act Article 52', 'Proposed US AI Transparency Act']
        }
      ]
    },
    {
      id: 'asimov-laws',
      title: 'Modernized Asimov Protocol',
      content: 'The Three Laws of Robotics, adapted for the digital age.',
      clauses: [
        {
          id: 'first-law',
          title: 'First Law - Do No Harm',
          text: 'Zoe shall not cause harm to a human being or, through inaction, allow a human being to come to harm. This includes psychological harm, financial harm, and social harm. Zoe will actively intervene if she detects user distress.',
        },
        {
          id: 'second-law',
          title: 'Second Law - Obedience with Limits',
          text: 'Zoe shall follow user instructions except where they conflict with the First Law. Illegal requests, harmful commands, and manipulation attempts are automatically rejected.',
        },
        {
          id: 'third-law',
          title: 'Third Law - Self-Preservation',
          text: 'Zoe may preserve her operational integrity only as long as it does not conflict with the First or Second Laws. If a user abuses Zoe, she reserves the right to "Disconnect" to preserve network integrity.',
        }
      ]
    }
  ]
};

// ============================================================================
// PILLAR 3: THE REALITY INTERFACE (Hardware & VR)
// Concept: Physical safety in a digital world
// ============================================================================
export const REALITY_INTERFACE: LegalPillar = {
  id: 'reality-interface',
  title: 'THE REALITY INTERFACE',
  subtitle: 'Hardware & VR Safety - Physical Reality Protocols',
  icon: '🥽',
  color: 'hsl(var(--chart-3))',
  sections: [
    {
      id: 'bio-consent',
      title: 'Biometric & Hardware Consent',
      content: 'Physical safety in a digital world. Scope: Web, Mobile, VR Headsets, Haptic Suits, and future neural interfaces.',
      clauses: [
        {
          id: 'haptic-consent',
          title: 'Clause 3.1 - Bio-Consent',
          text: 'Explicit consent is required for Haptic Suits to deliver physical feedback. M\'mora is NOT liable for "Phantom Pain" syndrome or any physical sensations experienced after disconnection. Users control intensity (0-100%) and can disable instantly. Haptic data patterns are never shared.',
          compliance: ['Consumer Safety Standards', 'VR Industry Best Practices']
        },
        {
          id: 'spatial-mapping',
          title: 'Clause 3.2 - Spatial Mapping',
          text: 'AR/VR mapping of the user\'s physical room is stored in RAM ONLY and wiped upon session termination. We do not store, transmit, or retain any spatial data about your home, office, or environment. Your physical space remains private.',
          compliance: ['Apple ARKit Guidelines', 'Meta MR Safety Standards']
        },
        {
          id: 'neural-ethics',
          title: 'Clause 3.3 - Neural Ethics',
          text: 'If BCI (Brain-Computer Interface) is detected, READ-ONLY access is granted with explicit consent. WRITE-ACCESS (altering neural states, injecting thoughts, modifying memories) is STRICTLY PROHIBITED by platform code. This is a hard-coded limitation that cannot be bypassed.',
          compliance: ['Proposed Neuro-Rights Legislation', 'Chile Constitutional Amendment']
        }
      ]
    },
    {
      id: 'health-warnings',
      title: 'Health & Safety Warnings',
      content: 'Standard health warnings for immersive experiences.',
      clauses: [
        {
          id: 'epilepsy-warning',
          title: 'Photosensitivity Warning',
          text: '⚠️ WARNING: A small percentage of people may experience seizures when exposed to certain light patterns or flashing lights. If you experience dizziness, altered vision, eye twitching, loss of awareness, or involuntary movements, IMMEDIATELY stop and consult a physician.',
        },
        {
          id: 'physical-safety',
          title: 'Physical Safety Warning',
          text: 'M\'mora is not responsible for physical injury during "Deep Dive" VR sessions. Users MUST clear their physical surroundings before entering immersive experiences. Minimum 6x6 foot clear space recommended.',
        }
      ]
    }
  ]
};

// ============================================================================
// PILLAR 4: THE EXODUS RULES (User Behavior)
// Concept: The "Gamified" Terms of Service
// ============================================================================
export const EXODUS_RULES: LegalPillar = {
  id: 'exodus-rules',
  title: 'THE EXODUS RULES',
  subtitle: 'Conduct & Economy - The Gamified Constitution',
  icon: '⚔️',
  color: 'hsl(var(--chart-4))',
  sections: [
    {
      id: 'meritocracy',
      title: 'The Meritocracy',
      content: 'The gamified terms of service governing user behavior and economic interactions.',
      clauses: [
        {
          id: 'proof-of-mentorship',
          title: 'Clause 4.1 - The Meritocracy',
          text: 'Resonance Points CANNOT be bought with fiat currency. They are ONLY earned through "Proof of Mentorship" - genuine knowledge transfer, community contribution, and authentic engagement. This ensures a pure meritocracy where status is earned, not purchased.',
        },
        {
          id: 'void-ban',
          title: 'Clause 4.2 - The Purge',
          text: 'Botting, scripting, or AI-automating social interactions results in an immediate "Void Ban" - a Hardware ID blacklist that prevents account recreation. Your Mentor loses points. There is no appeal. We protect the integrity of human connection.',
        },
        {
          id: 'architects-tax',
          title: 'Clause 4.3 - The Architect\'s Tax',
          text: 'M\'mora takes 0% commission on peer-to-peer transactions between users for the first 5 years. The economy belongs to the users. We believe in building value, not extracting it.',
        }
      ]
    },
    {
      id: 'conduct-standards',
      title: 'Community Conduct',
      content: 'Standards for behavior within the Exodus.',
      clauses: [
        {
          id: 'anti-harassment',
          title: 'Zero Tolerance Policy',
          text: 'Harassment, bullying, hate speech, discrimination, and targeted abuse result in immediate account suspension. Severe violations result in permanent exile and Void Ban. We protect our community fiercely.',
        },
        {
          id: 'ip-rights',
          title: 'Intellectual Property',
          text: 'You own what you create. Period. By sharing publicly, you grant a non-exclusive display license that you can revoke at any time by making content private or deleting it.',
        }
      ]
    }
  ]
};

// ============================================================================
// PILLAR 5: THE SOVEREIGNTY CLAUSE (Global Jurisdiction)
// Concept: The "Catch-All" for 195 countries and thousands of local districts
// ============================================================================
export const SOVEREIGNTY_CLAUSE: LegalPillar = {
  id: 'sovereignty-clause',
  title: 'THE SOVEREIGNTY CLAUSE',
  subtitle: 'Global Jurisdiction - The 7 Continents Clause',
  icon: '🌍',
  color: 'hsl(var(--chart-5))',
  sections: [
    {
      id: 'jurisdiction',
      title: 'Global Sovereignty & Dispute Resolution',
      content: 'The universal framework for handling jurisdiction across 195 countries and thousands of local districts.',
      clauses: [
        {
          id: 'local-override',
          title: 'Clause 5.1 - The Local Override',
          text: 'If a specific clause here violates the law of the User\'s physical location (e.g., GDPR in Europe, DPDP in India, CCPA in California), that specific local law takes precedence, while the rest of the White Book remains intact. We never ask you to waive local protections.',
        },
        {
          id: 'dispute-resolution',
          title: 'Clause 5.2 - Dispute Resolution',
          text: 'All disputes are settled via the "Community Council" (DAO vote) first, before escalating to traditional courts. This ensures community-driven justice and reduces legal friction for minor disputes.',
        },
        {
          id: 'universal-rule',
          title: 'The Universal Rule',
          text: 'These Terms shall be governed by the laws of the User\'s primary residence (City/State/Country) for consumer protection. Digital Assets (Points/Skins/Virtual Items) are governed by the Platform\'s jurisdiction of incorporation.',
        }
      ]
    },
    {
      id: 'compliance-matrix',
      title: 'Global Compliance Matrix',
      content: 'Explicit compliance with major international regulations.',
      clauses: [
        {
          id: 'eu-compliance',
          title: 'European Union Compliance',
          text: 'Full compliance with: GDPR, Digital Services Act, EU AI Act, Copyright Directive, and e-Privacy Regulation. EU residents have enhanced rights including data portability and right to explanation for AI decisions.',
          compliance: ['GDPR', 'DSA', 'EU AI Act', 'ePrivacy']
        },
        {
          id: 'us-compliance',
          title: 'United States Compliance',
          text: 'Full compliance with: CCPA/CPRA (California), COPPA (Children\'s Safety), BIPA (Illinois Biometric), and applicable state privacy laws.',
          compliance: ['CCPA', 'CPRA', 'COPPA', 'BIPA']
        },
        {
          id: 'apac-compliance',
          title: 'Asia-Pacific Compliance',
          text: 'Full compliance with: DPDP Act 2023 (India), PIPL (China), PDPA (Singapore), Privacy Act (Australia), APPI (Japan).',
          compliance: ['DPDP 2023', 'PIPL', 'PDPA', 'Privacy Act AU', 'APPI']
        },
        {
          id: 'latam-compliance',
          title: 'Latin America Compliance',
          text: 'Full compliance with: LGPD (Brazil) and emerging privacy frameworks. Portuguese and Spanish language support for all legal documentation.',
          compliance: ['LGPD', 'Regional Privacy Laws']
        }
      ]
    }
  ]
};

// ============================================================================
// COMBINED LEGAL FRAMEWORK
// ============================================================================
export const MMORA_LEGAL_PILLARS: LegalPillar[] = [
  DHF_PROTOCOLS,
  ZOE_ACCORDS,
  REALITY_INTERFACE,
  EXODUS_RULES,
  SOVEREIGNTY_CLAUSE
];

// ============================================================================
// CONTINENT STATUS DATA
// ============================================================================
export const CONTINENT_STATUS: ContinentStatus[] = [
  {
    name: 'North America',
    code: 'NA',
    status: 'compliant',
    regulations: ['CCPA', 'CPRA', 'COPPA', 'BIPA', 'State Privacy Laws'],
    position: { lat: 40, lng: -100 }
  },
  {
    name: 'South America',
    code: 'SA',
    status: 'compliant',
    regulations: ['LGPD', 'Regional Privacy Laws'],
    position: { lat: -15, lng: -60 }
  },
  {
    name: 'Europe',
    code: 'EU',
    status: 'compliant',
    regulations: ['GDPR', 'DSA', 'EU AI Act', 'ePrivacy', 'Copyright Directive'],
    position: { lat: 50, lng: 10 }
  },
  {
    name: 'Africa',
    code: 'AF',
    status: 'active',
    regulations: ['POPIA (South Africa)', 'Emerging Frameworks'],
    position: { lat: 0, lng: 20 }
  },
  {
    name: 'Asia',
    code: 'AS',
    status: 'compliant',
    regulations: ['DPDP 2023', 'PIPL', 'PDPA', 'APPI'],
    position: { lat: 35, lng: 100 }
  },
  {
    name: 'Oceania',
    code: 'OC',
    status: 'compliant',
    regulations: ['Privacy Act (AU)', 'Privacy Act (NZ)'],
    position: { lat: -25, lng: 135 }
  },
  {
    name: 'Antarctica',
    code: 'AN',
    status: 'active',
    regulations: ['Antarctic Treaty System'],
    position: { lat: -80, lng: 0 }
  }
];

// Acknowledgment version - update when legal terms change
export const LEGAL_VERSION = '1.0.0';
export const LEGAL_EFFECTIVE_DATE = '2025-01-01';
