import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDir, "../../data/papers.json");
const destinations = [
  resolve(scriptDir, "../app/papers.json"),
  resolve(scriptDir, "../public/data/papers.json"),
];

for (const destination of destinations) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  console.log(`Synced ${source} -> ${destination}`);
}
