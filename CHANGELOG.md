# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] – 2025-02-13

### Added

- Browser-based Snake game controlled by head direction (MediaPipe Face Landmarker) or keyboard
- React + Vite frontend with game board, camera panel, and head-tracking overlay
- Recalibrate and Face toggle; Game Over and Paused overlays; camera error with Retry
- Optional env vars for MediaPipe WASM and model URLs (see `frontend/.env.example`)
- ESLint and Prettier; Vitest tests for head-tracking config and game logic
- README with setup, build, deployment, privacy, and accessibility notes
- CONTRIBUTING, LICENSE (MIT), and this CHANGELOG
