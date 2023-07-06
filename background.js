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

let communities = [];

const setUpCommunities = async () => {
  const result = await fetch(
    `https://browse.feddit.de/communities.json?nocache=${Math.random()}`
  );
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

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
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
    filteredCommunities.map((c) => ({
      content: c.community.actor_id,
      description: `${c.community.title} (${c.community.name}@${c.url}, ${c.counts.subscribers} subs)`,
    }))
  );

  const firstCommunity = filteredCommunities[0];
  chrome.omnibox.setDefaultSuggestion({
    description: `${firstCommunity.community.title} (${firstCommunity.community.name}@${firstCommunity.url})`,
  });
});
