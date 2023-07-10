/**
 * @typedef {{ url: string, subscribers: number, monthlyActiveUsers: number, domain: string, nsfw: boolean, name: string, title: string }} Community
 */

/** @type {'$BUILD_TARGET_UNSET$' | 'chrome' | 'firefox'} */
const buildTarget = "$BUILD_TARGET_UNSET$";

const apiUrl = "https://lemmy.raicuparta.com/communities.json";
const fallbackInstanceDomain = "lemmy.ml";

if (buildTarget === "$BUILD_TARGET_UNSET$") {
  throw new Error("Build target has not been set. Set it.");
}

/** @type {Community[]} */
let communities = [];

/** @type {{ showNsfw: boolean, instanceDomain: string } | undefined} */
let storage;

/**
 * @param {string} text
 */
async function getUrlFromText(text) {
  const [name, domain] = text.split("@");

  if (domain) {
    if (storage?.instanceDomain && storage.instanceDomain !== domain) {
      return `https://${storage.instanceDomain}/c/${name}@${domain}`;
    } else {
      return `https://${domain}/c/${name}`;
    }
  }

  const firstCommunity = (await getFilteredCommunities(text))[0];

  if (firstCommunity) {
    return getCommunityUrl((await getFilteredCommunities(text))[0]);
  }

  return `${getPreferredInstanceUrl()}/search?q=${encodeURIComponent(
    text
  )}&type=Communities`;
}

function getPreferredInstanceUrl() {
  const instanceDomain = (
    storage?.instanceDomain || fallbackInstanceDomain
  ).trim();

  return `https://${
    instanceDomain.endsWith("/") ? instanceDomain.slice(0, -1) : instanceDomain
  }`;
}

function setUpInitialText() {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type the name of the Lemmy community you want to find",
  });
}

async function setUpCommunities() {
  const result = await fetch(`${apiUrl}?nocache=${Math.random()}`);

  /** @type {Community[]} */
  const communitiesJson = await result.json();

  communities = communitiesJson.sort(
    (communityA, communityB) => communityB.subscribers - communityA.subscribers
  );
}

/**
 * @param {Community} community
 */
const formatCommunity = (community) =>
  `${escapeOmniboxString(community.title)} (${getCommunityId(community)}, ${
    community.subscribers
  } subs)`;

/**
 * @param {string} text
 * @param {string} searchTerm
 */
function matches(text, searchTerm) {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedSearchTerm = searchTerm.toLocaleLowerCase();

  return normalizedText.includes(normalizedSearchTerm);
}

/**
 * @param {string} text
 */
async function getCommunity(text) {
  if (communities.length === 0) {
    await setUpCommunities();
  }
  return communities.find(
    (community) =>
      matches(community.name, text) || matches(community.title, text)
  );
}

/**
 * @param {string} text
 */
async function getFilteredCommunities(text) {
  if (communities.length === 0) {
    await setUpCommunities();
  }

  const showNsfw = (await chrome.storage.sync.get("showNsfw")).showNsfw;

  return (
    communities
      .filter(
        (community) =>
          // Negative score means no match.
          score(community, text) >= 0 &&
          // Filter out NSFW communities depending on user setting.
          (showNsfw || !community.nsfw)
      )
      // Lower positive score means closer match.
      .sort(
        (communityA, communityB) =>
          score(communityA, text) - score(communityB, text)
      )
      .slice(0, 10)
  );
}

/** @param {Community} community */
function getCommunityId(community) {
  return `${community.name}@${community.domain}`;
}

/** @param {Community} community */
function getCommunityUrl(community) {
  return storage?.instanceDomain && storage.instanceDomain !== community.domain
    ? `${getPreferredInstanceUrl()}/c/${getCommunityId(community)}`
    : community.url;
}

/**
 * @param {string} text
 */
function escapeOmniboxString(text) {
  // In Chrome, the omnibox suggestions are XML. That means we need to escape certain characters there.
  // In Firefox, the omnibox suggestions are plain text. That means we can't escape those same characters.
  if (buildTarget === "firefox") return text;

  return text.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return "";
    }
  });
}

const array = [];
const characterCodeCache = [];

/**
 * @param {string} text
 */
function normalizeText(text) {
  return text.toLowerCase().replaceAll(" ", "");
}

/**
 * @param {Community} community
 * @param {string} query
 */
function score(community, query) {
  const id = getCommunityId(community);
  const name = normalizeText(community.name);
  const title = normalizeText(community.title);
  const normalizedQuery = normalizeText(query);

  if (id === normalizedQuery) return 0;
  if (normalizedQuery.includes("@") && id.includes(normalizedQuery)) return 1;
  if (name === normalizedQuery) return 2;
  if (title === normalizedQuery) return 3;
  if (name.includes(normalizedQuery)) return 4;
  if (title.includes(normalizedQuery)) return 5;

  return -1;
}

chrome.omnibox.onInputStarted.addListener(async () => {
  setUpInitialText();
  setUpCommunities();
  storage = await chrome.storage.sync.get(["showNsfw", "instanceDomain"]);
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
