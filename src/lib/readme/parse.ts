import type {
  Board,
  Category,
  CellLink,
  CellNode,
  FormatTag,
  Job,
  JobFlags,
  LegendEntry,
} from "./types";

/** Relative links in the README resolve against the file's GitHub page. */
export const README_BASE_URL =
  "https://github.com/SimplifyJobs/Summer2027-Internships/blob/dev/README.md";

const CONTINUATION_MARK = "↳";

const FORMAT_TAGS: Record<string, FormatTag> = {
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  code: "code",
  sub: "sub",
  sup: "sup",
  del: "del",
  s: "del",
  strike: "del",
  u: "u",
  div: "div",
  p: "div",
  center: "div",
};

/* -------------------------------------------------------------------------- */
/*                               Cell conversion                              */
/* -------------------------------------------------------------------------- */

function safeUrl(raw: string | null, allowMailto: boolean): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), README_BASE_URL);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    if (allowMailto && url.protocol === "mailto:") return url.href;
  } catch {
    // Not a URL we can resolve; the caller keeps the text without the link.
  }
  return null;
}

function convertChildren(parent: Node): CellNode[] {
  const out: CellNode[] = [];
  parent.childNodes.forEach((child) => out.push(...convertNode(child)));
  return out;
}

function convertNode(node: Node): CellNode[] {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    const text = node.textContent ?? "";
    return text ? [{ type: "text", text }] : [];
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return [];

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "br":
      return [{ type: "break" }];
    case "a": {
      const children = convertChildren(el);
      const href = safeUrl(el.getAttribute("href"), true);
      return href ? [{ type: "link", href, children }] : children;
    }
    case "img":
      return [
        {
          type: "image",
          src: safeUrl(el.getAttribute("src"), false),
          alt: el.getAttribute("alt") ?? "",
        },
      ];
    case "details": {
      const summaryEl = Array.from(el.children).find(
        (c) => c.tagName.toLowerCase() === "summary",
      );
      const children: CellNode[] = [];
      el.childNodes.forEach((child) => {
        if (child !== summaryEl) children.push(...convertNode(child));
      });
      return [
        {
          type: "details",
          summary: summaryEl ? convertChildren(summaryEl) : [],
          children,
        },
      ];
    }
    case "script":
    case "style":
    case "template":
      return [];
    default: {
      // Unknown tags are flattened rather than dropped so no text is lost.
      const formatTag = FORMAT_TAGS[tag] ?? "span";
      return [{ type: "format", tag: formatTag, children: convertChildren(el) }];
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                              Cell inspection                               */
/* -------------------------------------------------------------------------- */

interface TextOptions {
  /** Leave out <summary> text (e.g. "4 locations"). */
  skipSummary?: boolean;
  /** Use an image's alt text in place of the image. */
  imageAlt?: boolean;
}

export function textOf(nodes: CellNode[], options: TextOptions = {}): string {
  let out = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out += node.text;
        break;
      case "break":
        out += "\n";
        break;
      case "image":
        if (options.imageAlt) out += node.alt;
        break;
      case "details":
        if (!options.skipSummary) out += textOf(node.summary, options) + "\n";
        out += textOf(node.children, options);
        break;
      case "link":
      case "format":
        out += textOf(node.children, options);
        break;
    }
  }
  return out;
}

export function linksOf(nodes: CellNode[]): CellLink[] {
  const out: CellLink[] = [];
  for (const node of nodes) {
    if (node.type === "link") {
      const label = textOf(node.children, { imageAlt: true }).trim();
      out.push({ label, href: node.href });
    } else if (node.type === "format") {
      out.push(...linksOf(node.children));
    } else if (node.type === "details") {
      out.push(...linksOf(node.summary), ...linksOf(node.children));
    }
  }
  return out;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map(collapse)
    .filter(Boolean);
}

