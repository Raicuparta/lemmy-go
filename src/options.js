const settingsForm = document.getElementById("settings-form");
const nsfwCheckbox = document.getElementById("nsfw-checkbox");
const domainInput = document.getElementById("domain-input");

if (settingsForm) {
  settingsForm.onsubmit = (event) => {
    event.preventDefault();
    chrome.storage.sync.set({
      showNsfw: nsfwCheckbox && nsfwCheckbox.checked,
      instanceDomain: domainInput
        ? domainInput.value || domainInput.placeholder
        : undefined,
    });
  };
}

async function restore() {
  const storage = await chrome.storage.sync.get(["showNsfw", "instanceDomain"]);
  if (nsfwCheckbox) {
    nsfwCheckbox.checked = storage.showNsfw;
  }
  if (domainInput && storage.instanceDomain) {
    domainInput.placeholder = storage.instanceDomain;
  }
}

document.addEventListener("DOMContentLoaded", restore);
