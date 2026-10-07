/**
 * A sanitized, serializable representation of a table cell's HTML.
 * Every piece of text and every link in the source cell is preserved;
 * only the tag vocabulary is restricted so it can be rendered safely.
 */
export type CellNode =
  | { type: "text"; text: string }
  | { type: "link"; href: string; children: CellNode[] }
  | { type: "image"; src: string | null; alt: string }
  | { type: "break" }
  | { type: "details"; summary: CellNode[]; children: CellNode[] }
  | { type: "format"; tag: FormatTag; children: CellNode[] };

export type FormatTag =
  | "strong"
  | "em"
  | "code"
  | "sub"
  | "sup"
  | "del"
  | "u"
  | "span"
  | "div";

export interface CellLink {
  label: string;
  href: string;
}

export interface JobFlags {
  /** 🔥 FAANG+ company */
  faang: boolean;
  /** 🎓 Advanced degree required */
  advancedDegree: boolean;
  /** 🛂 Does NOT offer sponsorship */
  noSponsorship: boolean;
  /** 🇺🇸 Requires U.S. citizenship */
  usCitizenship: boolean;
  /** 🔒 Application is closed */
  closed: boolean;
}

export interface Job {
  /** Stable identity used to cross-reference the applications CSV. */
  id: string;
  categoryId: string;
  categoryTitle: string;
  /** Position within its category, in README order. */
  position: number;
  /** Every cell of the source row, keyed by the table's column header. */
  cells: Record<string, CellNode[]>;

  company: string;
  companyUrl: string | null;
  /** The README wrote "↳", meaning "same company as the row above". */
  isContinuation: boolean;
  role: string;
  locations: string[];
  applyUrl: string | null;
  simplifyUrl: string | null;
  links: CellLink[];
  age: string;
  /** Age converted to days, when it could be understood. */
  ageDays: number | null;
  flags: JobFlags;
}

export interface Category {
  id: string;
  /** e.g. "Software Engineering" */
  title: string;
  /** e.g. "💻" */
  emoji: string;
  /** The full heading, e.g. "💻 Software Engineering Internship Roles" */
  heading: string;
  columns: string[];
  jobs: Job[];
  /** The count the README advertises for this category, if it does. */
  expectedCount: number | null;
  /** e.g. "🔒 See 100 more closed roles →" */
  closedRolesLink: CellLink | null;
}

export interface LegendEntry {
  symbol: string;
  meaning: string;
}

export interface Board {
  categories: Category[];
  jobs: Job[];
  /** Union of every category's columns, in order of first appearance. */
  columns: string[];
  legend: LegendEntry[];
  /** "Browse 1867 Internship Roles by Category" → 1867 */
  expectedTotal: number | null;
}
