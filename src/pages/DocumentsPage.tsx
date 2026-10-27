import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicInfoFooter from '@/components/legal/PublicInfoFooter';
import PageSeo from '@/components/seo/PageSeo';
import { filterPublicDocuments } from '@/config/publicDocuments';

export default function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const documents = filterPublicDocuments(query, region);
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSeo title="Documents — Policies and Country Notices" description="Browse public terms, privacy, copyright information and the approval status of India, Singapore and United States country notices." path="/documents" noIndex />
        <header className="space-y-3 border-b border-border pb-6">
          <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-3xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">Public policies and notices</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search documents" placeholder="Search documents" value={query} onChange={event => setQuery(event.target.value)} className="pl-10" />
          </div>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger aria-label="Country"><SelectValue /></SelectTrigger>
            <SelectContent>{['All regions', 'India', 'Singapore', 'United States'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ul className="divide-y divide-border" aria-label="Public documents">
          {documents.map(doc => (
            <li key={doc.id} className="flex items-start justify-between gap-4 py-5">
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">{doc.category} · {doc.region}</p>
                {doc.href ? <Link to={doc.href} className="inline-flex min-h-8 items-center gap-2 font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{doc.title}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link> : <h2 className="font-medium">{doc.title}</h2>}
                {doc.summary && <details className="text-sm"><summary className="cursor-pointer underline underline-offset-4">Read notice</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{doc.summary.map(point => <li key={point}>{point}</li>)}</ul></details>}
                {doc.updated && <p className="text-xs text-muted-foreground">Updated {doc.updated}</p>}
              </div>
              <span className="max-w-24 shrink-0 pt-1 text-right text-xs text-muted-foreground">{doc.status}</span>
            </li>
          ))}
        </ul>
        {documents.length === 0 && <p role="status" className="py-8 text-sm text-muted-foreground">No matching documents.</p>}
        <PublicInfoFooter />
      </div>
    </main>
  );
}