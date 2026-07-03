# nizel-plugin-open-icon

Render [Open Icon](https://open-icon.org/) SVGs from compact inline Markdown.

The plugin uses the local `open-icon` package as its source. It never calls the Open Icon API, fetches remote SVGs, or makes Markdown preview rendering depend on network access.

## Installation

```bash
npm install nizel-plugin-open-icon open-icon
```

## Basic Usage

```ts
import { useNizel } from 'nizel';
import { openIconPlugin } from 'nizel-plugin-open-icon';
import 'nizel-plugin-open-icon/style.css';

const nizel = useNizel({
  plugins: [openIconPlugin()],
});

const result = await nizel('# Document\n\n:open-icon(ui/search-m) Search');
```

## Syntax

```md
:open-icon(ui/search-m)
:open-icon(ui/check-m, label="Success")
:open-icon(ui/search-m, size="1.25em")
:open-icon(ui/search-m, color="currentColor")
:open-icon(ui/search-m, strokeWidth=2)
:open-icon(ui/search-m, label="Search", size="1.25em", color="currentColor")
```

Only `:open-icon(...)` is supported. Generic `:icon(...)` syntax is intentionally left for a future multi-library plugin.

## Default Inline SVG Rendering

```md
# Document

:open-icon(ui/search-m) Search

:open-icon(ui/check-m, label="Done") Done
```

Output shape:

```html
<h1>Document</h1>

<p>
  <span class="nizel-open-icon" data-icon="ui/search-m" aria-hidden="true">
    <svg><!-- Open Icon SVG --></svg>
  </span>
  Search
</p>

<p>
  <span class="nizel-open-icon" data-icon="ui/check-m" role="img" aria-label="Done">
    <svg><!-- Open Icon SVG --></svg>
  </span>
  Done
</p>
```

The default size is `1em`, so icons inherit the surrounding text size. The plugin does not emit `data-size` for the default size.

## Accessibility

Icons without `label` are decorative:

```html
<span class="nizel-open-icon" data-icon="ui/search-m" aria-hidden="true">...</span>
```

Icons with `label` are exposed as images:

```html
<span class="nizel-open-icon" data-icon="ui/search-m" role="img" aria-label="Search">...</span>
```

The plugin does not render both `aria-hidden` and `aria-label` on the same icon.

## Aliases

```ts
const nizel = useNizel({
  plugins: [
    openIconPlugin({
      aliases: {
        search: 'ui/search-m',
        check: 'ui/check-m',
      },
    }),
  ],
});
```

```md
:open-icon(search)
:open-icon(check, label="Done")
```

Metadata records both the original alias and resolved icon name.

## Styling

```ts
import 'nizel-plugin-open-icon/style.css';
```

The stylesheet is intentionally small:

```css
.nizel-open-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  line-height: 1;
}
```

Use the inline options for per-icon Open Icon variables:

```md
:open-icon(ui/search-m, color="currentColor", strokeWidth=2)
```

## Metadata

With `collectMetadata: true`, render results include used icons:

```ts
const result = await nizel(':open-icon(search, label="Search", size="1.25em")');

console.log(result.meta.openIcon);
```

```ts
{
  icons: [
    {
      name: 'ui/search-m',
      original: 'search',
      label: 'Search',
      options: {
        size: '1.25em',
      },
    },
  ],
}
```

## Security

The plugin validates icon name shape and escapes labels, classes, `data-*` attributes, and SVG transform attributes.

```md
:open-icon(ui/search-m, label="<script>alert(1)</script>")
```

renders the label as escaped text in `aria-label`; it does not create executable HTML.

Invalid or missing icons render a safe missing placeholder unless `strict: true` is set.

## Offline Rendering Guarantee

`inline-svg` mode reads SVG strings from the installed `open-icon` package through its synchronous local catalog. Rendering does not call `fetch`, does not load remote URLs, and does not output Open Icon API URLs.

## Semantic Mode

Host apps that replace icons themselves can use semantic mode:

```ts
const nizel = useNizel({
  plugins: [
    openIconPlugin({
      mode: 'semantic',
    }),
  ],
});
```

```md
:open-icon(ui/search-m, label="Search")
```

```html
<span class="nizel-open-icon" data-icon="ui/search-m" role="img" aria-label="Search"></span>
```

Semantic mode still validates names and collects metadata. It does not fetch external resources.
