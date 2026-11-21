export interface ZipFileEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

export function computeCrc32(bytes: Uint8Array): number;
export function buildZipArchive(entries: readonly ZipFileEntry[], now?: Date): Uint8Array;
