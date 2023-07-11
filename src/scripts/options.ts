import { getStorage, writeStorage } from "./storage";

const nsfwCheckbox = document.getElementById(
  "nsfw-checkbox"
) as HTMLInputElement;
const domainInput = document.getElementById("domain-input") as HTMLInputElement;
const saveButton = document.getElementById("save-button") as HTMLButtonElement;
const resetButton = document.getElementById(
  "reset-button"
) as HTMLButtonElement;

if (saveButton) {
  saveButton.onclick = () => {
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
