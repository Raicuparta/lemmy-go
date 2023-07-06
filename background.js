chrome.omnibox.onInputEntered.addListener(async (text) => {
  chrome.tabs.update({ url: text });
  return;

  if (!selectedUrl) {
    const community = await getCommunity(text);
    if (!community) return;

    chrome.tabs.update({ url: community.community.actor_id });
  }

  chrome.tabs.update({ url: selectedUrl });
  selectedUrl = '';
});

let selectedUrl = '';
let communities = [];

const setUpCommunities = async () => {
  const result = await fetch(`https://browse.feddit.de/communities.json?nocache=${Math.random()}`)
  communities = (await result.json()).sort((communityA, communityB) => communityB.counts.subscribers -  communityA.counts.subscribers);
}

chrome.omnibox.onInputStarted.addListener(setUpCommunities);

/**
 * @param {string} text
 * @param {string} searchTerm
 */
const matches = (text, searchTerm) => {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedSearchTerm = searchTerm.toLocaleLowerCase();

  return normalizedText.includes(normalizedSearchTerm);
}

const getCommunity = async (text) => {
  if (communities.length === 0) {
    await setUpCommunities();
  }
  return communities.find(({ community }) => matches(community.name, text) || matches(community.title, text));
}

const getCommunities = async (text) => {
  if (communities.length === 0) {
    await setUpCommunities();
  }
  return communities.filter(({ community }) => matches(community.name, text) || matches(community.title, text));
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
      }
  });
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  selectedUrl = '';
  chrome.omnibox.setDefaultSuggestion({
    description: `<dim>Searching for communities...</dim>`,
  });

  const filteredCommunities = await getCommunities(text);
  const community = await getCommunity(text);

  // const community = json.communities[0]?.community;
  if (!community) {
    chrome.omnibox.setDefaultSuggestion({
      description: `<dim>No community found</dim>`,
    });
    selectedUrl = '';
    return;
  }

  chrome.omnibox.setDefaultSuggestion({
      description: `<url>${community.community.actor_id}</url>`,
  });
  
  suggest(filteredCommunities.map(c => ({
    content: c.community.actor_id,
    description: `<match>${escapeXml(c.community.title)}</match> <dim>(${c.url}|${c.community.name}, ${c.counts.subscribers} subs)</dim>`,
  })));

  selectedUrl = community.community.actor_id;
}
) 
