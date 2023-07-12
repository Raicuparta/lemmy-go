import {
  Community,
  formatCommunity,
  getCommunityId,
  getFilteredCommunities,
  setUpCommunities,
} from "./communities.js";
import { isInstanceFederated } from "./federated-instances.js";
import { getStorageValue } from "./storage.js";

const fallbackInstanceDomain = "lemmy.ml";

function setUpInitialText() {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type the name of the Lemmy community you want to find",
  });
}

// TODO pick a better name for this, "preferred instance" should only be the user-picked one,
// but this one has a fallback.
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

  return (await isInstanceFederated(community.domain)) &&
    instanceDomain &&
    instanceDomain !== community.domain
    ? `${await getPreferredInstanceUrl()}/c/${getCommunityId(community)}`
    : community.url;
}

async function isCommunityAvailableInPreferredInstance(communityId: string) {
  const preferredInstanceDomain = await getStorageValue("instanceDomain");
  const result = await fetch(
    `https://${preferredInstanceDomain}/api/v3/community?name=${communityId}`
  );
  return result.ok;
}

export async function getUrlFromText(text: string) {
  const [name, domain] = text.split("@");

  if (domain) {
    const preferredInstance = await getStorageValue("instanceDomain");

    if (await isInstanceFederated(domain)) {
      const communityId = `${name}@${domain}`;
      const communityUrl = `https://${preferredInstance}/c/${communityId}`;

      if (!(await isCommunityAvailableInPreferredInstance(communityId))) {
        // If the preferred instance federates with this community's instance,
        // but the community isn't active in the preferred instance,
        // navigating to that community on our preferred instance will throw an error (likely a Lemmy bug),
        // but this will also trigger the activation of this community on our preferred instance.
        // So we navigate there once in a background tab, and then later navigate again,
        // to the hopefully now active community.
        // Sorry, I hate it too.
        console.log(
          `Activating community by opening ${communityUrl} in the background`
        );
        const tab = await navigateTo(communityUrl, "newBackgroundTab");
        await new Promise((resolve, reject) => {
          chrome.tabs.onUpdated.addListener(function onTabUpdated(
            tabId: number,
            changeInfo
          ) {
            if (tab.id !== tabId || changeInfo.status !== "complete") return;

            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            chrome.tabs.remove(tab.id);
            resolve(null);
          });
        });
      }

      return communityUrl;
    } else {
      return `https://${domain}/c/${name}`;
    }
  }

  const firstCommunity = (await getFilteredCommunities(text))[0];

  if (firstCommunity) {
    return await getCommunityUrl(firstCommunity);
  }

  return `${await getPreferredInstanceUrl()}/search?q=${encodeURIComponent(
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

async function navigateTo(
  url: string,
  disposition: chrome.omnibox.OnInputEnteredDisposition
) {
  switch (disposition) {
    case "currentTab":
      return await chrome.tabs.update({ url });
    case "newForegroundTab":
      return await chrome.tabs.create({ url });
    case "newBackgroundTab":
      return await chrome.tabs.create({ url, active: false });
  }
}

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  console.log(`Entered text: ${text}`);
  const url = await getUrlFromText(text);
  console.log(`Text resulted in URL: ${url}`);

  const tab = await navigateTo(url, disposition);
  chrome.tabs.onUpdated.addListener(function onTabUpdated(tabId: number) {
    if (tab.id !== tabId) return;

    chrome.tabs.onUpdated.removeListener(onTabUpdated);
    if (tab.status === "complete") {
      navigateTo(url, disposition);
    }
  });
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});
