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
  return (await isInstanceFederated(community.domain))
    ? `${await getPreferredInstanceUrl()}/c/${getCommunityId(community)}`
    : community.url;
}

async function isCommunityAvailableInPreferredInstance(communityId: string) {
  const preferredInstanceDomain = await getStorageValue("instanceDomain");
  if (!preferredInstanceDomain) false;

  const checkApiUrl = `https://${preferredInstanceDomain}/api/v3/community?name=${communityId}&cacheAvoidance=${Math.random()}`;

  console.log(
    `Checking if community is availably in preferred instance by fetching ${checkApiUrl}`
  );

  const result = await fetch(checkApiUrl);
  return result.ok;
}

export async function getUrlFromText(text: string) {
  const [name, domain] = text.split("@");

  if (domain) {
    const communityUrlInRemoteInstance = `https://${domain}/c/${name}`;
    const preferredInstance = await getStorageValue("instanceDomain");

    if (await isInstanceFederated(domain)) {
      const communityId = `${name}@${domain}`;
      const communityUrlInPreferredInstance = `https://${preferredInstance}/c/${communityId}`;

      if (!(await isCommunityAvailableInPreferredInstance(communityId))) {
        // If the preferred instance federates with this community's instance,
        // but the community isn't active in the preferred instance,
        // navigating to that community on our preferred instance will throw an error (likely a Lemmy bug),
        // but this will also trigger the activation of this community on our preferred instance.
        // So we navigate there once in a background tab, and then later navigate again,
        // to the hopefully now active community.
        // Sorry, I hate it too.
        console.log(
          `Trying to activate community by opening ${communityUrlInPreferredInstance} in the background`
        );
        const tab = await navigateTo(
          communityUrlInPreferredInstance,
          "newBackgroundTab"
        );
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

        if (!(await isCommunityAvailableInPreferredInstance(communityId))) {
          // If it still doesn't work, we give up and just navigate to that instance directly.
          console.log(
            `Activating community ${communityId} didn't work, navigate directly instead`
          );
          return communityUrlInRemoteInstance;
        } else {
          console.log(
            `Successfully activated ${communityId} in the preferred instance.`
          );
        }
      }

      return communityUrlInPreferredInstance;
    } else {
      return communityUrlInRemoteInstance;
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

function formatContent(suggestionContent: string) {
  // This one is really stupid. If a suggestion's content is the same as the current query text,
  // that suggestion will disappear. The sensible way to solve this would probably be using a
  // default suggestion instead of a regular suggestion. Unfortunately, Firefox has a bug that
  // makes that solution unusable: https://bugzilla.mozilla.org/show_bug.cgi?id=1166831. So my
  // workaround is to just add a space to the content space to make it different.
  // The space is removed when actually using the content text afterwards.
  return `${suggestionContent} `;
}

chrome.omnibox.onInputStarted.addListener(async () => {
  setUpInitialText();
  setUpCommunities();
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  setUpInitialText();

  const filteredCommunities = await getFilteredCommunities(text);

  if (filteredCommunities.length === 0) {
    suggest([
      {
        content: formatContent(text),
        description: `Found nothing. Search on ${
          (await getStorageValue("instanceDomain")) || fallbackInstanceDomain
        } instead?`,
      },
    ]);
    return;
  }

  suggest(
    await Promise.all(
      filteredCommunities.map(async (community) => ({
        content: formatContent(getCommunityId(community)),
        description: await formatCommunity(community),
      }))
    )
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
  const url = await getUrlFromText(text.trim());
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