/** "0d" → 0, "3w" → 21, "1mo" → 30, "1y" → 365. */
export function parseAgeDays(age: string): number | null {
  const match = /^(\d+)\s*(d|w|mo|m|y|yr)$/i.exec(age.trim());
  if (!match) return null;
  const n = Number(match[1]);
  switch (match[2].toLowerCase()) {
    case "d":
      return n;
    case "w":
      return n * 7;
    case "mo":
    case "m":
      return n * 30;
    default:
      return n * 365;
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/** Pull the leading emoji (if any) off a heading. */
function splitHeading(heading: string): { emoji: string; title: string } {
  const match = /^([^\p{L}\p{N}]+?)\s+(.*)$/u.exec(heading.trim());
  const emoji = match ? match[1].trim() : "";
  const rest = match ? match[2] : heading.trim();
  const title = rest.replace(/\s+internship roles?$/i, "").trim() || rest;
  return { emoji, title };
}

/** Strip tracking parameters so the same posting always maps to one id. */
function canonicalUrl(href: string): string {
  try {
    const url = new URL(href);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_/i.test(key) || key === "ref") url.searchParams.delete(key);
    }
    url.hash = "";
    return url.href;
  } catch {
    return href;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Table parsing                                */
/* -------------------------------------------------------------------------- */

interface RawTable {
  columns: string[];
  /** Each row is a list of cells; each cell is a list of nodes. */
  rows: CellNode[][][];
}

function parseTable(html: string): RawTable {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return { columns: [], rows: [] };

  let headerCells = Array.from(table.querySelectorAll("thead th"));
  const allRows = Array.from(table.querySelectorAll("tr"));
  if (headerCells.length === 0) {
    const firstWithTh = allRows.find((tr) => tr.querySelector("th"));
    headerCells = firstWithTh ? Array.from(firstWithTh.querySelectorAll("th")) : [];
  }
  const columns = headerCells.map((th, i) => collapse(th.textContent ?? "") || `Column ${i + 1}`);

  const rows: CellNode[][][] = [];
  for (const tr of allRows) {
    const tds = Array.from(tr.children).filter((c) => c.tagName.toLowerCase() === "td");
    if (tds.length === 0) continue;
    rows.push(tds.map((td) => convertChildren(td)));
  }
  return { columns, rows };
}

function findColumn(columns: string[], name: RegExp): string | null {
  return columns.find((c) => name.test(c)) ?? null;
}

function buildJob(
  cells: Record<string, CellNode[]>,
  columns: string[],
  category: { id: string; title: string },
  position: number,
  previousCompany: { name: string; url: string | null } | null,
): Job {
  const companyCol = findColumn(columns, /company/i);
  const roleCol = findColumn(columns, /role|position|title/i);
  const locationCol = findColumn(columns, /location/i);
  const applicationCol = findColumn(columns, /appl/i);
  const ageCol = findColumn(columns, /age|date|posted/i);

  const companyNodes = companyCol ? cells[companyCol] ?? [] : [];
  const companyText = collapse(textOf(companyNodes));
  const isContinuation = companyText === CONTINUATION_MARK;
  const companyLinks = linksOf(companyNodes);

  let company = collapse(companyText.replace(/🔥/gu, ""));
  let companyUrl: string | null = companyLinks.at(0)?.href ?? null;
  if (isContinuation && previousCompany) {
    company = previousCompany.name;
    companyUrl = previousCompany.url;
  }

  const role = collapse(textOf(roleCol ? cells[roleCol] ?? [] : []));
  const locations = lines(textOf(locationCol ? cells[locationCol] ?? [] : [], { skipSummary: true }));

  const applicationLinks = linksOf(applicationCol ? cells[applicationCol] ?? [] : []);
  const simplifyUrl =
    applicationLinks.find((l) => /simplify\.jobs\/p\//i.test(l.href))?.href ?? null;
  const applyUrl =
    applicationLinks.find((l) => /^apply$/i.test(l.label))?.href ??
    applicationLinks.find((l) => l.href !== simplifyUrl)?.href ??
    null;

  const age = collapse(textOf(ageCol ? cells[ageCol] ?? [] : []));

  const allLinks: CellLink[] = [];
  for (const column of columns) allLinks.push(...linksOf(cells[column] ?? []));

  const rowText = columns.map((c) => textOf(cells[c] ?? [], { imageAlt: true })).join(" ");
  const flags: JobFlags = {
    faang: companyText.includes("🔥"),
    advancedDegree: rowText.includes("🎓"),
    noSponsorship: rowText.includes("🛂"),
    usCitizenship: rowText.includes("🇺🇸"),
    closed: rowText.includes("🔒"),
  };

  const simplifyId = simplifyUrl ? /simplify\.jobs\/p\/([^/?#]+)/i.exec(simplifyUrl)?.[1] : null;
  const id = simplifyId
    ? `simplify:${simplifyId}`
    : applyUrl
      ? `url:${canonicalUrl(applyUrl)}`
      : `row:${category.id}|${company}|${role}|${locations.join(";")}`;

  return {
    id,
    categoryId: category.id,
    categoryTitle: category.title,
    position,
    cells,
    company,
    companyUrl,
    isContinuation,
    role,
    locations,
    applyUrl,
    simplifyUrl,
    links: allLinks,
    age,
    ageDays: parseAgeDays(age),
    flags,
  };
}

/* -------------------------------------------------------------------------- */
/*                               README parsing                               */
/* -------------------------------------------------------------------------- */

interface Section {
  heading: string;
  body: string;
}

function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^\s{0,3}##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = { heading: heading[1], body: "" };
      sections.push(current);
    } else if (current) {
      current.body += line + "\n";
    }
  }
  return sections;
}

function parseExpectedCounts(markdown: string): {
  total: number | null;
  byTitle: Map<string, number>;
} {
  const totalMatch = /Browse\s+([\d,]+)\s+[^\n]*Roles/i.exec(markdown);
  const byTitle = new Map<string, number>();
  const re = /\*\*\[([^\]]+)\]\([^)]*\)\*\*\s*\(([\d,]+)\)/g;
  for (const m of markdown.matchAll(re)) {
    byTitle.set(m[1].trim().toLowerCase(), Number(m[2].replace(/,/g, "")));
  }
  return {
    total: totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null,
    byTitle,
  };
}

