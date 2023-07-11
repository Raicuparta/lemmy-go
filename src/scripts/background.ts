import {
  Community,
  formatCommunity,
  getCommunityId,
  getFilteredCommunities,
  setUpCommunities,
} from "./communities.js";
import { getStorageValue } from "./storage.js";

const fallbackInstanceDomain = "lemmy.ml";

function setUpInitialText() {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type the name of the Lemmy community you want to find",
  });
}

async function getPreferredInstanceUrl() {
  const instanceDomain = (
    (await getStorageValue("instanceDomain")) || fallbackInstanceDomain
  ).trim();

  return `https://${
    instanceDomain.endsWith("/") ? instanceDomain.slice(0, -1) : instanceDomain
  }`;
}

async function getCommunityUrl(community: Community) {
  const instanceDomain = await getStorageValue("instanceDomain");
  return instanceDomain && instanceDomain !== community.domain
    ? `${getPreferredInstanceUrl()}/c/${getCommunityId(community)}`
    : community.url;
}

export async function getUrlFromText(text: string) {
  const [name, domain] = text.split("@");

  if (domain) {
    const instanceDomain = await getStorageValue("instanceDomain");
    if (instanceDomain && instanceDomain !== domain) {
      return `https://${instanceDomain}/c/${name}@${domain}`;
    } else {
      return `https://${domain}/c/${name}`;
    }
  }

  const firstCommunity = (await getFilteredCommunities(text))[0];

  if (firstCommunity) {
    return getCommunityUrl(firstCommunity);
  }

  return `${getPreferredInstanceUrl()}/search?q=${encodeURIComponent(
    text
  )}&type=Communities`;
}

chrome.omnibox.onInputStarted.addListener(async () => {
  setUpInitialText();
  setUpCommunities();
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text) {
    setUpInitialText();
    return;
  }

  const filteredCommunities = await getFilteredCommunities(text);

  if (filteredCommunities.length === 0) {
    chrome.omnibox.setDefaultSuggestion({
      description: `Failed to find any Lemmy communities.`,
    });
    return;
  }

  suggest(
    filteredCommunities.map((community) => ({
      content: getCommunityId(community),
      description: formatCommunity(community),
    }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const url = await getUrlFromText(text);

  switch (disposition) {
    case "currentTab":
      chrome.tabs.update({ url });
      break;
    case "newForegroundTab":
      chrome.tabs.create({ url });
      break;
    case "newBackgroundTab":
      chrome.tabs.create({ url, active: false });
      break;
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});