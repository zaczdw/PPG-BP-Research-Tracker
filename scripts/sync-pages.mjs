import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDir, "../pages-dist");
const destination = resolve(scriptDir, "../site");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log(`Synced ${source} -> ${destination}`);
