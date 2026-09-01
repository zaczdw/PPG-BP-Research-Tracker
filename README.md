# PPG Cuffless BP Research Tracker

PPG、无袖带血压与可穿戴心血管研究的结构化论文数据库和泄露审计网站。

## 当前数据

- 76 篇论文
- 76 篇已完成重点审核
- 17 期日报归档

每篇记录覆盖论文来源、数据集、输入信号、模型、主要结果、校准、subject split、external validation、部署判断、推理输入和 ABP/BP 泄露审查。

## 目录

- `data/papers.json`：网站主数据库
- `data/papers.csv`：表格版本
- `daily/`：每日科研简报
- `app/`：交互式网站
- `pages/`：GitHub Pages 构建入口
- `site/`：可直接发布的静态网站
- `.github/workflows/pages.yml`：自动构建与发布

## 本地运行

```bash
npm ci
npm run build:pages
```

静态产物生成在 `pages-dist/`，同步到 `site/` 后即可发布。推送到 `main` 后，GitHub Actions 会自动发布 GitHub Pages。
