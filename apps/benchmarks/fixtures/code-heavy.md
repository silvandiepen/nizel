# Code Heavy

The following document stresses fenced code blocks, inline code, and surrounding paragraphs.

Use `npm run benchmark` to run everything.

```ts
type User = {
  id: string;
  name: string;
  roles: string[];
};

const formatUser = (user: User) => {
  return `${user.name} (${user.roles.join(', ')})`;
};
```

```html
<article>
  <h1>Example</h1>
  <p>Content with &amp; entities.</p>
</article>
```

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 1rem;
}
```

Repeat the same shape with different languages to make the fixture less tiny.

```json
{
  "name": "markdown-benchmarks",
  "private": true,
  "engines": {
    "node": ">=22"
  }
}
```

