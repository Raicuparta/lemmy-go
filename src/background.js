/**
 * @typedef {{ url: string } & import('lemmy-js-client').CommunityView} Community
 */

/** @type {'$BUILD_TARGET_UNSET$' | 'chrome' | 'firefox'} */
const buildTarget = "$BUILD_TARGET_UNSET$";

const apiUrl = "https://browse.feddit.de/communities.json";

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

  return (await getFilteredCommunities(text))[0]?.community.actor_id;
}

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

async function setUpCommunities() {
  const result = await fetch(`${apiUrl}?nocache=${Math.random()}`);

  /** @type {Community[]} */
  const communitiesJson = await result.json();

  communities = communitiesJson.sort(
    (communityA, communityB) =>
      communityB.counts.subscribers - communityA.counts.subscribers
  );
}

function setUpInitialText() {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type the name of the Lemmy community you want to find",
  });
}

chrome.omnibox.onInputStarted.addListener(() => {
  setUpInitialText();
  setUpCommunities();
});

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
    ({ community }) =>
      matches(community.name, text) || matches(community.title, text)
  );
}

/**
 * @param {string} text
 */
async function getFilteredCommunities(text) {
  if (communities.length === 0) {
    chrome.omnibox.setDefaultSuggestion({
      description: `Looking for Lemmy communities...`,
    });
    await setUpCommunities();
  }
  return communities.filter(
    ({ community }) =>
      matches(community.name, text) || matches(community.title, text)
  );
}

/**
 * @param {string} text
 */
function escapeOmniboxString(text) {
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
    filteredCommunities
      // Ignore the first element, since it's gonna show as the default suggestion instead.
      .slice(1)
      .map((community) => ({
        content: community.community.actor_id,
        description: formatCommunity(community),
      }))
  );

  const firstCommunity = filteredCommunities[0];
  chrome.omnibox.setDefaultSuggestion({
    description: formatCommunity(firstCommunity),
  });
});

/**
 * @param {Community} community
 */
const formatCommunity = (community) =>
  `${escapeOmniboxString(community.community.title)} (${
    community.community.name
  }@${community.url}, ${community.counts.subscribers} subs)`;

console.log("info", chrome.runtime.getPlatformInfo());