function parseLegend(sections: Section[]): LegendEntry[] {
  const legend = sections.find((s) => /^legend$/i.test(s.heading.trim()));
  if (!legend) return [];
  const out: LegendEntry[] = [];
  for (const line of legend.body.split("\n")) {
    const m = /^\s*[-*]\s+(\S+)\s+(.+?)\s*$/u.exec(line);
    if (m) out.push({ symbol: m[1], meaning: m[2] });
  }
  return out;
}

function parseClosedRolesLink(body: string): CellLink | null {
  const m = /(🔒\s*)?\*{0,2}\[([^\]]*closed[^\]]*)\]\(([^)\s]+)\)/iu.exec(body);
  if (!m) return null;
  const href = safeUrl(m[3], false);
  return href ? { label: `${m[1] ?? ""}${m[2]}`.trim(), href } : null;
}

export function parseReadme(markdown: string): Board {
  const sections = splitSections(markdown);
  const expected = parseExpectedCounts(markdown);
  const categories: Category[] = [];
  const usedIds = new Map<string, number>();
  const usedCategoryIds = new Set<string>();

  for (const section of sections) {
    const tableHtml = section.body.match(/<table[\s\S]*?<\/table>/gi);
    if (!tableHtml) continue;

    const { emoji, title } = splitHeading(section.heading);
    let categoryId = slugify(title);
    while (usedCategoryIds.has(categoryId)) categoryId += "-x";
    usedCategoryIds.add(categoryId);

    const category: Category = {
      id: categoryId,
      title,
      emoji,
      heading: section.heading,
      columns: [],
      jobs: [],
      expectedCount: expected.byTitle.get(title.toLowerCase()) ?? null,
      closedRolesLink: parseClosedRolesLink(section.body),
    };

    let previousCompany: { name: string; url: string | null } | null = null;
    for (const html of tableHtml) {
      const table = parseTable(html);
      for (const column of table.columns) {
        if (!category.columns.includes(column)) category.columns.push(column);
      }
      for (const row of table.rows) {
        const cells: Record<string, CellNode[]> = {};
        row.forEach((nodes, i) => {
          const column = table.columns[i] ?? `Column ${i + 1}`;
          if (!category.columns.includes(column)) category.columns.push(column);
          cells[column] = nodes;
        });
        const job = buildJob(cells, category.columns, category, category.jobs.length, previousCompany);

        // Guarantee unique ids even if the README lists a posting twice.
        const seen = usedIds.get(job.id) ?? 0;
        usedIds.set(job.id, seen + 1);
        if (seen > 0) job.id = `${job.id}#${seen + 1}`;

        if (!job.isContinuation) previousCompany = { name: job.company, url: job.companyUrl };
        category.jobs.push(job);
      }
    }
    categories.push(category);
  }

  const columns: string[] = [];
  for (const c of categories) for (const col of c.columns) if (!columns.includes(col)) columns.push(col);

  return {
    categories,
    jobs: categories.flatMap((c) => c.jobs),
    columns,
    legend: parseLegend(sections),
    expectedTotal: expected.total,
  };
}
