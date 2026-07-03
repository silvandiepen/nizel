export type PrintControlType =
  | 'pagebreak'
  | 'pagebreak-before'
  | 'pagebreak-after'
  | 'keep'
  | 'print-only'
  | 'screen-only'
  | 'no-print'
  | 'print-wide';

export type PrintPluginOptions = {
  injectCss?: boolean;
  collectMetadata?: boolean;
  classPrefix?: string;
};

export type NormalizedPrintPluginOptions = Required<PrintPluginOptions>;

export type PrintMetadata = {
  print: {
    controls: Array<{
      type: PrintControlType;
    }>;
    settings?: PrintSettings;
  };
};

export type PrintSettings = {
  title?: string;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape';
  margins?: string;
  showDate?: boolean;
  showUrl?: boolean;
};
