import { loadEnv } from "./load-env";
import { z } from "zod";

loadEnv();

const pingSchema = z.object({ ok: z.boolean(), echo: z.string() });
const pingSchemaHint = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    echo: { type: "string" },
  },
  required: ["ok", "echo"],
};

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("smoke fail: DEEPSEEK_API_KEY missing (cwd=" + process.cwd() + ")");
    process.exit(1);
  }

  const { embedDim, embedTexts, flashModelName, generateJson } = await import("../src/lib/gemini");

  const [vec] = await embedTexts(["ModernLMS embedding smoke"], "SEMANTIC_SIMILARITY");
  if (vec.length !== embedDim()) {
    console.error(`smoke fail: embed dim=${vec.length} expected ${embedDim()}`);
    process.exit(1);
  }

  const ping = await generateJson({
    prompt: 'Return json with ok=true and echo="pong".',
    schema: pingSchema,
    responseSchema: pingSchemaHint,
    temperature: 0,
    maxOutputTokens: 256,
  });

  if (!ping.ok) {
    console.error("smoke fail: generateJson ok=false");
    process.exit(1);
  }

  console.log(`smoke pass: embed dim=${vec.length} model=${flashModelName()} echo=${ping.echo}`);
}

main().catch((err) => {
  console.error("smoke fail:", err instanceof Error ? err.message : err);
  process.exit(1);
});
