"use strict";
const nsfwCheckbox = document.getElementById("nsfw-checkbox");
const domainInput = document.getElementById("domain-input");
const saveButton = document.getElementById("save-button");
const resetButton = document.getElementById("reset-button");
if (saveButton) {
    saveButton.onclick = () => {
        chrome.storage.sync.set({
            showNsfw: nsfwCheckbox && nsfwCheckbox.checked,
            instanceDomain: domainInput?.value?.trim() || undefined,
        });
    };
}
else {
    console.error("Failed to find save button");
}
if (resetButton) {
    resetButton.onclick = async () => {
        chrome.storage.sync.clear();
        restore();
    };
}
else {
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
