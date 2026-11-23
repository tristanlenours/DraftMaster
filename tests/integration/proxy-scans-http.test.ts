import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const MPC_ID = "1AA85Rfe_Rg5hozPMOcHBJLxpwSgO4xUA";
const MPC_ID_FR = "1IS77TWnANnx6tViJ9BGb93gKa6ZjEwRz";
const MPC_BROKEN_ID = "1brokenImageIdentifier0000000000";
const LIGHTNING_BOLT_ORACLE_ID = "4457ed35-7c10-48c8-9776-456485fdf070";

describe("Proxy Scans HTTP API integration", () => {
  let tempDir: string;
  let server: Server;
  let baseUrl: string;
  let imageFetchCount = 0;
  let symbolFetchCount = 0;
  let mpcApiFetchCount = 0;
  let mpcImageFetchCount = 0;
  let lastMpcSearchBody: unknown = null;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "draftmaster-proxy-http-"));

    const stubFetch: typeof fetch = (input, init) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://mpcfill.com/2/")) {
        mpcApiFetchCount += 1;
        if (url.endsWith("/2/sources/")) {
          return Promise.resolve(
            Response.json({ results: { "1": { pk: 1, name: "A" }, "2": { pk: 2, name: "B" } } }),
          );
        }
        if (url.endsWith("/2/editorSearch/")) {
          lastMpcSearchBody = JSON.parse(
            typeof init?.body === "string" ? init.body : "{}",
          ) as unknown;
          return Promise.resolve(
            Response.json({ results: { "lightning bolt": { CARD: [MPC_ID, MPC_ID_FR] } } }),
          );
        }
        if (url.endsWith("/2/cards/")) {
          return Promise.resolve(
            Response.json({
              results: {
                [MPC_ID]: {
                  identifier: MPC_ID,
                  name: "Lightning Bolt (Borderless)",
                  dpi: 1200,
                  size: 2000000,
                  sourceName: "JohnPrime",
                  language: "EN",
                  tags: [],
                },
                [MPC_ID_FR]: {
                  identifier: MPC_ID_FR,
                  name: "Foudre",
                  dpi: 800,
                  sourceName: "FrenchSource",
                  language: "FR",
                },
              },
            }),
          );
        }
      }
      if (url.startsWith("https://lh4.googleusercontent.com/d/")) {
        mpcImageFetchCount += 1;
        if (url.includes(MPC_BROKEN_ID)) {
          return Promise.resolve(
            new Response("<html>quota</html>", {
              status: 200,
              headers: { "Content-Type": "text/html" },
            }),
          );
        }
        return Promise.resolve(
          new Response(ONE_PIXEL_PNG, { status: 200, headers: { "Content-Type": "image/png" } }),
        );
      }
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
      if (url.startsWith("https://svgs.scryfall.io/card-symbols/")) {
        symbolFetchCount += 1;
        if (url.endsWith("/ZZ.svg")) {
          return Promise.resolve(new Response("Not found", { status: 404 }));
        }
        return Promise.resolve(
          new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>', {
            status: 200,
            headers: { "Content-Type": "image/svg+xml" },
          }),
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
      proxyScansFontsDir: join(tempDir, "fonts"),
    });
    await mkdir(join(tempDir, "fonts"), { recursive: true });
    await writeFile(
      join(tempDir, "fonts", "beleren-bold.woff2"),
      Buffer.from([0x77, 0x4f, 0x46, 0x32]),
    );
    await writeFile(join(tempDir, "fonts", "notes.txt"), "ignored");

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

  it("serves Scryfall mana symbols as sandboxed SVG and caches them on disk", async () => {
    const first = await fetch(`${baseUrl}/api/proxy-scans/symbol/T.svg`);
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toContain("image/svg+xml");
    expect(first.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await first.text()).toContain("<svg");

    const fetchesAfterFirst = symbolFetchCount;
    const second = await fetch(`${baseUrl}/api/proxy-scans/symbol/T.svg`);
    expect(second.status).toBe(200);
    expect(symbolFetchCount).toBe(fetchesAfterFirst);
  });

  it("rejects malformed mana symbol codes without calling Scryfall", async () => {
    const before = symbolFetchCount;
    for (const path of ["t.svg", "W%2FU.svg", "TOOLONGCODE1.svg", "T.png"]) {
      const res = await fetch(`${baseUrl}/api/proxy-scans/symbol/${path}`);
      expect(res.status).toBe(400);
    }
    expect(symbolFetchCount).toBe(before);
  });

  it("reports an unknown symbol as 404", async () => {
    const res = await fetch(`${baseUrl}/api/proxy-scans/symbol/ZZ.svg`);
    expect(res.status).toBe(404);
  });

  it("lists and serves only well-formed user-supplied card fonts", async () => {
    const list = await fetch(`${baseUrl}/api/proxy-scans/fonts`);
    expect(((await list.json()) as { files: string[] }).files).toEqual(["beleren-bold.woff2"]);

    const font = await fetch(`${baseUrl}/api/proxy-scans/fonts/beleren-bold.woff2`);
    expect(font.status).toBe(200);
    expect(font.headers.get("content-type")).toBe("font/woff2");

    for (const path of ["notes.txt", "missing.ttf", "..%2Fproxy-scans.json"]) {
      const res = await fetch(`${baseUrl}/api/proxy-scans/fonts/${path}`);
      expect(res.status).toBe(404);
    }
  });

  it("searches MPC Autofill across every source and caches the result", async () => {
    const res = await fetch(`${baseUrl}/api/proxy-scans/mpc/search?q=Lightning%20Bolt`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      query: string;
      candidates: { identifier: string; dpi: number; language: string }[];
    };
    expect(body.query).toBe("lightning bolt");
    expect(body.candidates.map((c) => [c.identifier, c.dpi, c.language])).toEqual([
      [MPC_ID, 1200, "EN"],
      [MPC_ID_FR, 800, "FR"],
    ]);
    expect(lastMpcSearchBody).toMatchObject({
      queries: [{ query: "lightning bolt", cardType: "CARD" }],
      searchSettings: {
        sourceSettings: {
          sources: [
            [1, true],
            [2, true],
          ],
        },
      },
    });

    const callsAfterFirst = mpcApiFetchCount;
    const again = await fetch(`${baseUrl}/api/proxy-scans/mpc/search?q=lightning%20bolt`);
    expect(again.status).toBe(200);
    expect(mpcApiFetchCount).toBe(callsAfterFirst);
  });

  it("refuses MPC searches without a usable card name", async () => {
    const res = await fetch(`${baseUrl}/api/proxy-scans/mpc/search?q=%20`);
    expect(res.status).toBe(400);
  });

  it("proxies MPC images from Google's public endpoint with a disk cache", async () => {
    const first = await fetch(`${baseUrl}/api/proxy-scans/mpc/image/${MPC_ID}?size=full`);
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    const fetchesAfterFirst = mpcImageFetchCount;
    const second = await fetch(`${baseUrl}/api/proxy-scans/mpc/image/${MPC_ID}?size=full`);
    expect(second.status).toBe(200);
    expect(mpcImageFetchCount).toBe(fetchesAfterFirst);
  });

  it("rejects malformed MPC identifiers and non-image upstream answers", async () => {
    const before = mpcImageFetchCount;
    for (const id of ["short", "..%2F..%2Fetc", `${MPC_ID}%3Fx%3D1`]) {
      const res = await fetch(`${baseUrl}/api/proxy-scans/mpc/image/${id}?size=full`);
      expect(res.status).toBe(400);
    }
    expect(mpcImageFetchCount).toBe(before);

    const broken = await fetch(`${baseUrl}/api/proxy-scans/mpc/image/${MPC_BROKEN_ID}?size=thumb`);
    expect(broken.status).toBe(502);
  });

  it("stores an MPC render as a curated variant but refuses foreign image hosts", async () => {
    const mpcVariant = {
      scryfallId: `mpc:${MPC_ID}`,
      lang: "en",
      setCode: "MPC",
      pngUrl: `/api/proxy-scans/mpc/image/${MPC_ID}?size=full`,
      largeUrl: `/api/proxy-scans/mpc/image/${MPC_ID}?size=thumb`,
    };
    const ok = await fetch(`${baseUrl}/api/proxy-scans/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oracleId: LIGHTNING_BOLT_ORACLE_ID, original: mpcVariant }),
    });
    expect(ok.status).toBe(200);

    const foreign = await fetch(`${baseUrl}/api/proxy-scans/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oracleId: LIGHTNING_BOLT_ORACLE_ID,
        original: { ...mpcVariant, pngUrl: "https://evil.example/card.png" },
      }),
    });
    expect(foreign.status).toBe(400);
  });

  it("keeps the official French provenance when only the print changes", async () => {
    const oracleId = "0f1c2d3e-4b5a-4c6d-8e7f-901234567890";
    const catalogPath = join(tempDir, "proxy-scans.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
      entries: Record<string, unknown>;
    };
    const officialFrench = {
      name: "Pyromancien aguerri",
      typeLine: "Créature : humain et shamane",
      rulesText: "Quand le Pyromancien aguerri arrive, défaussez-vous de deux cartes.",
      source: "official_scryfall_fr",
      officialFrenchPrintExists: true,
    };
    const classic = {
      scryfallId: "pyro-en",
      lang: "en",
      setCode: "2x2",
      pngUrl: "https://cards.scryfall.io/png/front/p/y/pyro-en.png",
      largeUrl: "https://cards.scryfall.io/large/front/p/y/pyro-en.jpg",
    };
    catalog.entries[oracleId] = {
      oracleId,
      slug: "seasoned-pyromancer",
      name: "Seasoned Pyromancer",
      french: officialFrench,
      classic,
      original: null,
      curatedAt: "",
    };
    await writeFile(catalogPath, JSON.stringify(catalog));

    const post = (payload: Record<string, unknown>) =>
      fetch(`${baseUrl}/api/proxy-scans/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oracleId, ...payload }),
      }).then(async (res) => {
        expect(res.status).toBe(200);
        return ((await res.json()) as { entry: { french: { source: string } } }).entry;
      });

    const reprinted = await post({
      original: {
        ...classic,
        scryfallId: `mpc:${MPC_ID}`,
        pngUrl: `/api/proxy-scans/mpc/image/${MPC_ID}?size=full`,
        largeUrl: `/api/proxy-scans/mpc/image/${MPC_ID}?size=thumb`,
      },
      french: officialFrench,
    });
    expect(reprinted.french.source).toBe("official_scryfall_fr");

    const edited = await post({ french: { ...officialFrench, rulesText: "Texte retouché." } });
    expect(edited.french.source).toBe("custom");
  });
});
