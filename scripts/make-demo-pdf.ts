import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Minimal one-page PDF with a real text layer (Helvetica).
function makePdf(lines: string[]) {
  const escaped = lines
    .map((line) => `(${line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")}) Tj T*`)
    .join("\n");
  const content = `BT
/F1 12 Tf
50 750 Td
14 TL
${escaped}
ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(content)} >>stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

const outDir = join(process.cwd(), "uploads");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "demo-capstone-brief.pdf");
writeFileSync(
  outPath,
  makePdf([
    "DB201 - Capstone brief (demo upload)",
    "",
    "This document was uploaded live during the ModernLMS demo.",
    "",
    "Submit your capstone report via the portal before 23:59 on 30 October 2026.",
    "",
    "Late work loses 10% per day. Pair work is not allowed for this brief.",
  ])
);
console.log(outPath);
