# StudyPlay

A clearly branded educational page with full-length local video playback and two original, locally authored games: Star Orchard (science and observation) and Tile Tangle (patterns and spatial reasoning). Their artwork and gameplay are created in the project using CSS and canvas; the page does not load external game embeds, images, or scripts.

Choose video files from your device to play their full duration using the browser's native controls, including seeking and fullscreen. Files are not uploaded or saved by the page and are removed from the library when the page is closed. Playback depends on browser codec support; MP4 and WebM are commonly supported. Only choose videos you own or are authorized to use.

The games are original and locally hosted. There is no sign-in, tracking, proxy, or URL obfuscation. This project does not bypass network or school access controls; follow the rules of the network where it is used.

## Run locally

Open `index.html` in a browser, or start a local server from this folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

The game catalog includes subject filtering and search. Star Orchard opens in a responsive game window with keyboard and touch movement, restart, loading/status messages, and fullscreen support. Tile Tangle is an endless block-placement puzzle: matching groups clear, and if the board runs out of moves it refreshes while preserving the score.
