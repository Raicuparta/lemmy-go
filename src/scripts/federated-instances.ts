import { GetFederatedInstancesResponse, Instance } from "lemmy-js-client";

import { getStorageValue } from "./storage.js";

const defaultFederatedInstances = {
  linked: [] as string[],
  allowed: [] as string[],
  blocked: [] as string[],
};

type FederatedInstancesCache = typeof defaultFederatedInstances;

const cacheKey = "federatedInstances" as const;

async function getCachedFederatedInstances() {
  return (await chrome.storage.local.get([cacheKey]))[
    cacheKey
  ] as FederatedInstancesCache;
}

async function setCachedFederatedInstances(
  federatedInstances: FederatedInstancesCache
) {
  await chrome.storage.local.set({
    [cacheKey]: federatedInstances,
  });
}

function instancesToDomains(instances: Instance[] | undefined) {
  if (!instances) return [];
  return instances.map((instance) => instance.domain);
}

async function updateFederatedInstancesCache(domain: string) {
  console.log("Updating federated instances cache...");
  let instancesResponse: GetFederatedInstancesResponse | undefined;

  instancesResponse = await (
    await fetch(`https://${domain}/api/v3/federated_instances`)
  ).json();

  const federatedInstances = instancesResponse?.federated_instances;

  if (!instancesResponse || !federatedInstances) {
    throw new Error("Empty response when trying to get federated instances");
  }

  const cache = {
    allowed: instancesToDomains(federatedInstances.allowed),
    linked: instancesToDomains(federatedInstances.linked),
    blocked: instancesToDomains(federatedInstances.blocked),
  };

  setCachedFederatedInstances(cache);

  console.log("Successfully updated federated instances cache");
  return cache;
}

export async function getFederatedInstances(
  domain: string,
  ignoreCache = false
) {
  const cachedFederatedInstances = await getCachedFederatedInstances();

  if (!cachedFederatedInstances || ignoreCache) {
    console.log("Federated instances cache is empty, waiting for result.");
    return await updateFederatedInstancesCache(domain);
  } else {
    console.log(
      "Federated instances cache is present, updating in the background."
    );
    // If there's already a cache, we return the current cache but keep updating in the background.
    updateFederatedInstancesCache(domain);
  }

  return cachedFederatedInstances;
}

export async function isInstanceFederated(remoteInstance: string) {
  const preferredInstance = await getStorageValue("instanceDomain");
  if (!preferredInstance || preferredInstance === remoteInstance) {
    return true;
  }

  const federatedInstances = await getFederatedInstances(preferredInstance);

  if (
    federatedInstances.blocked.find((instance) => instance === remoteInstance)
  ) {
    return false;
  }

  if (
    ![...federatedInstances.allowed, ...federatedInstances.linked].find(
      (instance) => instance === remoteInstance
    )
  ) {
    return false;
  }

  return true;
}
