# Baltic Beyblade Association — Static Competition Hub

BBA is a **fully static** Beyblade coverage website, designed around compact esports-style information panels (news, matches, results, events and rankings). It uses original BBA branding and does not copy HLTV's branding or assets.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Three-column editorial homepage |
| `news.html` | News posts |
| `matches.html` | Scheduled fixtures |
| `results.html` | Completed matches |
| `rankings.html` | Separate Beyblade X / Metal Fight / Burst rankings, with Baltic country filters |
| `tournaments.html` | Upcoming and past event calendar |
| `rules.html` | Competition rulebook status |
| `about.html` | Community overview |
| `404.html` | Friendly missing-page explanation |

## Data management (no backend)

Edit these repository files and commit changes. Cloudflare Pages deploys automatically from `main`.

- `news-data.js` → `window.bbaNews`: published news objects with `date`, `title`, `summary`, optionally `body` array.
- `tournaments-data.js` → `window.bbaTournaments`: `date`, `time`, `name`, `city`, `country` (`LV`/`LT`/`EE`), `format` (`X`/`Metal Fight`/`Burst`), `ranked`, optional `link`.
- `rankings-data.js` → `window.bbaRankings`: separate `x`, `metal`, `burst` arrays with `name`, `country`, `events`, `points`.
- `matches-data.js` → `window.bbaMatches`: `upcoming` and `results` arrays, each item `date`, `time` (optional), `format`, `player1`, `player2`, `event` (optional). Completed results require numeric `score1` and `score2`.

All four data sources start empty. **Do not invent tournament results, rankings or news.** Publish verified information only. Rankings are manually maintained; the site makes no claim to calculate official tournament points.

The interface is implemented in `site.js` and `style.css`. No frameworks, build tools, dynamic APIs, login cookies, databases or server-side functions are required.

## Test locally

Open this folder with VS Code Live Server, or run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Account system removal

The former account, profile and settings frontend pages **and all Cloudflare Pages Functions** were removed from the published branch. They are preserved in the Git branch:

`backup/auth-site-before-static-redesign-20261031`

The **Cloudflare D1 database itself was not deleted or modified**. It is dormant; you may unbind/delete it separately later only if you decide you no longer need the old account data. Do not delete it casually.

## Disclaimer

BBA is an independent fan community serving Latvia, Lithuania and Estonia, not an official sports federation or affiliate of Takara Tomy or Hasbro.
