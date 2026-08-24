import { copyFile, cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const externalDataDir = resolve(scriptDir, "../../data");
const externalDailyDir = resolve(scriptDir, "../../daily");
const repositoryDataDir = resolve(scriptDir, "../data");
const repositoryDailyDir = resolve(scriptDir, "../daily");

if (existsSync(resolve(externalDataDir, "papers.json"))) {
  await mkdir(repositoryDataDir, { recursive: true });
  await copyFile(resolve(externalDataDir, "papers.json"), resolve(repositoryDataDir, "papers.json"));
  if (existsSync(resolve(externalDataDir, "papers.csv"))) {
    await copyFile(resolve(externalDataDir, "papers.csv"), resolve(repositoryDataDir, "papers.csv"));
  }
}

if (existsSync(externalDailyDir)) {
  await mkdir(repositoryDailyDir, { recursive: true });
  await cp(externalDailyDir, repositoryDailyDir, { recursive: true, force: true });
}

const source = resolve(repositoryDataDir, "papers.json");
const destinations = [
  resolve(scriptDir, "../app/papers.json"),
  resolve(scriptDir, "../public/data/papers.json"),
];

for (const destination of destinations) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  console.log(`Synced ${source} -> ${destination}`);
}
