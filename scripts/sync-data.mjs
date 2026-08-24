import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDir, "../../data/papers.json");
const destination = resolve(scriptDir, "../public/data/papers.json");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
console.log(`Synced ${source} -> ${destination}`);
