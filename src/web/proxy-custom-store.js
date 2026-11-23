/**
 * Browser-local library of custom proxy cards. Card fields and the uploaded
 * image (Blob) live in IndexedDB because HD images exceed localStorage quotas.
 * When IndexedDB is unavailable (private mode, blocked storage) the library
 * falls back to memory for the session, so the editor keeps working.
 */
const DB_NAME = "draftmaster-proxy-custom";
const STORE = "cards";
const DB_VERSION = 1;

const memoryStore = new Map();
let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function runTransaction(mode, operation) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) {
          resolve(undefined);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const request = operation(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(request?.result);
          tx.onerror = () => reject(tx.error ?? new Error("Erreur IndexedDB."));
          tx.onabort = () => reject(tx.error ?? new Error("Transaction IndexedDB annulée."));
        } catch (err) {
          reject(err);
        }
      }),
  );
}

/** Lists every saved custom card `{ card, image }`, most recently edited first. */
export async function listCustomCards() {
  const db = await openDatabase();
  const records = db
    ? ((await runTransaction("readonly", (store) => store.getAll())) ?? [])
    : [...memoryStore.values()];
  return records
    .filter((record) => record?.card?.id)
    .sort((a, b) => String(b.card.updatedAt).localeCompare(String(a.card.updatedAt)));
}

/** Saves (insert or replace) a custom card with its source image Blob. */
export async function saveCustomCard(card, image) {
  const record = { id: card.id, card, image };
  const db = await openDatabase();
  if (!db) {
    memoryStore.set(card.id, record);
    return record;
  }
  await runTransaction("readwrite", (store) => store.put(record));
  return record;
}

export async function deleteCustomCard(id) {
  const db = await openDatabase();
  if (!db) {
    memoryStore.delete(id);
    return;
  }
  await runTransaction("readwrite", (store) => store.delete(id));
}

/** True when cards persist across reloads (IndexedDB available). */
export async function isCustomLibraryPersistent() {
  return Boolean(await openDatabase());
}
