import { describe, expect, it, vi } from "vitest";
import { importPrintedNames } from "../../../src/cards/import-printed-names.ts";

const card = { name: "Brainstorm", oracleId: "36cd2364-d113-47d1-b2c4-b088d9eb88dd" };
const print = (id: string, lang: string, printedName: string) => ({
  id,
  oracle_id: card.oracleId,
  name: card.name,
  lang,
  printed_name: printedName,
});
const pause = () => Promise.resolve();

describe("explicit printed-name import", () => {
  it("follows pagination, preserves non-Latin and face aliases and deterministically deduplicates printings", async () => {
    const next = "https://api.scryfall.com/cards/search?page=2";
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          has_more: true,
          next_page: next,
          data: [print("b", "fr", "Remue-méninges")],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          has_more: false,
          data: [
            print("a", "fr", "Remue-méninges"),
            { ...print("c", "ja", "渦まく知識"), card_faces: [{ printed_name: "裏面" }] },
          ],
        }),
      );
    const aliases = await importPrintedNames([card, card], { request, pause });
    expect(aliases).toHaveLength(3);
    expect(aliases).toContainEqual({
      name: card.name,
      oracleId: card.oracleId,
      lang: "fr",
      printedName: "Remue-méninges",
      scryfallId: "a",
    });
    expect(aliases.map((alias) => alias.printedName)).toEqual(
      expect.arrayContaining(["渦まく知識", "裏面"]),
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(next);
    const query = new URL(String(request.mock.calls[0]?.[0])).searchParams.get("q");
    expect(query).toContain(`oracleid:${card.oracleId}`);
    expect(query).toContain("lang:any -lang:en unique:prints");
  });

  it("treats a first-page 404 as no translated printings", async () => {
    expect(
      await importPrintedNames([card], {
        request: () => Promise.resolve(new Response(null, { status: 404 })),
        pause,
      }),
    ).toEqual([]);
  });

  it.each([429, 503])("aborts on HTTP %s without returning partial data", async (status) => {
    await expect(
      importPrintedNames([card], {
        request: () => Promise.resolve(new Response(null, { status })),
        pause,
      }),
    ).rejects.toThrow(`HTTP ${String(status)}`);
  });

  it.each([
    { has_more: true, next_page: "https://example.com/leak", data: [] },
    { has_more: true, data: [] },
    { has_more: false, data: [{ ...print("a", "fr", "Remue-méninges"), oracle_id: "wrong" }] },
    { data: [] },
  ])("rejects malformed or unrelated source data", async (page) => {
    const request = vi.fn(() => Promise.resolve(Response.json(page)));
    await expect(importPrintedNames([card], { request, pause })).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
