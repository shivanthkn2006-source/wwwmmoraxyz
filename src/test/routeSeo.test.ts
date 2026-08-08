import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ROUTE_SEO_LIST } from "../config/routeSeo";
import { entries as sitemapEntries } from "../../scripts/generate-sitemap";

const read = (p: string) => readFileSync(resolve(p), "utf8");

describe("route SEO registry", () => {
  it("covers exactly the public routes in the sitemap", () => {
    expect(ROUTE_SEO_LIST.map((e) => e.path).sort()).toEqual(
      sitemapEntries.map((e) => e.path).sort(),
    );
  });

  it("has unique, length-safe titles and descriptions", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const entry of ROUTE_SEO_LIST) {
      expect(entry.title.length, `${entry.path} title`).toBeGreaterThan(10);
      expect(entry.title.length, `${entry.path} title too long`).toBeLessThan(60);
      expect(entry.description.length, `${entry.path} description`).toBeGreaterThan(50);
      expect(entry.description.length, `${entry.path} description too long`).toBeLessThan(160);
      expect(titles.has(entry.title), `duplicate title for ${entry.path}`).toBe(false);
      expect(descriptions.has(entry.description), `duplicate description for ${entry.path}`).toBe(false);
      titles.add(entry.title);
      descriptions.add(entry.description);
    }
  });

  it("mounts PageSeo with the registered copy on every route page", () => {
    for (const entry of ROUTE_SEO_LIST) {
      const source = read(entry.source);
      expect(source, `${entry.source} must render <PageSeo`).toContain("<PageSeo");
      const usesRegistry = source.includes(`ROUTE_SEO['${entry.path}']`);
      if (!usesRegistry) {
        expect(source, `${entry.source} title mismatch`).toContain(entry.title);
        expect(source, `${entry.source} description mismatch`).toContain(entry.description);
      }
    }
  });

  it("declares at least one h1 per route page", () => {
    // Some pages render mutually exclusive branches, so the exact count is
    // asserted at runtime by tests/e2e/seo-crawl.spec.ts.
    for (const entry of ROUTE_SEO_LIST) {
      const source = read(entry.source);
      const count = (source.match(/<h1[\s>]/g) ?? []).length;
      expect(count, `${entry.source} should declare an <h1>`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("PageSeo component", () => {
  const source = read("src/components/seo/PageSeo.tsx");

  it("emits a self-referencing canonical and og:url", () => {
    expect(source).toContain('rel="canonical"');
    expect(source).toContain('property="og:url"');
    expect(source).toContain("https://www.mmora.xyz");
  });
});

describe("index.html head", () => {
  const html = read("index.html");

  it("has no template default metadata and no static canonical", () => {
    expect(html).not.toContain("Lovable Generated Project");
    expect(html).not.toContain("<title>Lovable App</title>");
    expect(html).not.toMatch(/<link[^>]+rel="canonical"/);
  });

  it("keeps sitewide og/twitter fallbacks and the sitemap link", () => {
    for (const tag of ['property="og:title"', 'property="og:type"', 'name="twitter:card"', 'rel="sitemap"']) {
      expect(html).toContain(tag);
    }
  });

  it("ships valid JSON-LD blocks with recognised schema types", () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (m) => m[1],
    );
    expect(blocks.length).toBeGreaterThan(0);
    const types = blocks.map((block) => {
      const parsed = JSON.parse(block);
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(typeof parsed["@type"]).toBe("string");
      return parsed["@type"];
    });
    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
  });
});
