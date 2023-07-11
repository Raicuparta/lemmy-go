const defaultValues = {
  showNsfw: false,
  instanceDomain: "",
};
type AppStorage = typeof defaultValues;
type StorageKey = keyof AppStorage;

export async function getStorage() {
  return (await chrome.storage.sync.get(
    Object.keys(defaultValues)
  )) as AppStorage;
}

export async function getStorageValue<K extends StorageKey>(
  key: K
): Promise<AppStorage[K]> {
  const storage = await getStorage();
  return storage[key];
}

export async function writeStorage(values: Partial<AppStorage>) {
  await chrome.storage.sync.set(values);
}
