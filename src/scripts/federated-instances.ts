import { GetFederatedInstancesResponse, Instance } from "lemmy-js-client";

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

  setCachedFederatedInstances({
    allowed: instancesToDomains(federatedInstances.allowed),
    linked: instancesToDomains(federatedInstances.linked),
    blocked: instancesToDomains(federatedInstances.blocked),
  });
}

export async function getFederatedInstances(
  domain: string,
  ignoreCache = false
) {
  const cachedFederatedInstances = await getCachedFederatedInstances();

  if (!cachedFederatedInstances || ignoreCache) {
    console.log("Federated instances cache is empty, waiting for result.");
    await updateFederatedInstancesCache(domain);
  } else {
    console.log(
      "Federated instances cache is present, updating in the background."
    );
    // If there's already a cache, we return the current cache but keep updating in the background.
    updateFederatedInstancesCache(domain);
  }

  return cachedFederatedInstances;
}

export async function isInstanceFederated(instanceDomain: string) {
  const federatedInstances = await getFederatedInstances(instanceDomain);

  if (
    federatedInstances.blocked.find((instance) => instance === instanceDomain)
  ) {
    return false;
  }

  if (
    ![...federatedInstances.allowed, ...federatedInstances.linked].find(
      (instance) => instance === instanceDomain
    )
  ) {
    return false;
  }

  return true;
}
