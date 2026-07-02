# nizel-plugin-sanitize

Rendered HTML sanitizer for [Nizel](https://npmjs.com/package/nizel).

The plugin adds a final `afterRender` pass that removes script/style blocks, inline event handlers, and `javascript:` URLs. It is intended as an extra hardening layer for native app and WebView contexts.

The browser build exposes `NizelSanitize` from `dist/sanitize.iife.js`.

## Install

```bash
npm install nizel-plugin-sanitize
```

## Usage

```ts
import { useNizel } from 'nizel';
import { sanitizePlugin } from 'nizel-plugin-sanitize';

const nizel = useNizel({
  plugins: [sanitizePlugin()],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowRawHtml` | `boolean` | `false` | When `true`, disables Nizel's core safe rendering option, while this plugin still removes the risky patterns it knows about. |

## Notes

This plugin is intentionally small and deterministic. It is not a full browser-grade HTML sanitizer. For untrusted hostile HTML, combine it with platform-level WebView restrictions or a dedicated sanitizer in the host environment.

## License

MIT
