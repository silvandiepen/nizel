export type KbdPlatform = 'macos' | 'windows' | 'linux' | 'auto';

export type KbdPluginOptions = {
  platform?: KbdPlatform;
  className?: string;
  separatorClassName?: string;
  groupClassName?: string;
  collectMetadata?: boolean;
  aliases?: Record<string, string>;
};

export type NormalizedKbdPluginOptions = Required<KbdPluginOptions>;

export type KbdShortcutUsage = {
  original: string;
  resolved: string;
  keys: string[];
};

export type KbdMetadata = {
  kbd: {
    shortcuts: KbdShortcutUsage[];
  };
};
