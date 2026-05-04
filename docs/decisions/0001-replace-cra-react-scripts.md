# 0001. Evaluate Replacing CRA / React Scripts

Date: 2026-05-04

Status: Proposed

## Context

The app currently builds through `react-scripts@3.0.1`, wrapped by
`scripts/react-scripts.js` so current Node versions can pass
`--openssl-legacy-provider` when needed. The lockfile keeps the build stack on
Webpack 4, Jest 24, Babel loader 8, Workbox 4, and a patched Sass path
(`sass@1.77.8` plus `sass-loader@10.5.2`). The app is otherwise a client-only
React 16.8 SPA with React Router v5, Redux, SCSS modules, root-relative imports
from `src`, and backend API calls rooted at `/api`.

Create React App is now deprecated for new apps. The React team recommends that
existing apps migrate either to a framework or to a maintained build tool such
as Vite, Parcel, or Rsbuild when a framework is not a good fit. This repository
already owns routing, data fetching, and API integration at the app/server
boundary, so a full framework migration would add more product architecture
change than issue #4 requires.

## Decision

Migrate away from CRA/react-scripts. Prefer Vite for the implementation path,
with one prerequisite: align the supported Node runtime before adopting the
latest Vite major. Current Vite documentation requires Node 20.19+ or 22.12+,
while this repo currently declares `node >=14.0.0`.

The recommended path is:

1. Keep CRA only as a short-term maintenance bridge.
2. In a follow-up implementation PR, migrate to Vite once the Node support
   policy is raised, or explicitly choose an older Vite major as a temporary
   bridge if the project must keep older Node support.
3. Preserve the existing runtime shape: single-page static app, `/api` backend
   proxy in development, `BrowserRouter`, and production HTML fallback routing.

## Options Compared

| Option | Benefits | Costs and risks | Effort |
| --- | --- | --- | --- |
| Stay on CRA/react-scripts | Lowest immediate change. Existing scripts, `proxy`, `PUBLIC_URL`, Webpack loader syntax, and Jest integration continue to work. | Toolchain remains deprecated and old. The wrapper only addresses current Node/OpenSSL execution, not Webpack 4, Jest 24, old Babel assumptions, or future dependency maintenance. Sass already needs overrides to stay modern. | 0.5-1 day for documentation and small maintenance fixes, but ongoing drag remains. |
| Migrate to Vite | Maintained build tool, fast dev server, modern production bundling, first-class React template, built-in CSS modules, SCSS support through `sass`, explicit dev proxy support, raw asset query support, and configurable production output. | Requires replacing CRA conventions for HTML entry, `%PUBLIC_URL%`, absolute imports, Webpack `raw-loader`, Sass `~` imports, test runner setup, and production build output compatibility. Latest Vite also requires a higher Node baseline than the repo currently declares. | 2-4 focused implementation days plus server/deployment QA. |

## Migration Risk Review

### Routing

Current app routes are defined in `src/index.js` with `BrowserRouter` and paths
for `/scratch-paper/:gistId`, `/:categoryKey/:algorithmKey`, and `/`. This can
continue under Vite, but production hosting must still serve `index.html` for
deep links. CRA documents this requirement for pushState routers, and Vite's dev
server also treats `index.html` as the app entry. No router rewrite is required,
but the migration must verify direct loads for all three route shapes.

Risk: medium. The client code is portable; deployment fallback behavior is the
thing to preserve.

### SCSS Modules

The app imports many `*.module.scss` files and one global `src/stylesheet.scss`.
Vite supports CSS modules and SCSS preprocessing, and the repo already uses Dart
Sass. The migration still needs two checks:

- Every SCSS file imports `~common/stylesheet/index`, which is a Webpack-era
  resolution convention. Prefer rewriting those imports to
  `common/stylesheet/index` with an alias to `src`, or configure a temporary
  alias for `~common`.
- `src/common/stylesheet/colors.scss` and `dimensions.scss` use `:export`, and
  renderers read exported values such as `styles.colorPatched`. Verify Vite's
  CSS module output preserves those keys.

Risk: medium. Styling should migrate cleanly, but class names and exported ICSS
values need visual and unit smoke coverage.

### Absolute Imports

CRA honors `jsconfig.json` with `baseUrl: "src"`, and this app relies on imports
like `components/App`, `common/util`, `core/tracers`, `reducers`, `files`, and
`i18n`. Vite needs equivalent resolution through `resolve.alias`, built-in
`resolve.tsconfigPaths` where available, or a tsconfig-paths plugin for older
Vite majors.

