import { importNizel, usesLocalNizel } from '../nizel-local.js';

export const name = 'nizel';

export const createNizelEngine = async () => {
  const { useNizel } = await importNizel();
  const processor = useNizel();
  const kitchenSinkProcessor = useNizel({ plugins: await createKitchenSinkPlugins() });

  return {
    name: usesLocalNizel() ? 'nizel-local' : name,
    async render(markdown) {
      return processorFor(markdown).html(markdown);
    },
    parse(markdown) {
      return processorFor(markdown).parse(markdown);
    },
  };

  function processorFor(markdown) {
    return isKitchenSink(markdown) ? kitchenSinkProcessor : processor;
  }
};

const isKitchenSink = (markdown) => {
  return markdown.includes('title: Markdown Kitchen Sink') || markdown.includes('# Markdown Kitchen Sink');
};

const createKitchenSinkPlugins = async () => {
  const [
    { abbrPlugin },
    { alertPlugin },
    { autolinkPlugin },
    { citationsPlugin },
    { codeCopyPlugin },
    { deflistPlugin },
    { detailsPlugin },
    { typographyPlugin },
    { mathPlugin },
    { emojiPlugin },
    { footnotesPlugin },
    { frontmatterUiPlugin },
    { headingAnchorsPlugin },
    { mediaPlugin },
    { sanitizePlugin },
    { shikiPlugin },
    { tocPlugin },
    { diagramsPlugin },
  ] = await Promise.all([
    importPlugin('plugin-abbr', 'nizel-plugin-abbr'),
    importPlugin('plugin-alert', 'nizel-plugin-alert'),
    importPlugin('plugin-autolink', 'nizel-plugin-autolink'),
    importPlugin('plugin-citations', 'nizel-plugin-citations'),
    importPlugin('plugin-code-copy', 'nizel-plugin-code-copy'),
    importPlugin('plugin-deflist', 'nizel-plugin-deflist'),
    importPlugin('plugin-details', 'nizel-plugin-details'),
    importPlugin('plugin-typography', 'nizel-plugin-typography'),
    importPlugin('plugin-math', 'nizel-plugin-math'),
    importPlugin('plugin-emoji', 'nizel-plugin-emoji'),
    importPlugin('plugin-footnotes', 'nizel-plugin-footnotes'),
    importPlugin('plugin-frontmatter-ui', 'nizel-plugin-frontmatter-ui'),
    importPlugin('plugin-heading-anchors', 'nizel-plugin-heading-anchors'),
    importPlugin('plugin-media', 'nizel-plugin-media'),
    importPlugin('plugin-sanitize', 'nizel-plugin-sanitize'),
    importPlugin('plugin-shiki', 'nizel-plugin-shiki'),
    importPlugin('plugin-toc', 'nizel-plugin-toc'),
    importPlugin('plugin-diagrams', 'nizel-plugin-diagrams'),
  ]);

  return [
    abbrPlugin(),
    alertPlugin(),
    autolinkPlugin({
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
    citationsPlugin(),
    deflistPlugin(),
    detailsPlugin(),
    typographyPlugin(),
    mathPlugin(),
    emojiPlugin(),
    footnotesPlugin(),
    frontmatterUiPlugin(),
    headingAnchorsPlugin(),
    mediaPlugin(),
    sanitizePlugin(),
    shikiPlugin(),
    tocPlugin(),
    diagramsPlugin(),
    codeCopyPlugin(),
  ];
};

const importPlugin = async (workspaceName, packageName) => {
  if (usesLocalNizel()) {
    return import(new URL(`../../../../packages/${workspaceName}/dist/index.js`, import.meta.url));
  }
  return import(packageName);
};
