import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.mmora.xyz";

interface PageSeoProps {
  title: string;
  description: string;
  /** Override the canonical path. Defaults to the current route. */
  path?: string;
  noIndex?: boolean;
}

/**
 * Per-route head metadata: unique title/description, self-referencing
 * canonical and og:url. Keeps social previews page-specific.
 */
export const PageSeo = ({ title, description, path, noIndex }: PageSeoProps) => {
  const location = useLocation();
  const routePath = path ?? location.pathname;
  const url = `${SITE_URL}${routePath === "/" ? "/" : routePath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noIndex ? <meta name="robots" content="noindex" /> : null}
    </Helmet>
  );
};

export default PageSeo;
