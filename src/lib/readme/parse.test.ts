import { describe, expect, it } from "vitest";
import { parseAgeDays, parseReadme, textOf } from "./parse";

const HEADER = `<table>
<thead>
<tr>
<th>Company</th>
<th>Role</th>
<th>Location</th>
<th>Application</th>
<th>Age</th>
</tr>
</thead>
<tbody>`;

const README = `# Summer 2027 Tech Internships

### Browse 4 Internship Roles by Category

💻 **[Software Engineering](https://github.com/x/README.md#-software-engineering-internship-roles)** (3)

🤖 **[Data Science, AI & Machine Learning](https://github.com/x/README.md#-data)** (1)

  ## Legend

  - 🛂 Does NOT offer sponsorship
  - 🔥 FAANG+ company

## 💻 Software Engineering Internship Roles

[Back to top](#top)

${HEADER}
<tr>
<td>🔥 <strong><a href="https://simplify.jobs/c/Waymo?utm_source=GHList&utm_medium=company">Waymo</a></strong></td>
<td>Software Engineer Intern 🎓</td>
<td><details><summary><strong>2 locations</strong></summary>SF<br>Mountain View, CA</details></td>
<td><div align="center"><a href="https://careers.waymo.com/1?utm_source=Simplify&ref=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" width="50" alt="Apply"></a> <a href="https://simplify.jobs/p/aaaa-1111?utm_source=GHList"><img src="https://i.imgur.com/aVnQdox.png" width="26" alt="Simplify"></a></div></td>
<td>0d</td>
</tr>
<tr>
<td>↳</td>
<td>Data Engineer Intern 🛂</td>
<td>Seattle, WA<br>NYC</td>
<td><div align="center"><a href="https://grnh.se/abc?utm_source=Simplify&ref=Simplify"><img src="https://i.imgur.com/6cFAMUo.png" width="80" alt="Apply"></a></div></td>
<td>1mo</td>
</tr>
</tbody>
</table>

---

<div id="github-cutoff-warning"><h2>🔗 See Full List</h2></div>

${HEADER}
<tr>
<td><strong>Steven's Capital Management</strong></td>
<td>Quant &amp; Dev Intern</td>
<td>NYC</td>
<td><div align="center"><a href="https://example.com/job"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a> <a href="https://simplify.jobs/p/bbbb-2222?utm_source=GHList"><img src="https://i.imgur.com/aVnQdox.png" alt="Simplify"></a></div></td>
<td>3d</td>
</tr>
</tbody>
</table>

🔒 **[See 595 more closed roles →](https://github.com/x/README-Inactive.md#-software)**

## 🤖 Data Science, AI & Machine Learning Internship Roles

${HEADER}
<tr>
<td><strong><a href="https://simplify.jobs/c/Acme">Acme</a></strong></td>
<td>ML Intern</td>
<td>Remote in USA</td>
<td><div align="center"><a href="./relative/path"><img src="x.png" alt="Apply"></a> <a href="javascript:alert(1)">bad</a></div></td>
<td>2w</td>
</tr>
</tbody>
</table>

## FAQs
Nothing tabular here.
`;

describe("parseReadme", () => {
  const board = parseReadme(README);
  const [swe, ds] = board.categories;

  it("finds one category per section with tables, merging split tables", () => {
    expect(board.categories.map((c) => [c.emoji, c.title, c.jobs.length])).toEqual([
      ["💻", "Software Engineering", 3],
      ["🤖", "Data Science, AI & Machine Learning", 1],
    ]);
    expect(board.columns).toEqual(["Company", "Role", "Location", "Application", "Age"]);
  });

  it("reads the counts the README advertises", () => {
    expect(board.expectedTotal).toBe(4);
    expect(swe.expectedCount).toBe(3);
    expect(ds.expectedCount).toBe(1);
  });

  it("extracts structured fields", () => {
    const [waymo, continuation, stevens] = swe.jobs;
    expect(waymo).toMatchObject({
      id: "simplify:aaaa-1111",
      company: "Waymo",
      companyUrl: "https://simplify.jobs/c/Waymo?utm_source=GHList&utm_medium=company",
      role: "Software Engineer Intern 🎓",
      locations: ["SF", "Mountain View, CA"],
      applyUrl: "https://careers.waymo.com/1?utm_source=Simplify&ref=Simplify",
      simplifyUrl: "https://simplify.jobs/p/aaaa-1111?utm_source=GHList",
      age: "0d",
      ageDays: 0,
    });
    expect(waymo.flags).toMatchObject({ faang: true, advancedDegree: true, noSponsorship: false });

    expect(continuation).toMatchObject({
      isContinuation: true,
      company: "Waymo",
      companyUrl: waymo.companyUrl,
      id: "url:https://grnh.se/abc",
      locations: ["Seattle, WA", "NYC"],
      simplifyUrl: null,
      ageDays: 30,
    });
    expect(continuation.flags.noSponsorship).toBe(true);

    expect(stevens).toMatchObject({ company: "Steven's Capital Management", companyUrl: null, role: "Quant & Dev Intern" });
  });

  it("keeps every cell's content", () => {
    const [waymo] = swe.jobs;
    expect(textOf(waymo.cells.Location)).toBe("2 locations\nSF\nMountain View, CA");
    expect(waymo.links.map((l) => l.label)).toEqual(["Waymo", "Apply", "Simplify"]);
  });

  it("resolves relative links and drops unsafe ones without losing their text", () => {
    const [acme] = ds.jobs;
    expect(acme.applyUrl).toBe("https://github.com/SimplifyJobs/Summer2027-Internships/blob/dev/relative/path");
    expect(acme.links.map((l) => l.href)).not.toContain("javascript:alert(1)");
    expect(textOf(acme.cells.Application)).toContain("bad");
  });

  it("parses the legend and closed-roles link", () => {
    expect(board.legend).toEqual([
      { symbol: "🛂", meaning: "Does NOT offer sponsorship" },
      { symbol: "🔥", meaning: "FAANG+ company" },
    ]);
    expect(swe.closedRolesLink).toEqual({
      label: "🔒 See 595 more closed roles →",
      href: "https://github.com/x/README-Inactive.md#-software",
    });
    expect(ds.closedRolesLink).toBeNull();
  });

  it("gives duplicate postings distinct ids", () => {
    const doubled = parseReadme(README.replace("## FAQs", `## 🔧 Hardware\n\n${HEADER}\n<tr><td>A</td><td>R</td><td>L</td><td><a href="https://simplify.jobs/p/aaaa-1111">Simplify</a></td><td>1d</td></tr></tbody></table>\n\n## FAQs`));
    const ids = doubled.jobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("simplify:aaaa-1111#2");
  });
});

describe("parseAgeDays", () => {
  it.each([
    ["0d", 0],
    ["12d", 12],
    ["2w", 14],
    ["1mo", 30],
    ["1y", 365],
    ["soon", null],
  ])("%s → %s", (age, days) => {
    expect(parseAgeDays(age)).toBe(days);
  });
});
