import { clearStorage, getStorageValue, writeStorage } from "./storage.js";
import { getFederatedInstances } from "./federated-instances.js";
import { getCommunities } from "./communities.js";
import { getElement } from "./get-element.js";

const nsfwCheckbox = getElement<HTMLInputElement>("nsfw-checkbox");
const domainInput = getElement<HTMLInputElement>("domain-text-input");
const domainSelect = getElement<HTMLSelectElement>("domain-select");
const saveButton = getElement<HTMLButtonElement>("save-button");
const resetButton = getElement<HTMLButtonElement>("reset-button");
const statusText = getElement<HTMLInputElement>("status-text");

function setStatus(text: string) {
  if (!statusText) {
    throw new Error("Couldn't find status text element");
  }
  statusText.innerText = text;
}

async function setUpNsfwSetting() {
  const showNsfw = await getStorageValue("showNsfw");
  nsfwCheckbox.checked = showNsfw;
}

async function setUpDomainSetting() {
  const preferredDomain = await getStorageValue("instanceDomain");
  console.log("preferred domain is", preferredDomain);

  domainInput.value = preferredDomain;

  domainSelect.onchange = () => {
    domainInput.value = domainSelect.value;
  };

  const instanceSet = new Set<string>();
  for (const community of await getCommunities()) {
    instanceSet.add(community.domain);
  }

  const instanceArray = [...instanceSet];

  for (const instance of instanceArray.sort()) {
    const option = document.createElement("option");
    option.innerText = instance;
    option.value = instance;
    domainSelect.appendChild(option);
  }

  domainSelect.selectedIndex = instanceArray.indexOf(preferredDomain) + 1;
}

function onResetClick() {
  clearStorage();
  onReady();
}

async function onSaveClick() {
  const domain = domainInput.value.trim() || "";
  if (domain) {
    setStatus("Validating instance...");
    try {
      const federatedInstances = await getFederatedInstances(domain, true);
      setStatus(`Success!
Blocked instances: ${federatedInstances.blocked.length}
Linked instances: ${federatedInstances.linked.length}
Allowed instances: ${federatedInstances.allowed.length}`);
    } catch (error) {
      setStatus(`Error validating this instance domain: ${error}`);
    }
  }

  writeStorage({
    showNsfw: nsfwCheckbox && nsfwCheckbox.checked,
    instanceDomain: domainInput?.value?.trim() || "",
  });

  if (!domain) {
    setStatus("Settings saved.");
  }
}

async function onReady() {
  setUpNsfwSetting();
  setUpDomainSetting();
  resetButton.onclick = onResetClick;
  saveButton.onclick = onSaveClick;
}

document.addEventListener("DOMContentLoaded", onReady);
