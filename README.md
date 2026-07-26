# Connections Dictionary

A small Manifest V3 Chrome extension that shows definitions while you play the New York Times Connections game.

## What it does

- Click a Connections word card and a compact definition appears beside it.
- Keeps the normal game-card click behavior intact.
- Shows pronunciation and examples when the dictionary provides them.
- Caches lookups for seven days.
- Offers Merriam-Webster and Oxford links when a card is a name, phrase, abbreviation, or piece of wordplay.
- Runs only on the NYT Connections pages and sends only the clicked word to the dictionary service.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.
5. Open or refresh [NYT Connections](https://www.nytimes.com/games/connections) and click a word card.

After editing the extension, use the reload button on its `chrome://extensions` card and refresh the game tab.

## Dictionary choice

The first version uses [Free Dictionary API](https://dictionaryapi.dev/) so it works without an account or secret key. Merriam-Webster is the strongest fit for an authoritative general U.S. dictionary, but its API requires developer registration, has non-commercial and request-limit conditions, and requires its official branding. It is therefore not bundled silently into this prototype.

## Development

Run the parser tests with:

```sh
npm test
```

No packages or build step are required.
