# 未来城 · FUTURE CITY

A city that never chose between the temple and the server farm — paper lanterns
strung beside the fibre that feeds them, and a dragon over the exchange district
that was awake long before you got here.

It is a website about a place that does not exist, written down as though it does.
Eight hand-built pages, no framework, no build step.

## Look at it

Rendered straight from `main`, nothing to install:

**[Open the home page](https://html-preview.github.io/?url=https://github.com/RickyW247/Chinese-City-1st-Project/blob/main/index.html)**

To preview any other page, swap `index.html` at the end of that URL for the file
you want. To preview a branch, swap `main`.

## Run it locally

```
git clone https://github.com/RickyW247/Chinese-City-1st-Project.git
cd Chinese-City-1st-Project
```

Then open `index.html` in a browser. That is the whole setup — there is no
package to install, nothing to compile, and no server to start. Every page is a
plain `.html` file that runs on its own.

A local server is only worth it if you want the audio to seek reliably:

```
python3 -m http.server 8000     # then visit http://localhost:8000
```

## The pages

| File | What it is |
|---|---|
| `index.html` | The observation deck on Deck 41 — the way in, and the map of the plate |
| `lantern-quarter.html` | 灯 · Street level, and who decides what the light looks like |
| `floating-market.html` | 市 · Six generations on the same stretch of water |
| `river-dragon.html` | 龙 · The broadcast nobody turns off |
| `sky-harbor.html` | 空 · Altitude 400m, and what still bows to the wind |
| `temple-towers.html` | 塔 · Monks upstairs, servers below, one staircase between |
| `ink-canals.html` | 墨 · Four hundred years of brushwork, now written by the water |
| `the-build.html` | The room it was actually made in, and what is running under it |

`future-city.html` and `future-city-atlas.html` are earlier self-contained drafts.
They carry their own inline styles and scripts, share nothing with the rest of the
site, and nothing links to them. They are kept for history.

## How it is put together

```
index.html, *.html      one file per page, each standing on its own
assets/site.css         every visual rule the site has
assets/site.js          every behaviour the site has
assets/auth.js          browser-local accounts and the greeting
assets/admin.js         the in-page editor and its export
assets/admin.css        styling for the account menu, modals and editor bar
```

Each page links `site.css` and `site.js` and sets its own `--accent` colours on
`<body>`, which is how a quarter takes on its own palette without a stylesheet of
its own.

## What is moving on the page

Most of the atmosphere is drawn at runtime rather than shipped as images:

- **The dragon** — a helix coiling the full length of the page, redrawn as you
  scroll so only one screen of it is ever painted
- **Ambient depth** — dust, rain in the air, and droplets catching on the glass,
  each particle carrying a z depth so near things move faster and read brighter
- **The storm** — sheet lightning behind the ridge, occasionally close enough to
  draw a bolt
- **Scroll solids** — faceted charms that wake once you leave the hero and spin
  faster the faster you scroll
- **Hero rain**, a cursor glow, tilting cards, spinning glyph cubes, scrambling
  text, counting meters and a ticker

All of it stands down under `prefers-reduced-motion`, and thins out on phones.

## Editing the site

There is a browser-based editor built in: sign in, and an admin can click straight
into any text on the page, reorder or delete items, swap the hero image and accent
colours, then export the finished `.html` file.

**[`ADMIN.md`](ADMIN.md) explains the whole flow** — first run, what each control
does, and how to publish what you changed. Read the top of it before relying on
the login for anything: accounts live in the visitor's own browser, so the sign-in
is a greeting and an editor key, **not** access control. Never put anything
private behind it.

## A note on the audio

`Tobu Song Copyrighted.mp4` is the ambient track, and the filename is not a joke —
it is included for local playback while working on the site. Sort out licensing
before putting this anywhere public.

## Built by

Ayaan Saharia · Ricky Wong · Alexander MacLeod

Written in one room, mostly at night, mostly while somebody was saying the coil
looked wrong.
