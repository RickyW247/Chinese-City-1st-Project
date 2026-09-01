# 未来城 — accounts and editing

## Read this first

The login runs **entirely in the visitor's own browser**. Accounts live in that
browser's `localStorage`. That means:

- It greets people by name and unlocks the editor. That is what it is for.
- It is **not access control.** Anyone can read `assets/auth.js`, open devtools,
  or simply edit the `.html` files. Never put anything private behind it.
- Accounts do not travel between browsers, devices, or people. Your admin
  account on your laptop does not exist on anyone else's machine.

If you later need real logins — accounts that work for everyone, from any
device, that a visitor cannot bypass — that needs a server. See
**Upgrading to real logins** at the bottom.

## First run

1. Open any page, click **Sign in** (top right).
2. Choose **Create account**. The first account created becomes the **admin** —
   there is no default password to forget or leak.
3. You are greeted as `Hello <your name>` in the top bar from then on.

Everyone else who registers becomes a **member**: they get the greeting, and
nothing else. Promote or delete them under *Site & users*.

## Editing a page

Signed in as an admin, open the account menu → **Edit this page**.

| Control | What it does |
|---|---|
| Click any text | Type straight into it — headings, copy, chips, table cells, meter values |
| `↑` `↓` on an item | Reorder a card, row, tier, log entry, table row, chip |
| `⧉` on an item | Duplicate it as the basis for a new one |
| `✕` on an item | Delete it |
| **+ add …** | Append a new item to that list |
| **Media & colour** | Swap the hero image, the audio track, and the two accent colours |
| **Ticker & markers** | Edit the ticker lines, and the plate markers on the home page, as JSON |
| **Save** | Store changes in this browser |
| **Export page** | Download the finished `.html` file |
| **Revert page** | Throw away stored changes and go back to the file on disk |
| **Done** | Leave edit mode |

Edit mode survives reloads and page changes, so you can work through the site in
one session.

## Making changes permanent

**Save** only writes to your browser. Nobody else sees it. To publish:

1. **Save**, then **Export page** — you get the real `.html` file, with all
   runtime scaffolding (editor bar, cubes, markers, animation spans) stripped
   back out, so it looks like the original hand-written file.
2. Replace the matching file in the site folder with the downloaded one.
3. Do this per page you changed. *Site & users* lists which pages have unpublished
   edits.
4. Once the file is replaced, use **Revert page** to clear the now-redundant
   browser copy.

New images must be placed in the site folder yourself; the editor only stores
the filename. Spaces in filenames need to be written `%20`.

## Upgrading to real logins

When this needs to be genuine:

- **Static host + CMS (usual answer).** Decap CMS with Netlify Identity, or
  Cloudflare Access in front of an `/admin` path. Real accounts, password reset,
  roles; edits commit back to the site's files. Needs the project in a git repo
  and a free account.
- **Own backend.** Node/Express with bcrypt password hashing, signed session
  cookies, CSRF tokens, and content in a database or JSON files. Full control;
  you host and maintain it.

The editor UI here is deliberately separate from where content is stored, so
either path can reuse it: swap the `localStorage` calls in `assets/admin.js` for
`fetch()` calls to your API.

## Files

| File | Role |
|---|---|
| `assets/auth.js` | Accounts, PBKDF2 password hashing, session, the greeting |
| `assets/admin.js` | Editor, structure tools, export |
| `assets/admin.css` | Styling for the account menu, modals and editor bar |

Passwords are never stored in plain text: each account gets a random 16-byte
salt and a PBKDF2-SHA256 hash (150,000 iterations) via WebCrypto, falling back
to iterated SHA-256 where WebCrypto is unavailable. That is good practice, but it
does not change the paragraph at the top — the check still happens on the
visitor's own machine.
