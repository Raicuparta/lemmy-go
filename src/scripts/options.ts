import { GetFederatedInstancesResponse, Instance } from "lemmy-js-client";

import { clearStorage, getStorage, writeStorage } from "./storage.js";

const nsfwCheckbox = document.getElementById(
  "nsfw-checkbox"
) as HTMLInputElement;
const domainInput = document.getElementById("domain-input") as HTMLInputElement;
const saveButton = document.getElementById("save-button") as HTMLButtonElement;
const resetButton = document.getElementById(
  "reset-button"
) as HTMLButtonElement;
const statusText = document.getElementById("status-text");

function setStatus(text: string) {
  if (!statusText) {
    throw new Error("Couldn't find status text element");
  }
  statusText.innerText = text;
}

if (saveButton) {
  saveButton.onclick = async () => {
    setStatus("Validating instance...");

    const domain = domainInput?.value?.trim() || undefined;
    let instancesResponse: GetFederatedInstancesResponse | undefined;

    if (domain) {
      try {
        instancesResponse = await (
          await fetch(`https://${domain}/api/v3/federated_instances`)
        ).json();

        if (!instancesResponse)
          throw new Error(
            "Empty response when trying to get federated instances"
          );

        setStatus(
          instancesResponse.federated_instances?.blocked
            .map((instance) => instance.domain)
            .join(", ") ?? "empty"
        );
      } catch (error) {
        setStatus(`Error validating this instance domain: ${error}`);
        return;
      }
    }

    const federatedInstances = instancesResponse?.federated_instances;

    function instancesToDomains(instances: Instance[] | undefined) {
      if (!instances) return [];
      return instances.map((instance) => instance.domain);
    }

    writeStorage({
      showNsfw: nsfwCheckbox && nsfwCheckbox.checked,
      instanceDomain: domainInput?.value?.trim() || undefined,
      federatedInstances: {
        allowed: instancesToDomains(federatedInstances?.allowed),
        linked: instancesToDomains(federatedInstances?.linked),
        blocked: instancesToDomains(federatedInstances?.blocked),
      },
    });
  };
} else {
  console.error("Failed to find save button");
}

if (resetButton) {
  resetButton.onclick = async () => {
    clearStorage();
    restore();
  };
} else {
  console.error("Failed to find reset button");
}

async function restore() {
  const storage = await getStorage();
  if (nsfwCheckbox) {
    nsfwCheckbox.checked = storage.showNsfw;
  }
  if (domainInput) {
    domainInput.value = storage.instanceDomain ?? "";
  }
}

document.addEventListener("DOMContentLoaded", restore);
