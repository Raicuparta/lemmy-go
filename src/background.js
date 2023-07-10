/**
 * @typedef {{ url: string, subscribers: number, monthlyActiveUsers: number, domain: string, nsfw: boolean, name: string, title: string }} Community
 */

/** @type {'$BUILD_TARGET_UNSET$' | 'chrome' | 'firefox'} */
const buildTarget = "$BUILD_TARGET_UNSET$";

const apiUrl = "https://lemmy.raicuparta.com/communities.json";

if (buildTarget === "$BUILD_TARGET_UNSET$") {
  throw new Error("Build target has not been set. Set it.");
}

/** @type {Community[]} */
let communities = [];

/**
 * @param {string} text
 */
async function getUrlFromText(text) {
  if (text.startsWith("http")) return text;

  return (await getFilteredCommunities(text))[0]?.url;
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
  `${escapeOmniboxString(community.title)} (${community.name}@${
    community.domain
  }, ${community.subscribers} subs)`;

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
 * @param {Community} community
 * @param {string} query
 */
function score(community, query) {
  const name = community.name.toLowerCase();
  const title = community.title.toLowerCase();
  const normalizedQuery = query.toLocaleLowerCase();

  if (name === normalizedQuery) return 0;
  if (title === normalizedQuery) return 1;
  if (name.includes(normalizedQuery)) return 2;
  if (title.includes(normalizedQuery)) return 3;

  return -1;
}

chrome.omnibox.onInputStarted.addListener(() => {
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
      content: community.url,
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
