# Wellness Village

A virtual townhall for junior lawyers, played in the browser. Static files only, no build step.

## Host on GitHub Pages
1. Create a repository and upload the contents of this folder to its root (keep `.nojekyll`).
2. Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/`.

## Run locally
Serve the folder over HTTP (opening index.html straight from disk will not load the modules):

    npx serve .
    # or
    python3 -m http.server

## Files
- `index.html` — the village
- `lpa-go-art.js` — pixel art for the map and characters
- `lpa-go-music.js` — the LPA GO! soundtrack, synthesised in the browser (no audio files). Music starts on the first click or key press; the Music button under the map turns it on or off.
- `support.js`, `ds/` — runtime and the Classical design system styles

Requires internet access for React (unpkg) and Google Fonts. Progress is saved only in the browser's localStorage.
