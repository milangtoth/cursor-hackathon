import { readFileSync } from "node:fs";
import { extractText } from "unpdf";

async function main() {
  const buf = new Uint8Array(readFileSync("uploads/demo-capstone-brief.pdf"));
  const r = await extractText(buf, { mergePages: false });
  console.log("pages", r.totalPages);
  console.log(Array.isArray(r.text) ? r.text.join("\n") : r.text);
}

main();
