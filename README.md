# Lemmy Go

[Lemmy Go](https://lemmy.raicuparta.com) is a extension that adds a new search keyword ("lg") for more easily navigating to Lemmy communities.

## Install

[Get for Firefox](https://addons.mozilla.org/firefox/addon/lemmy-go/)

[Get for Chrome](https://chrome.google.com/webstore/detail/lemmy-go/amgdefojimfhhbdphmlbljkgohoeldaf)

## Usage

Type "lg" followed by a space (some browsers also accept tab instead), and then type the name of the community you're looking for.

Example: "lg firefox"

Lemmy Go will search its database for any community that has the text "firefox" in its name (e.g. "linux_gaming") or title ("Linux Gaming").

If you just type a community name and press enter, Lemmy Go will take you to the most popular community from that list.

If you don't press enter right away, you will be shown a list of communities that match that query. You can then select the specific one you want.

### Settings

Clicking the extension's icon will show a popup with some settings that can be adjusted, including the user's preferred instance, and a toggle for NSFW communities.

### Preferred Instance

If you set your preferred instance in the user settings, Lemmy Go will try its best to navigate to that community in your preferred instance, although this isn't always possible (in which case Lemmy Go will just navigate to the remote instance instead).

For instance, if your preferred instance is set to "lemmy.ml" and you select "firefox@lemmy.world", Lemmy Go will take you to "lemmy.ml/c/firefox@lemmy.world".

But if "lemmy.ml" blocks the "lemmy.world" instance, then Lemmy Go will take you to "lemmy.world/c/firefox" instead.

### Filtering by instance

If you include a "@" in your query, you're able to filter by instance too. For instance "lg firefox@lemmy.world".

## Why is this needed?

On Reddit, I had a simple search keyword for navigating directly to subreddits, where I could just type "r firefox" and be taken to "reddit.com/r/firefox".

I wanted to have the same behaviour for Lemmy, but the Fediverse makes this a lot more complicated. Even if you're constantly writing the full community name@instance pair, there's still the problem of errors when navigating to blocked instances, or instance links that are broken for whatever reason.

So I made this extension to try and make it as simply as possible to jump to a community, or even find new ones more easily.

## Why is it kinda slow?

The Fediverse SUCKS. No but yeah it sucks. If you select a preferred instance in Lemmy Go, everything will be a bit slower.

- I have to make some API calls to check whether it's possible to stay in your preferred instance, instead of navigating to a separate instance.
- If you try to navigate to a community that hasn't been linked to your preferred instance, then Lemmy Go opens a background tab that triggers the link (I know), before finally taking you there.

## Permissions

I tried to keep permissions to a minimum. Unfortunately, some instances have misconfigured CORS policies on their API endpoints, which means I need to ask for permission to access those domains, which makes the browser show a spooky "I will steal everything from this domain" prompt.

The only reason I need to make API calls to your preferred instance is for fetching the list of blocked instances (so I can navigate directly to that blocked instance instead).
