# Working on 未来城 · FUTURE CITY

## After finishing any change

Post the html-preview link for the home page in the chat, so the change can be
looked at without cloning anything:

https://html-preview.github.io/?url=https://github.com/RickyW247/Chinese-City-1st-Project/blob/main/index.html

It renders whatever is on `main`, so push first — otherwise the link shows the
previous version. For a change on another branch, swap `main` in the URL for the
branch name. For a page other than the home page, swap `index.html` for that file.

## The site

Static HTML, one file per page, no build step. `assets/site.css` and
`assets/site.js` are shared by every page; `assets/auth.js` and `assets/admin.js`
carry the browser-local login and page editor. `ADMIN.md` explains the editing and
publishing flow for whoever is running the site.

`future-city.html` and `future-city-atlas.html` are older self-contained copies —
they do not load the shared assets and nothing links to them.
