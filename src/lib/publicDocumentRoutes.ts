/** Public information only; never use this list to authorize member data. */
export const PUBLIC_DOCUMENT_ROUTES = ['/documents', '/terms', '/data-policy', '/help', '/about', '/map', '/report-abuse'] as const;

export function isPublicDocumentRoute(pathname: string): boolean {
  return PUBLIC_DOCUMENT_ROUTES.some(path => path === pathname);
}