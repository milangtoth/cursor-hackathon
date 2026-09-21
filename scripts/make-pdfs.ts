import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";
import type { SourceCourse } from "../src/lib/types";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

function mdToHtml(md: string) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inTable = false;
  let inPre = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (inPre) {
      if (line.startsWith("```")) {
        out.push("</pre>");
        inPre = false;
      } else {
        out.push(escapeHtml(line));
      }
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      closeLists();
      closeTable();
      out.push("<pre>");
      inPre = true;
      i += 1;
      continue;
    }

    if (line.startsWith("|") && line.includes("|", 1)) {
      closeLists();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-{3,}:?$/.test(c));
      if (!inTable) {
        out.push("<table><thead><tr>");
        out.push(cells.map((c) => `<th>${inline(c)}</th>`).join(""));
        out.push("</tr></thead><tbody>");
        inTable = true;
      } else if (!isSep) {
        out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      }
      i += 1;
      continue;
    }

    closeTable();

    if (!line.trim()) {
      closeLists();
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      closeLists();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeLists();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      closeLists();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      closeLists();
      out.push(`<p>${inline(line)}</p>`);
    }
    i += 1;
  }

  closeLists();
  closeTable();
  if (inPre) out.push("</pre>");
  return out.join("\n");
}

function documentHtml(code: string, body: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: "Iowan Old Style", Georgia, serif; font-size: 12pt; line-height: 1.45; color: #111; }
    .kicker { font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase; color: #444; margin: 0 0 4px; }
    h1 { font-size: 20pt; margin: 0 0 16px; }
    h2 { font-size: 14pt; margin: 22px 0 8px; }
    h3 { font-size: 12.5pt; margin: 16px 0 6px; }
    p { margin: 0 0 10px; }
    ul { margin: 0 0 12px; padding-left: 1.2em; }
    li { margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 11pt; }
    th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
    th { background: #f2f2f2; }
    pre, code { font-family: ui-monospace, Consolas, monospace; font-size: 10pt; }
    pre { background: #f6f6f6; padding: 10px 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <p class="kicker">${escapeHtml(code)}</p>
  ${body}
</body>
</html>`;
}

async function main() {
  const contentRoot = join(process.cwd(), "content");
  const outDir = join(process.cwd(), "public", "content");
  mkdirSync(outDir, { recursive: true });

  const courses = readdirSync(contentRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(contentRoot, d.name);
      const course = JSON.parse(readFileSync(join(dir, "course.json"), "utf8")) as SourceCourse;
      return { dir, course };
    });

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  for (const { dir, course } of courses) {
    for (const mod of course.modules) {
      for (const mat of mod.materials) {
        const md = readFileSync(join(dir, mat.file), "utf8");
        await page.setContent(documentHtml(course.code, mdToHtml(md)), {
          waitUntil: "load",
        });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
        });
        const outPath = join(outDir, mat.fileName);
        writeFileSync(outPath, pdf);
        console.log(`pdfs: ${mat.fileName}`);
      }
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
