import { importNizel, usesLocalNizel } from '../nizel-local.js';

export const name = 'nizel';

export const createNizelEngine = async () => {
  const { useNizel } = await importNizel();
  const processor = useNizel();

  return {
    name: usesLocalNizel() ? 'nizel-local' : name,
    async render(markdown) {
      return processor.html(markdown);
    },
    parse(markdown) {
      return processor.parse(markdown);
    },
  };
};
