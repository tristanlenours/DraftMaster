import { describe, expect, it } from "vitest";
import { buildZipArchive, computeCrc32 } from "../../../src/web/proxy-zip.js";

describe("client-side PKZIP builder (proxy-zip.js)", () => {
  it("computes the standard IEEE 802.3 CRC-32 checksum", () => {
    const bytes = new TextEncoder().encode("123456789");
    expect(computeCrc32(bytes)).toBe(0xcbf43926);
  });

  it("produces a valid PKZIP archive with local headers, central directory, and EOCD", () => {
    const fileA = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fileB = new TextEncoder().encode("DraftMaster Proxy FR");

    const zip = buildZipArchive(
      [
        { name: "001-foudre-classique.png", data: fileA },
        { name: "002-note-français.txt", data: fileB },
      ],
      new Date("2026-11-21T12:00:00Z"),
    );

    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // Local File Header signature: PK\x03\x04
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // End of Central Directory signature at the tail: PK\x05\x06
    expect(view.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
    // Entry count in EOCD = 2
    expect(view.getUint16(zip.byteLength - 14, true)).toBe(2);
    expect(view.getUint16(zip.byteLength - 12, true)).toBe(2);
  });
});
