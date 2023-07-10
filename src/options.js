const nsfwCheckbox = document.getElementById("nsfw-checkbox");
if (nsfwCheckbox) {
  nsfwCheckbox.onchange = handleNsfwChange;
}

async function restore() {
  if (!nsfwCheckbox) return;

  nsfwCheckbox.checked = (await chrome.storage.sync.get("showNsfw")).showNsfw;
}

async function handleNsfwChange() {
  const checked = nsfwCheckbox && nsfwCheckbox.checked;

  await chrome.storage.sync.set({ showNsfw: checked });
}

document.addEventListener("DOMContentLoaded", restore);
