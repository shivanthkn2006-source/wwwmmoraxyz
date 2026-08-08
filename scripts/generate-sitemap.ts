// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

export const BASE_URL = "https://www.mmora.xyz";

export interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Public, indexable routes only (auth-gated, admin and debug routes are omitted).
export const entries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/auth", changefreq: "monthly", priority: "0.5" },
  { path: "/zoe-infinity", changefreq: "weekly", priority: "0.9" },
  { path: "/genesis-imprint", changefreq: "monthly", priority: "0.6" },
  { path: "/ear-link-blueprint", changefreq: "monthly", priority: "0.5" },
  { path: "/install", changefreq: "monthly", priority: "0.6" },
];

/**
 * Validates the configured base URL so a misconfiguration can never produce
 * relative, malformed, or trailing-slash-duplicated <loc> values.
 * Returns the normalised origin+path without a trailing slash.
 */
export function validateBaseUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error("Sitemap BASE_URL must be a non-empty string");
  }
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Sitemap BASE_URL must be an absolute URL, received: "${value}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Sitemap BASE_URL must use http(s), received: "${value}"`);
  }
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
    throw new Error(`Sitemap BASE_URL must have a valid hostname, received: "${value}"`);
  }
  if (url.search || url.hash) {
    throw new Error(`Sitemap BASE_URL must not contain a query string or hash: "${value}"`);
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** Validates and de-duplicates routes; every path must be root-relative. */
export function validateEntries(list: SitemapEntry[]): SitemapEntry[] {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Sitemap must contain at least one route entry");
  }
  const seen = new Set<string>();
  const result: SitemapEntry[] = [];
  for (const entry of list) {
    if (!entry || typeof entry.path !== "string" || !entry.path.startsWith("/")) {
      throw new Error(`Sitemap route must be a root-relative path, received: ${JSON.stringify(entry?.path)}`);
    }
    if (entry.path.includes("*") || entry.path.includes(":")) {
      throw new Error(`Sitemap route must not contain a route pattern: "${entry.path}"`);
    }
    const normalised = entry.path === "/" ? "/" : entry.path.replace(/\/+$/, "");
    if (seen.has(normalised)) continue;
    seen.add(normalised);
    result.push({ ...entry, path: normalised });
  }
  return result;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateSitemap(list: SitemapEntry[], baseUrl: string = BASE_URL) {
  const base = validateBaseUrl(baseUrl);
  const urls = validateEntries(list).map((e) =>
    [
      `  <url>`,
      `    <loc>${escapeXml(`${base}${e.path}`)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

// Only write the file when executed directly (predev/prebuild), never on import from tests.
const isDirectRun =
  typeof process !== "undefined" && process.argv[1]?.includes("generate-sitemap");

if (isDirectRun) {
  try {
    const xml = generateSitemap(entries, BASE_URL);
    writeFileSync(resolve("public/sitemap.xml"), xml);
    console.log(`sitemap.xml written (${entries.length} entries)`);
  } catch (error) {
    console.error(`sitemap generation failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
