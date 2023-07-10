const nsfwCheckbox = document.getElementById("nsfw-checkbox");
const domainInput = document.getElementById("domain-input");
const saveButton = document.getElementById("save-button");
const resetButton = document.getElementById("reset-button");
const statusText = document.getElementById("status-text");

/**
 * @param {string} text
 */
function setStatus(text) {
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
        /** @type {import('lemmy-js-client').GetFederatedInstancesResponse} */
        const instances = await (
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

    chrome.storage.sync.set({
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
  const storage = await chrome.storage.sync.get(["showNsfw", "instanceDomain"]);
  if (nsfwCheckbox) {
    nsfwCheckbox.checked = storage.showNsfw;
  }
  if (domainInput) {
    domainInput.value = storage.instanceDomain ?? "";
  }
}

document.addEventListener("DOMContentLoaded", restore);
