import { GetFederatedInstancesResponse } from "lemmy-js-client";

import { getStorage, writeStorage } from "./storage.js";

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

    if (domain) {
      try {
        const instances: GetFederatedInstancesResponse = await (
          await fetch(`https://${domain}/api/v3/federated_instances`)
        ).json();

        setStatus(
          instances.federated_instances?.blocked
            .map((instance) => instance.domain)
            .join(", ") ?? "empty"
        );
      } catch (error) {
        setStatus(`Error validating this instance domain: ${error}`);
        return;
      }
    }

    writeStorage({
      showNsfw: nsfwCheckbox && nsfwCheckbox.checked,
      instanceDomain: domainInput?.value?.trim() || undefined,
    });
  };
} else {
  console.error("Failed to find save button");
}

if (resetButton) {
  resetButton.onclick = async () => {
    chrome.storage.sync.clear();
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
