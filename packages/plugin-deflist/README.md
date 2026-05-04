# nizel-plugin-deflist

Definition list support for [Nizel](https://npmjs.com/package/nizel).

## Install

```bash
npm install nizel-plugin-deflist
```

## Usage

```ts
import { useNizel } from 'nizel';
import { deflistPlugin } from 'nizel-plugin-deflist';

const nizel = useNizel({
  plugins: [deflistPlugin()],
});

const html = await nizel.html(`Term
: Definition`);
```

## Syntax

```md
Term
: Definition

Other term
: First definition
: Second definition
```

The plugin converts definition-list syntax into an internal Nizel custom block before parsing. It does not require disabling safe mode.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | - | Optional CSS class on the generated `<dl>`. |

## Output

```html
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

## License

MIT
