import { Link } from 'react-router-dom';

export default function PublicInfoFooter() {
  return (
    <footer className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
      <nav aria-label="M'Mora information" className="flex flex-wrap gap-x-4">
        {[
          ['Sign in', '/auth'], ['About', '/about'], ['Terms', '/terms'],
          ['Privacy', '/data-policy'], ['Help', '/help'], ['Site map', '/map'], ['Documents', '/documents'],
        ].map(([label, to]) => (
          <Link key={to} to={to} className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} M'Mora. See Terms for content ownership and permitted use.</p>
    </footer>
  );
}