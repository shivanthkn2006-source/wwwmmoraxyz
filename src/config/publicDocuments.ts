export interface PublicDocument {
  id: string;
  title: string;
  region: 'All regions' | 'India' | 'Singapore' | 'United States';
  status: 'Available' | 'Pending approval';
  category: string;
  href?: string;
  updated?: string;
}

// Only public policy links belong here. Corporate/admin audit files stay in Files.
export const PUBLIC_DOCUMENTS: PublicDocument[] = [
  { id: 'terms', title: 'Terms of Service', category: 'Member policies', region: 'All regions', status: 'Available', href: '/terms', updated: '25 October 2026' },
  { id: 'privacy', title: 'Privacy and Data Policy', category: 'Member policies', region: 'All regions', status: 'Available', href: '/data-policy', updated: '25 October 2026' },
  { id: 'copyright', title: 'Content ownership and permitted use', category: 'Copyright', region: 'All regions', status: 'Available', href: '/terms' },
  { id: 'cookies', title: 'Cookies and measurement choices', category: 'Member policies', region: 'All regions', status: 'Available', href: '/data-policy' },
  { id: 'india', title: 'India country notice', category: 'Country notices', region: 'India', status: 'Pending approval' },
  { id: 'singapore', title: 'Singapore country notice', category: 'Country notices', region: 'Singapore', status: 'Pending approval' },
  { id: 'us', title: 'United States country notice', category: 'Country notices', region: 'United States', status: 'Pending approval' },
  { id: 'dmca', title: 'Copyright notices and counter-notices', category: 'Copyright', region: 'United States', status: 'Pending approval' },
  { id: 'commercial', title: 'Pricing, cancellation and refunds', category: 'Commercial disclosures', region: 'All regions', status: 'Pending approval' },
];

export function filterPublicDocuments(query: string, region: string): PublicDocument[] {
  const term = query.trim().toLocaleLowerCase();
  return PUBLIC_DOCUMENTS.filter(doc =>
    (region === 'All regions' || doc.region === region || doc.region === 'All regions') &&
    `${doc.title} ${doc.category} ${doc.region} ${doc.status}`.toLocaleLowerCase().includes(term),
  );
}