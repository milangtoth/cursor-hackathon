import { loadEnv } from "./load-env";
import { embedTexts } from "../src/lib/gemini";
import { store } from "../src/lib/store";

loadEnv();

async function main() {
  const chunks = store.chunks();
  const pending = chunks.filter((c) => c.embedding.length === 0 && c.text.trim());
  if (!pending.length) {
    console.log("embed-fixtures: nothing to embed");
    return;
  }

  const vectors = await embedTexts(pending.map((c) => c.text), "RETRIEVAL_DOCUMENT");
  const byId = new Map(pending.map((c, i) => [c.id, vectors[i]]));
  store.saveChunks(
    chunks.map((c) => {
      const embedding = byId.get(c.id);
      return embedding ? { ...c, embedding } : c;
    })
  );
  console.log(`embed-fixtures: wrote ${pending.length} embeddings (dim=${vectors[0]?.length})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
