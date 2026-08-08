import { describe, it, expect } from "vitest";
import {
  BASE_URL,
  entries,
  generateSitemap,
  validateBaseUrl,
  validateEntries,
  type SitemapEntry,
} from "./generate-sitemap";

describe("validateBaseUrl", () => {
  it("accepts the configured project domain", () => {
    expect(validateBaseUrl(BASE_URL)).toBe("https://www.mmora.xyz");
  });

  it("strips trailing slashes", () => {
    expect(validateBaseUrl("https://www.mmora.xyz///")).toBe("https://www.mmora.xyz");
  });

  it("rejects empty or non-string values", () => {
    expect(() => validateBaseUrl("")).toThrow(/non-empty/);
    expect(() => validateBaseUrl(undefined)).toThrow(/non-empty/);
    expect(() => validateBaseUrl(123 as unknown as string)).toThrow(/non-empty/);
  });

  it("rejects relative or malformed URLs", () => {
    expect(() => validateBaseUrl("/")).toThrow(/absolute URL/);
    expect(() => validateBaseUrl("www.mmora.xyz")).toThrow(/absolute URL/);
    expect(() => validateBaseUrl("https://localhost")).toThrow(/valid hostname/);
  });

  it("rejects non-http protocols, queries and hashes", () => {
    expect(() => validateBaseUrl("ftp://mmora.xyz")).toThrow(/http/);
    expect(() => validateBaseUrl("https://mmora.xyz?a=1")).toThrow(/query string or hash/);
    expect(() => validateBaseUrl("https://mmora.xyz#x")).toThrow(/query string or hash/);
  });
});

describe("validateEntries", () => {
  it("throws on an empty route list", () => {
    expect(() => validateEntries([])).toThrow(/at least one route/);
    expect(() => validateEntries(undefined as unknown as SitemapEntry[])).toThrow(/at least one route/);
  });

  it("throws on relative or pattern routes", () => {
    expect(() => validateEntries([{ path: "about" }])).toThrow(/root-relative/);
    expect(() => validateEntries([{ path: "*" }])).toThrow(/root-relative/);
    expect(() => validateEntries([{ path: "/blog/:slug" }])).toThrow(/route pattern/);
  });

  it("de-duplicates routes ignoring trailing slashes", () => {
    const result = validateEntries([{ path: "/about" }, { path: "/about/" }, { path: "/" }]);
    expect(result.map((e) => e.path)).toEqual(["/about", "/"]);
  });
});

describe("generateSitemap", () => {
  const xml = generateSitemap(entries, BASE_URL);

  it("emits valid XML with one url per route", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
    expect(xml.match(/<url>/g)).toHaveLength(entries.length);
  });

  it("uses absolute URLs only, never relative locs", () => {
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(entries.length);
    for (const loc of locs) {
      expect(loc.startsWith("https://www.mmora.xyz/")).toBe(true);
      expect(() => new URL(loc)).not.toThrow();
    }
  });

  it("contains no duplicate URLs and no missing public routes", () => {
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
    for (const entry of entries) {
      expect(locs).toContain(`https://www.mmora.xyz${entry.path === "/" ? "/" : entry.path}`);
    }
  });

  it("omits admin, debug and auth-gated routes", () => {
    for (const blocked of ["/god-mode", "/root-scan", "/platform-audit", "/vr-audit", "/password-recovery"]) {
      expect(xml).not.toContain(`<loc>https://www.mmora.xyz${blocked}</loc>`);
    }
  });

  it("fails the build instead of emitting a malformed sitemap", () => {
    expect(() => generateSitemap(entries, "not-a-url")).toThrow();
    expect(() => generateSitemap([], BASE_URL)).toThrow();
  });
});
