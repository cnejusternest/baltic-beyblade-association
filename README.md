# Baltic Beyblade Association (BBA) Website
A clean, responsive starter website for the Baltic Beyblade Association, made with plain HTML, CSS, and JavaScript. No build tools or external dependencies are needed.

## How to open in VS Code

1. Extract this ZIP folder.
2. Open the `bba-website` folder in Visual Studio Code.
3. Open `index.html`.
4. Right-click the file and choose **Open with Live Server** (if you have the Live Server extension). Or double-click `index.html` to open it in your browser.

## Site pages

- `index.html` — Homepage (shows the 3 newest news posts)
- `news.html` — All news posts
- `news-data.js` — Edit this file to add news posts
- `tournaments.html` — Tournaments (upcoming and past events)
- `tournaments-data.js` — Edit this file to add tournaments
- `rankings.html` — Player rankings for Beyblade X, Metal Fight, and Burst (with country filters)
- `rankings-data.js` — Edit this file to add real player results to each format
- `rules.html` — Rules (rulebook not published yet)
- `about.html` — About BBA
- `style.css` — All the styling
- `script.js` — Mobile menu, black/white theme toggle, footer year, news lists, interactive ranking tabs and leaderboards
- `assets/bba-logo.png` — Your BBA logo

## Important

The rankings and tournament pages are intentionally empty — there are no made-up players, events or scores. The rules page is a **draft placeholder**, not a final approved BBA rulebook.

This is a static website. Adding automated player accounts, registrations, or a live ranking database will require a backend or other service later.

You can host this version on GitHub Pages or any basic static site host.

## Adding tournaments

Open `tournaments-data.js` and add an event to the `window.bbaTournaments` list:

```js
{ date: "2026-11-15", time: "14:00", name: "BBA Riga Open #1", city: "Riga", country: "LV", format: "X", ranked: true, link: "https://..." }
```

Events dated today or later appear under upcoming tournaments (soonest first); older ones move to past events automatically. The homepage shows the next 5. `time`, `name` and `link` are optional.

## Adding news

Open `news-data.js` and add a post to the `window.bbaNews` list:

```js
{ date: "2026-11-15", title: "Post title", summary: "Short summary.", body: ["Paragraph one.", "Paragraph two."] }
```

Posts are sorted by date automatically, newest first. The homepage shows the 3 newest; `news.html` shows all of them. `body` is optional.

## Adding real ranked players

Open `rankings-data.js`. Add entries inside the appropriate array: `x`, `metal`, or `burst`. For example, the structure of a *fictional* entry is:

```js
{ name: "Example Player", country: "LV", events: 3, points: 120 }
```

The site sorts by points automatically and gives tied scores the same rank number. Country choices are `LV` (Latvia), `LT` (Lithuania), and `EE` (Estonia). The filter does not change the overall rank position. Only add verified player data after the BBA ranking points system is established.

The tabs can be linked directly using `rankings.html#x`, `rankings.html#metal`, and `rankings.html#burst`.

**Note:** This is a static site; scores and event counts do not update themselves from tournament results. There is no live database.
BBA authentication configuration updated.
