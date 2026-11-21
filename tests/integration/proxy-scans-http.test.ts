import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequestHandler } from "../../scripts/serve-web.mjs";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const LIGHTNING_BOLT_ORACLE_ID = "4457ed35-7c10-48c8-9776-456485fdf070";

describe("Proxy Scans HTTP API integration", () => {
  let tempDir: string;
  let server: Server;
  let baseUrl: string;
  let imageFetchCount = 0;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "draftmaster-proxy-http-"));

    const stubFetch: typeof fetch = (input) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://api.scryfall.com/cards/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              has_more: false,
              data: [
                {
                  id: "fr-bolt-hd",
                  oracle_id: LIGHTNING_BOLT_ORACLE_ID,
                  lang: "fr",
                  name: "Lightning Bolt",
                  printed_name: "Foudre",
                  printed_type_line: "Éphémère",
                  printed_text: "La Foudre inflige 3 blessures à n'importe quelle cible.",
                  set: "2x2",
                  set_name: "Double Masters 2022",
                  collector_number: "117",
                  released_at: "2022-07-08",
                  artist: "Christopher Moeller",
                  illustration_id: "illus-classic",
                  frame: "2015",
                  border_color: "black",
                  highres_image: true,
                  image_status: "highres_scan",
                  booster: true,
                  image_uris: {
                    png: "https://cards.scryfall.io/png/front/f/r/fr-bolt-hd.png",
                    large: "https://cards.scryfall.io/large/front/f/r/fr-bolt-hd.jpg",
                    art_crop: "https://cards.scryfall.io/art_crop/front/f/r/fr-bolt-hd.jpg",
                  },
                },
                {
                  id: "en-bolt-sld",
                  oracle_id: LIGHTNING_BOLT_ORACLE_ID,
                  lang: "en",
                  name: "Lightning Bolt",
                  type_line: "Instant",
                  oracle_text: "Lightning Bolt deals 3 damage to any target.",
                  set: "sld",
                  set_name: "Secret Lair Drop",
                  collector_number: "86",
                  released_at: "2020-07-15",
                  artist: "Noah Bradley",
                  illustration_id: "illus-sld",
                  frame: "2015",
                  frame_effects: ["borderless"],
                  border_color: "borderless",
                  full_art: true,
                  highres_image: true,
                  image_status: "highres_scan",
                  image_uris: {
                    png: "https://cards.scryfall.io/png/front/s/l/en-bolt-sld.png",
                    large: "https://cards.scryfall.io/large/front/s/l/en-bolt-sld.jpg",
                    art_crop: "https://cards.scryfall.io/art_crop/front/s/l/en-bolt-sld.jpg",
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.startsWith("https://cards.scryfall.io/")) {
        imageFetchCount += 1;
        return Promise.resolve(
          new Response(ONE_PIXEL_PNG, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          }),
        );
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    };

    const handler = createRequestHandler({
      authEnabled: false,
      isTestEnv: true,
      proxyScansCatalogPath: join(tempDir, "proxy-scans.json"),
      proxyScansImageCacheDir: join(tempDir, "image-cache"),
      proxyScansFetch: stubFetch,
    });

    server = createServer(handler);
    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => {
        resolvePromise();
      });
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${String(addr.port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((err) => {
        if (err) rejectPromise(err);
        else resolvePromise();
      });
    });
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns an empty valid catalog before any curation or override is written", async () => {
    const res = await fetch(`${baseUrl}/api/proxy-scans/catalog`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; catalog: { cardCount: number } };
    expect(body.ok).toBe(true);
    expect(body.catalog.cardCount).toBe(0);
  });

  it("fetches and curates classic + popular original prints and French metadata via /api/proxy-scans/prints", async () => {
    const res = await fetch(
      `${baseUrl}/api/proxy-scans/prints?oracleId=${LIGHTNING_BOLT_ORACLE_ID}&name=Lightning%20Bolt`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      classic: { scryfallId: string; isOfficialFrenchScan: boolean };
      original: { scryfallId: string; needsFrenchProxyRender: boolean };
      french: { name: string; typeLine: string };
      candidates: readonly unknown[];
    };

    expect(body.ok).toBe(true);
    expect(body.classic.scryfallId).toBe("fr-bolt-hd");
    expect(body.classic.isOfficialFrenchScan).toBe(true);
    expect(body.original.scryfallId).toBe("en-bolt-sld");
    expect(body.original.needsFrenchProxyRender).toBe(true);
    expect(body.french.name).toBe("Foudre");
    expect(body.french.typeLine).toBe("Éphémère");
    expect(body.candidates).toHaveLength(2);
  });

  it("proxies allowlisted Scryfall CDN images with disk caching and rejects non-Scryfall URLs", async () => {
    const badRes = await fetch(
      `${baseUrl}/api/proxy-scans/image?url=${encodeURIComponent("http://127.0.0.1:3000/secret.png")}`,
    );
    expect(badRes.status).toBe(400);

    const imgUrl = "https://cards.scryfall.io/png/front/f/r/fr-bolt-hd.png";
    const first = await fetch(`${baseUrl}/api/proxy-scans/image?url=${encodeURIComponent(imgUrl)}`);
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    expect(imageFetchCount).toBe(1);

    // Second request hits local disk cache without calling upstream fetch again
    const second = await fetch(
      `${baseUrl}/api/proxy-scans/image?url=${encodeURIComponent(imgUrl)}`,
    );
    expect(second.status).toBe(200);
    expect(imageFetchCount).toBe(1);
  });

  it("persists print & custom French text overrides atomically into the catalog", async () => {
    const saveRes = await fetch(`${baseUrl}/api/proxy-scans/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oracleId: LIGHTNING_BOLT_ORACLE_ID,
        name: "Lightning Bolt",
        slug: "lightning-bolt",
        classic: {
          scryfallId: "fr-bolt-hd",
          lang: "fr",
          setCode: "2x2",
          setName: "Double Masters 2022",
          collectorNumber: "117",
          releasedAt: "2022-07-08",
          artist: "Christopher Moeller",
          frame: "2015",
          frameEffects: [],
          borderColor: "black",
          promoTypes: [],
          fullArt: false,
          borderless: false,
          highresImage: true,
          imageStatus: "highres_scan",
          treatmentLabel: "Classique FR HD",
          pngUrl: "https://cards.scryfall.io/png/front/f/r/fr-bolt-hd.png",
          largeUrl: "https://cards.scryfall.io/large/front/f/r/fr-bolt-hd.jpg",
          isOfficialFrenchScan: true,
          needsFrenchProxyRender: false,
          score: 200,
        },
        original: null,
        french: {
          name: "Éclair Foudroyant",
          typeLine: "Éphémère",
          rulesText: "Inflige 3 blessures à n'importe quelle cible.",
        },
      }),
    });

    expect(saveRes.status).toBe(200);
    const catalogRes = await fetch(`${baseUrl}/api/proxy-scans/catalog`);
    const catalogBody = (await catalogRes.json()) as {
      ok: boolean;
      catalog: {
        cardCount: number;
        entries: Record<string, { french: { name: string; source: string } }>;
      };
    };
    expect(catalogBody.catalog.cardCount).toBe(1);
    expect(catalogBody.catalog.entries[LIGHTNING_BOLT_ORACLE_ID]?.french.name).toBe(
      "Éclair Foudroyant",
    );
    expect(catalogBody.catalog.entries[LIGHTNING_BOLT_ORACLE_ID]?.french.source).toBe("custom");
  });
});
