export interface SiteRoute {
  path: string;
  title: string;
  description: string;
  navLabel?: string;
  priority: number;
  changefreq: "weekly" | "monthly" | "yearly";
}
