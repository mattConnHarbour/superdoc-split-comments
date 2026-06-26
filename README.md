# SuperDoc Review UI Demo

Small Vite/React demo showing split comments UI behavior:

- SuperDoc `1.42.0`
- comments configured with `displayMode: 'inline'`, then rendered in a custom sidebar
- tracked changes rendered inline with compact inline popovers
- when a tracked change also has an associated comment, clicking the inline tracked-change decoration opens the tracked-change popover and focuses the matching sidebar comment
- comment-only anchors focus the sidebar comment without showing an inline comment popover
- content control chrome is hidden

## Run locally

```bash
npm ci
npm run dev
```

Then open:

```text
http://127.0.0.1:4182/
```

## Build

```bash
npm run build
```

## Files of interest

- `src/App.tsx` wires SuperDoc, extracts comments from the headless comments API, and coordinates tracked-change/comment focus behavior.
- `src/styles.css` contains the demo layout and the CSS guard that suppresses comment-only inline popovers while preserving tracked-change popovers.
- `public/docs/tracked-changes-comments-test.docx` is the sample document loaded by default.