Risk: medium. The mapping is straightforward, but import resolution failure will
break most source files at startup.

### Proxy Behavior

`package.json` currently uses CRA's `"proxy": "http://localhost:8080"`. App
code calls relative `/api/...` URLs through `src/apis/index.js`, and the JS
tracer worker is created from `/api/tracers/js/worker`. Vite does not read CRA's
package-level `proxy`; it needs explicit `server.proxy` entries, at minimum for
`/api`.

Risk: medium. The implementation is small, but it must preserve local
development against both the local server and the documented temporary remote
server flow in `CONTRIBUTING.md`.

### Tests

No `src/**/*.test.*`, `src/**/*.spec.*`, or `setupTests.*` files are present.
CRA's `npm test` currently means Jest 24 through react-scripts if tests are
added later. A Vite migration should choose a maintained replacement explicitly:
prefer Vitest plus jsdom for Vite-native unit tests, or keep standalone Jest if
compatibility with older React test tooling is more important.

Risk: low for current migration blockers, medium for future coverage. The lack
of tests reduces migration friction but leaves little safety net.

### Production Build Output

CRA writes to `build/`, injects built assets into `public/index.html`, substitutes
`%PUBLIC_URL%`, and copies `public/` assets. Vite defaults to `dist/`, keeps
`public/` for static assets, and expects root `index.html` as source. To avoid
deployment churn, configure Vite output to `build/` and decide whether to mimic
CRA's `static/` asset nesting or update the server/deploy assumptions.

The migration must also preserve the custom server-side placeholders currently
in `public/index.html`: `$TITLE`, `$DESCRIPTION`, and `$ALGORITHM`. Those are
not CRA features, so they should remain test cases in the Vite build comparison.
Replace `%PUBLIC_URL%` references with root-absolute paths or Vite base-aware
HTML handling.

Risk: high. The generated files are the most likely place for server integration
regressions.

## Recommended Follow-up Tasks

1. Confirm the Node support target. Prefer raising engines/CI to match the
   latest Vite requirement before the migration PR.
2. Add Vite dependencies and config: `vite`, `@vitejs/plugin-react`, aliases for
   the current `src` import roots, `server.proxy` for `/api`, and
   `build.outDir: "build"`.
3. Move or recreate `public/index.html` as root `index.html`, add the Vite
   module entry script, remove `%PUBLIC_URL%`, and verify `$TITLE`,
   `$DESCRIPTION`, and `$ALGORITHM` still survive for server replacement.
4. Replace `require('!raw-loader!...')` in `src/files/index.js` with Vite-native
   raw imports or `import.meta.glob(..., { query: "?raw", import: "default",
   eager: true })`.
5. Replace SCSS `~common/...` imports with Vite-compatible imports, then verify
   CSS module keys and `:export` values used by chart/rendering code.
6. Replace `react-scripts` scripts with `vite`, `vite build`, and the chosen test
   command. Remove `scripts/react-scripts.js`, `react-scripts`, `raw-loader`, and
   the Sass loader override when no longer needed.
7. Add at least smoke coverage for route rendering, raw skeleton file loading,
   `/api` proxy-backed flows, and one SCSS-module renderer that consumes
   exported color values.
8. Compare CRA and Vite production builds before merging: file layout,
   placeholder preservation, direct deep-link fallback, `/api` worker behavior,
   source map policy, asset caching paths, and browser support target.

## Sources

- Issue #4: <https://github.com/yuyu1815/algorithm-visualizer/issues/4>
- React: Sunsetting Create React App:
  <https://react.dev/blog/2025/02/14/sunsetting-create-react-app>
- Create React App: proxying API requests in development:
  <https://create-react-app.dev/docs/proxying-api-requests-in-development/>
- Create React App: absolute imports:
  <https://create-react-app.dev/docs/importing-a-component/#absolute-imports>
- Create React App: serving apps with client-side routing:
  <https://create-react-app.dev/docs/deployment/#serving-apps-with-client-side-routing>
- Vite: getting started, Node requirement, and HTML entry:
  <https://vite.dev/guide/>
- Vite: CSS modules, raw imports, and static assets:
  <https://vite.dev/guide/features.html>
- Vite: proxy configuration:
  <https://vite.dev/config/server-options.html#server-proxy>
- Vite: build output options:
  <https://vite.dev/config/build-options.html#build-outdir>
