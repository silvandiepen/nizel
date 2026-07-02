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
    { alertPlugin },
    { deflistPlugin },
    { typographyPlugin },
    { mathPlugin },
    { footnotesPlugin },
    { diagramsPlugin },
  ] = await Promise.all([
    importPlugin('plugin-alert', 'nizel-plugin-alert'),
    importPlugin('plugin-deflist', 'nizel-plugin-deflist'),
    importPlugin('plugin-typography', 'nizel-plugin-typography'),
    importPlugin('plugin-math', 'nizel-plugin-math'),
    importPlugin('plugin-footnotes', 'nizel-plugin-footnotes'),
    importPlugin('plugin-diagrams', 'nizel-plugin-diagrams'),
  ]);

  return [
    alertPlugin(),
    deflistPlugin(),
    typographyPlugin(),
    mathPlugin(),
    footnotesPlugin(),
    diagramsPlugin(),
  ];
};

const importPlugin = async (workspaceName, packageName) => {
  if (usesLocalNizel()) {
    return import(new URL(`../../../../packages/${workspaceName}/dist/index.js`, import.meta.url));
  }
  return import(packageName);
};
