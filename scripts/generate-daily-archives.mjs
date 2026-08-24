import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const databasePath = resolve(scriptDir, "../../data/papers.json");
const dailyDir = resolve(scriptDir, "../../daily");
const database = JSON.parse(await readFile(databasePath, "utf8"));

const grouped = new Map();
for (const record of database.records) {
  const date = record.first_reported_in_daily ?? "undated";
  if (!grouped.has(date)) grouped.set(date, []);
  grouped.get(date).push(record);
}

const displayStatus = (value) => value === true ? "是" : value === false ? "否" : "未报告";
const sourceLine = (record) => record.source.url
  ? `[${record.source.venue}](${record.source.url})${record.source.doi ? `；DOI: ${record.source.doi}` : ""}`
  : record.source.venue;

await mkdir(dailyDir, { recursive: true });
for (const [date, records] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
  const sections = records.map((record) => `## ${record.title}

- 版本年份：${record.publication_audit.display_year}（${record.publication_audit.basis}）
- 来源：${sourceLine(record)}
- 这篇做了什么：${record.study_summary.goal}
- 方法：${record.study_summary.method}
- 结果：${record.study_summary.results}
- 结论：${record.study_summary.conclusion}
- 数据库判断：${record.study_summary.takeaway}
- 校准：${record.calibration.type}；${record.calibration.notes}
- Subject split：${displayStatus(record.subject_split.status)}；${record.subject_split.notes}
- External validation：${displayStatus(record.external_validation.status)}；${record.external_validation.dataset_or_cohort ?? record.external_validation.notes}
- 推理所需输入：${record.deployment.inference_inputs.join("、") || "不适用"}
- 可部署性：${record.deployment.judgment}；${record.study_summary.deployment}
- ABP/BP 泄露审查：${record.study_summary.leakage}
- 审计状态：已完成重点审核
`).join("\n");
  const markdown = `# PPG / 无袖带血压科研日报归档｜${date}

本日归档 ${records.length} 项。归档内容已与 papers.json 同步，版本年份与日报归档日期分开记录。

${sections}`;
  await writeFile(resolve(dailyDir, `${date}.md`), markdown, "utf8");
}

console.log(`Generated ${grouped.size} daily archives from ${database.records.length} reviewed records.`);
