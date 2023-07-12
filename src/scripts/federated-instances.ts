import { GetFederatedInstancesResponse } from "lemmy-js-client";

import { getStorageValue } from "./storage.js";

const cacheKey = "blockedInstances" as const;

async function getCachedBlockedInstances() {
  return (await chrome.storage.local.get([cacheKey]))[cacheKey] as string[];
}

async function setCachedBlockedInstances(blockedInstances: string[]) {
  await chrome.storage.local.set({
    [cacheKey]: blockedInstances,
  });
}

async function updateBlockedInstancesCache(domain: string) {
  console.log("Updating federated instances cache...");
  let instancesResponse: GetFederatedInstancesResponse | undefined;

  instancesResponse = await (
    await fetch(`https://${domain}/api/v3/federated_instances`)
  ).json();

  const federatedInstances = instancesResponse?.federated_instances;

  if (!instancesResponse || !federatedInstances) {
    throw new Error("Empty response when trying to get federated instances");
  }

  const cache = federatedInstances.blocked.map((instance) => instance.domain);

  setCachedBlockedInstances(cache);

  console.log("Successfully updated federated instances cache");
  return cache;
}

export async function getBlockedInstances(domain: string, ignoreCache = false) {
  const cachedFederatedInstances = await getCachedBlockedInstances();

  if (!cachedFederatedInstances || ignoreCache) {
    console.log("Federated instances cache is empty, waiting for result.");
    return await updateBlockedInstancesCache(domain);
  } else {
    console.log(
      "Federated instances cache is present, updating in the background."
    );
    // If there's already a cache, we return the current cache but keep updating in the background.
    updateBlockedInstancesCache(domain);
  }

  return cachedFederatedInstances;
}

export async function isInstanceFederated(remoteInstance: string) {
  const preferredInstance = await getStorageValue("instanceDomain");
  if (!preferredInstance || preferredInstance === remoteInstance) {
    return false;
  }

  const blockedInstances = await getBlockedInstances(preferredInstance);

  if (blockedInstances.find((instance) => instance === remoteInstance)) {
    return false;
  }

  return true;
}
