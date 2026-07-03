export type OpenIconPluginMode = 'inline-svg' | 'semantic';

export type OpenIconMarkdownOptions = {
  label?: string;
  size?: number | string;
  color?: string;
  fill?: string;
  fillSecondary?: string;
  stroke?: string;
  strokeSecondary?: string;
  opacity?: number | string;
  strokeWidth?: number | string;
  className?: string;
};

export type OpenIconPluginOptions = {
  mode?: OpenIconPluginMode;
  className?: string;
  defaultSize?: number | string;
  defaultColor?: string;
  aliases?: Record<string, string>;
  validateIcons?: boolean;
  collectMetadata?: boolean;
  strict?: boolean;
};

export type OpenIconUsage = {
  name: string;
  original?: string;
  label?: string;
  options: Record<string, string | number | boolean>;
};

export type OpenIconMetadata = {
  openIcon: {
    icons: OpenIconUsage[];
  };
};

export type ParsedOpenIconExpression = {
  name: string;
  options: OpenIconMarkdownOptions;
};

export type ResolvedOpenIcon = {
  name: string;
  original?: string;
  error?: string;
};

export type NormalizedOpenIconPluginOptions = Required<Omit<OpenIconPluginOptions, 'defaultColor'>> & {
  defaultColor?: string;
};
