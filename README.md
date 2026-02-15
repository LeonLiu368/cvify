# SnakeCV

A browser-based snake game controlled by head direction using MediaPipe Face Landmarker. Play with your face or with the keyboard.

## Tech stack

- **React** + **Vite** for the frontend
- **MediaPipe Face Landmarker** for head/nose tracking in the browser
- No backend: camera and face detection run entirely in the browser. No video or face data is sent to any server.

## Prerequisites

- **Node.js** 18 or later
- A modern browser with camera access and `getUserMedia` support (Chrome, Firefox, Safari, Edge)
- **HTTPS or localhost** is required for camera access (browsers block `getUserMedia` on plain HTTP except on localhost)

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown in the terminal (typically http://localhost:5173).

## Build

```bash
cd frontend
npm run build
```

Output is written to `frontend/dist/`. Serve that folder with any static file server. To test the production build locally:

```bash
npm run preview
```

## Deployment

The production build outputs to `frontend/dist/`. Serve that directory with any static file server (e.g. nginx, GitHub Pages, Netlify, or S3). If the app is served from a subpath (e.g. `https://example.com/snakecv/`), set `base: '/snakecv/'` in `frontend/vite.config.js` and rebuild.

## Controls

- **Head direction**: Move your nose (or face) up/down/left/right to steer the snake. The game mirrors your movement so it feels natural.
- **Keyboard**: Arrow keys or WASD work as well and are full alternatives to head control.
- **Start**: Begin or resume the game.
- **Pause**: Pause the game.
- **Recalibrate**: Reset the “center” position for head tracking if the snake drifts.
- **Face toggle**: Turn head tracking on or off (keyboard still works when off).

## Browser support

Camera access requires a secure context (HTTPS or localhost). See [caniuse.com/getusermedia](https://caniuse.com/getusermedia) for support. MediaPipe runs in the browser via WebAssembly.

## Privacy

The camera is used only in your browser. Video and face landmark data are processed locally by MediaPipe. Nothing is recorded or sent to any server.

## Accessibility

The game is fully playable with the keyboard (arrow keys or WASD); head tracking is optional. If the camera is unavailable or you turn the Face toggle off, you can still play. Overlays (e.g. Game Over, Paused, camera error) are labeled for screen readers and the Retry button is focusable.

## License

See [LICENSE](LICENSE) in this repository.
