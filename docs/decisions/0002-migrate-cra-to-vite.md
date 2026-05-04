# 0002. Migrate CRA / React Scripts to Vite

Date: 2026-05-04

Status: Accepted

## Context

Issue #21 tracks removal of the temporary Sass loader shim that was added while
the app still built through CRA 3 and `react-scripts`. That shim rerouted CRA's
hidden `sass-loader` lookup to a local loader using Dart Sass's modern API. It
was only a bridge for the deprecated CRA build path, not a permanent project
build layer.

## Decision

The active build path now uses Vite. `npm start` runs the Vite dev server,
`npm run build` runs `vite build`, and `npm test` runs Vitest with jsdom. Vite
handles SCSS through the maintained Sass integration and raw text imports through
`?raw`, so the local Sass loader hook, CRA wrapper, `react-scripts`,
`raw-loader`, and `sass-loader` override are no longer needed.

The Vite config preserves the existing app shape: root-relative static assets,
`build/` production output, absolute imports from `src`, `/api` dev proxying to
`http://localhost:8080` by default, and the server-side `$TITLE`,
`$DESCRIPTION`, and `$ALGORITHM` placeholders in the HTML entry.

## Migration Notes

- To proxy local development to the production API temporarily, run
  `VITE_API_PROXY_TARGET=https://algorithm-visualizer.org npm start` instead of
  editing `package.json`.
- The previous CRA-compatible `npm test -- --watchAll=false` command remains
  accepted by the Vitest wrapper for CI and issue verification workflows.
- React files that contain JSX now use the `.jsx` extension, matching Vite's
  standard JSX handling instead of CRA's historical `.js` convention.
- SCSS imports now use `common/stylesheet/index` with `src` as a Sass load path,
  replacing the Webpack-specific `~common/...` convention.
