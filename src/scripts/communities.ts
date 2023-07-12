import { buildTarget } from "./build-target.js";
import { getStorageValue } from "./storage.js";

export interface Community {
  url: string;
  subscribers: number;
  monthlyActiveUsers: number;
  domain: string;
  nsfw: boolean;
  name: string;
  title: string;
}

const apiUrl = "https://lemmy.raicuparta.com/communities.json";

let communities: Community[] = [];

export async function setUpCommunities() {
  const result = await fetch(`${apiUrl}?nocache=${Math.random()}`);

  const communitiesJson = (await result.json()) as Community[];

  communities = communitiesJson.sort(
    (communityA, communityB) => communityB.subscribers - communityA.subscribers
  );
}

export async function getCommunities() {
  if (communities.length === 0) {
    await setUpCommunities();
  }

  return communities;
}

export const formatCommunity = (community: Community) =>
  `${escapeOmniboxString(community.title)} (${getCommunityId(community)}, ${
    community.subscribers
  } subs)`;

export async function getFilteredCommunities(text: string) {
  if (communities.length === 0) {
    await setUpCommunities();
  }

  const showNsfw = await getStorageValue("showNsfw");

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

export function getCommunityId(community: Community) {
  return `${community.name}@${community.domain}`;
}

function escapeOmniboxString(text: string) {
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

function normalizeText(text: string) {
  return text.toLowerCase().replace(/ /g, "");
}

function score(community: Community, query: string) {
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
