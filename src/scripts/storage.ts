const defaultValues = {
  showNsfw: false,
  instanceDomain: "",
};
type AppStorage = typeof defaultValues;
type StorageKey = keyof AppStorage;

let storageCache: AppStorage | undefined;

export async function getStorage() {
  if (!storageCache) {
    storageCache = (await chrome.storage.sync.get(
      Object.keys(defaultValues)
    )) as AppStorage;
  }

  return storageCache;
}

export async function getStorageValue<K extends StorageKey>(
  key: K
): Promise<AppStorage[K]> {
  const storage = await getStorage();
  return storage[key];
}

export async function writeStorage(values: Partial<AppStorage>) {
  await chrome.storage.sync.set(values);

  // Clear cache so storage gets fetched again next time it's accessed.
  storageCache = undefined;
}
