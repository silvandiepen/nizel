export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red';

export type BadgeMarkdownOptions = {
  tone?: BadgeTone | string;
  title?: string;
  className?: string;
};

export type BadgeAlias = {
  label?: string;
  tone?: BadgeTone;
};

export type BadgePluginOptions = {
  className?: string;
  defaultTone?: BadgeTone;
  allowedTones?: BadgeTone[];
  collectMetadata?: boolean;
  aliases?: Record<string, BadgeAlias>;
};

export type BadgeUsage = {
  label: string;
  tone: BadgeTone;
  original?: string;
  title?: string;
};

export type BadgeMetadata = {
  badge: {
    badges: BadgeUsage[];
  };
};

export type ParsedBadgeExpression = {
  label: string;
  options: BadgeMarkdownOptions;
};

export type NormalizedBadgePluginOptions = {
  className: string;
  defaultTone: BadgeTone;
  allowedTones: BadgeTone[];
  collectMetadata: boolean;
  aliases: Record<string, BadgeAlias>;
};
