/**
 * @typedef {{ url: string } & import('lemmy-js-client').CommunityView} Community
 */

const apiUrl = "https://browse.feddit.de/communities.json";

/**
 * @param {string} text
 */
const getUrlFromText = async (text) => {
  if (text.startsWith("http")) return text;

  return (await getCommunities(text))[0]?.community.actor_id;
};

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

/**
 * @type {Community[]}
 */
let communities = [];

const setUpCommunities = async () => {
  const result = await fetch(`${apiUrl}?nocache=${Math.random()}`);
  communities = (await result.json()).sort(
    (communityA, communityB) =>
      communityB.counts.subscribers - communityA.counts.subscribers
  );
};

const setUpInitialText = () => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type the name of the Lemmy community you want to find",
  });
};

chrome.omnibox.onInputStarted.addListener(() => {
  setUpInitialText();
  setUpCommunities();
});

/**
 * @param {string} text
 * @param {string} searchTerm
 */
const matches = (text, searchTerm) => {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedSearchTerm = searchTerm.toLocaleLowerCase();

  return normalizedText.includes(normalizedSearchTerm);
};

/**
 * @param {string} text
 */
const getCommunity = async (text) => {
  if (communities.length === 0) {
    await setUpCommunities();
  }
  return communities.find(
    ({ community }) =>
      matches(community.name, text) || matches(community.title, text)
  );
};

const getCommunities = async (text) => {
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
};

/**
 * @param {string} text
 */
function escapeXml(text) {
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

  const filteredCommunities = await getCommunities(text);

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
  `${escapeXml(community.community.title)} (${community.community.name}@${
    community.url
  }, ${community.counts.subscribers} subs)`;
