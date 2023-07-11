type AppStorage = { showNsfw: boolean; instanceDomain: string | undefined };
let storage: AppStorage | undefined;

export async function getStorage() {
  if (!storage) {
    storage = (await chrome.storage.sync.get([
      "showNsfw",
      "instanceDomain",
    ])) as AppStorage;
  }

  return storage;
}
