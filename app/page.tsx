"use client";

import { useEffect, useMemo, useState } from "react";
import tracker from "./papers.json";

type Paper = (typeof tracker.records)[number];
type Scalar = string | number | boolean | null;

const deployLabel: Record<string, string> = {
  conditional: "需个体校准",
  "strong-conditional": "真实部署证据较强",
  "research-enabler": "研究基础设施",
  "deployable-front-end": "可作部署前端",
  "not-deployable-as-reported": "原流程不可部署",
  "promising-but-not-ready": "有前景，尚未就绪",
  "promising-research": "研究阶段",
  "limited-for-BP": "BP 能力有限",
  "promising-change-tracking": "适合变化追踪",
  "research-benchmark": "研究基准",
  "conceptual/conditional": "概念验证",
  unknown: "待核验",
};

const riskLabel: Record<string, string> = {
  critical: "严重泄露",
  high: "高风险",
  "high evaluation/generalization risk": "高评估风险",
  medium: "中风险",
  "low-to-medium": "低至中风险",
  "low for target leakage / medium for downstream split provenance": "目标泄露低，下游划分待核验",
  "low for BP target leakage": "BP 目标泄露风险低",
  "low at dataset construction / high if mis-split": "数据构建风险低，误划分风险高",
  "low for BP target leakage / medium for downstream split provenance": "目标泄露低，下游划分待核验",
  low: "低风险",
  unknown: "待审计",
};

const calibrationLabel: Record<string, string> = {
  unknown: "待全文核验",
  "subject-specific fine-tuning": "目标用户少量样本微调",
  "few-shot personal fine-tuning": "少样本个体化微调",
  "baseline calibration optional for change tracking": "变化追踪可选基线校准",
  "initial cuff calibration": "初始 cuff 校准",
  "not applicable to foundation dataset": "数据集/基础模型本身不适用",
  "not applicable to dataset": "数据集本身不适用",
  "benchmark-dependent": "由下游 benchmark 决定",
  "demographic calibration only": "仅使用人口学信息，不做 cuff 校准",
  "mPTP/fPTP point-to-point": "mPTP/fPTP 点对点校准",
  none: "无需校准",
};

const generalStatus: Record<string, string> = {
  unknown: "待核验",
  not_reported: "未报告",
  "not reported": "未报告",
  "not imposed": "论文未规定，需使用者自行划分",
  "reported-subject-aware": "已报告受试者级划分",
  "dataset benchmark dependent": "由下游 benchmark 决定",
  "cross-cohort stress test": "包含跨队列压力测试",
  "not applicable/within-subject calibration study": "个体内校准研究，不适用跨人划分",
};

const statusText = (value: Scalar) => {
  if (value === true) return "是";
  if (value === false) return "否";
  if (value === null || value === "") return "未报告";
  return generalStatus[String(value)] ?? String(value);
};

const auditText = (value: Scalar) => {
  if (typeof value === "boolean" || value === null) return statusText(value);
  const raw = String(value);
  const valueText = raw.toLowerCase();
  if (!raw || valueText === "unknown") return "待全文核验";
  if (valueText.includes("yes") || valueText.includes("current test abp") || valueText.includes("per-window true")) return "是，存在目标依赖";
  if (valueText.includes("historical") || valueText.includes("baseline only")) return "使用历史 BP，仅作校准";
  if (valueText.includes("no evidence") || valueText.includes("not_found") || valueText.includes("not found") || valueText.includes("no apparent") || valueText.includes("not inherent")) return "未发现目标依赖";
  if (valueText === "not reported" || valueText.startsWith("not reported")) return "论文未报告相关依赖";
  if (valueText.includes("not applicable")) return "不适用";
  if (valueText.includes("downstream")) return "由下游实验设计决定";
  if (valueText.includes("must") || valueText.includes("possible") || valueText.includes("concern")) return "需要主动防止或继续核验";
  if (valueText.includes("controlled") || valueText.includes("separate cohort") || valueText.includes("cohort overlap")) return "已采用受试者/队列级控制";
  if (valueText.includes("fixed") || valueText.includes("synchronized") || valueText.includes("synchronization")) return "采用固定窗口或数据集级同步";
  if (valueText.includes("reference bp used") || valueText.includes("supervised target")) return "参考 BP 仅用于监督标签";
  return "已记录；请结合下方审计结论理解";
};

function AuditLine({ label, value, danger = false, auditValue = false }: { label: string; value: Scalar; danger?: boolean; auditValue?: boolean }) {
  return (
    <div className="audit-line">
      <span>{label}</span>
      <strong className={danger ? "danger-text" : ""}>{auditValue ? auditText(value) : statusText(value)}</strong>
    </div>
  );
}

export default function Home() {
  const papers = tracker.records as Paper[];
  const [query, setQuery] = useState("");
  const [dataset, setDataset] = useState("all");
  const [signal, setSignal] = useState("all");
  const [risk, setRisk] = useState("all");
  const [audit, setAudit] = useState("all");
  const [visible, setVisible] = useState(12);
  const [selected, setSelected] = useState<Paper | null>(null);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [selected]);

  const datasetOptions = useMemo(
    () => [...new Set(papers.flatMap((paper) => paper.datasets))]
      .filter((name) => name !== "not_reported")
      .sort((a, b) => a.localeCompare(b)),
    [papers],
  );
  const signalOptions = useMemo(
    () => [...new Set(papers.flatMap((paper) => paper.input_signals))]
      .filter((name) => name !== "not_reported")
      .sort((a, b) => a.localeCompare(b)),
    [papers],
  );
  const latestDate = papers.map((paper) => paper.first_reported_in_daily).filter(Boolean).sort().at(-1);
  const latest = papers.filter((paper) => paper.first_reported_in_daily === latestDate);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return papers.filter((paper) => {
      const matchesQuery = !q || [
        paper.title,
        paper.source.venue,
        paper.topics.join(" "),
        paper.datasets.join(" "),
        paper.input_signals.join(" "),
        paper.study_summary.goal,
        paper.study_summary.method,
        paper.study_summary.results,
        paper.study_summary.conclusion,
        paper.study_summary.takeaway,
      ].join(" ").toLowerCase().includes(q);
      const matchesDataset = dataset === "all" || paper.datasets.includes(dataset);
      const matchesSignal = signal === "all" || paper.input_signals.includes(signal);
      const matchesRisk = risk === "all" || (
        risk === "flagged"
          ? ["critical", "high"].some((level) => paper.leakage_audit.risk_level.includes(level))
          : paper.leakage_audit.risk_level === risk
      );
      const matchesAudit = audit === "all" || paper.audit_status === audit;
      return matchesQuery && matchesDataset && matchesSignal && matchesRisk && matchesAudit;
    });
  }, [papers, query, dataset, signal, risk, audit]);

  const reviewed = papers.filter((paper) => paper.audit_status === "priority-reviewed").length;
  const deployable = papers.filter((paper) => ["conditional", "strong-conditional", "deployable-front-end"].includes(paper.deployment.level)).length;
  const flagged = papers.filter((paper) => ["critical", "high"].some((level) => paper.leakage_audit.risk_level.includes(level))).length;
  const activeFilters = [query, dataset !== "all", signal !== "all", risk !== "all", audit !== "all"].filter(Boolean).length;
  const reset = () => {
    setQuery("");
    setDataset("all");
    setSignal("all");
    setRisk("all");
    setAudit("all");
    setVisible(12);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回首页">
          <span className="brand-mark">P</span>
          <span><strong>PPG·BP Evidence Atlas</strong><small>无袖带血压研究审计库</small></span>
        </a>
        <nav aria-label="主要导航"><a href="#daily">今日简报</a><a href="#papers">论文搜索</a><a href="#audit">泄露审计</a></nav>
        <span className="update-pill">更新至 {latestDate?.replaceAll("-", ".")}</span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">先看证据，再看精度</div>
        <h1>一篇论文做了什么，<br />点开就能看明白。</h1>
        <p>每篇研究都按“做了什么、使用什么方法、结果如何、结论是什么”整理，同时保留校准、推理输入、外部验证和 ABP/BP 泄露审计。</p>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(12); }} placeholder="搜索论文、数据集、方法或结果，例如 LoRA、VitalDB、ring PPG" aria-label="搜索论文数据库" />
          <kbd>{filtered.length} 项</kbd>
        </label>
        <div className="quick-links">
          <button onClick={() => { setRisk("flagged"); document.querySelector("#papers")?.scrollIntoView(); }}>查看高风险论文</button>
          <button onClick={() => { setAudit("priority-reviewed"); document.querySelector("#papers")?.scrollIntoView(); }}>只看重点深审</button>
        </div>
      </section>

      <section className="stats" aria-label="数据库概览">
        <article><strong>{papers.length}</strong><span>首批论文记录</span></article>
        <article><strong>{reviewed}</strong><span>已有中文方法、结果与结论</span></article>
        <article><strong>{deployable}</strong><span>具备条件部署路径</span></article>
        <article className="danger-stat"><strong>{flagged}</strong><span>高风险审计项</span></article>
      </section>

      <section className="daily-section" id="daily">
        <div className="section-heading"><div><span>今日简报 · {latestDate}</span><h2>最新纳入数据库</h2></div><p>共 {latest.length} 项新增或补录</p></div>
        <div className="daily-layout">
          <div className="daily-list">
            {latest.slice(0, 4).map((paper, index) => (
              <button key={paper.id} onClick={() => setSelected(paper)} className="daily-item">
                <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{paper.title}</strong><small>{paper.study_summary.takeaway}</small></div><i>↗</i>
              </button>
            ))}
          </div>
          <aside className="daily-note"><span>本日重点判断</span><h3>真实部署，必须从“推理时到底需要什么”开始审查。</h3><p>历史 cuff 校准可以是合理输入；当前测试 ABP 的均值、标准差、对齐或筛选信息则不能。</p></aside>
        </div>
      </section>

      <section className="content-section" id="papers">
        <div className="section-heading"><div><span>论文数据库</span><h2>{query ? `“${query}”的检索结果` : "全部研究记录"}</h2></div><p>当前匹配 {filtered.length} 项</p></div>
        <div className="filter-panel">
          <label><span>数据集</span><select value={dataset} onChange={(e) => { setDataset(e.target.value); setVisible(12); }}><option value="all">全部数据集</option>{datasetOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>输入信号</span><select value={signal} onChange={(e) => { setSignal(e.target.value); setVisible(12); }}><option value="all">全部信号</option>{signalOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>泄露风险</span><select value={risk} onChange={(e) => { setRisk(e.target.value); setVisible(12); }}><option value="all">全部风险</option><option value="flagged">高风险与严重泄露</option><option value="critical">严重泄露</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option><option value="unknown">待审计</option></select></label>
          <label><span>内容进度</span><select value={audit} onChange={(e) => { setAudit(e.target.value); setVisible(12); }}><option value="all">全部进度</option><option value="priority-reviewed">已完成重点深审</option><option value="preliminary-index">题录年份已核验，全文待审</option></select></label>
          <button className="reset-button" onClick={reset} disabled={!activeFilters}>重置{activeFilters ? ` · ${activeFilters}` : ""}</button>
        </div>

        {filtered.length ? (
          <>
            <div className="paper-grid">
              {filtered.slice(0, visible).map((paper) => (
                <button className="paper-card" key={paper.id} onClick={() => setSelected(paper)}>
                  <div className="card-meta"><span>版本年份 {paper.publication_audit.display_year}</span><span>{paper.source.venue}</span><span>日报收录 {paper.first_reported_in_daily?.replaceAll("-", ".") ?? "补录"}</span><em className={paper.audit_status === "priority-reviewed" ? "verified" : "pending"}>{paper.study_summary.evidence_status}</em></div>
                  <h3>{paper.title}</h3>
                  <div className="card-summary"><span>这篇做了什么</span><p>{paper.study_summary.goal}</p></div>
                  <div className="card-conclusion"><span>一句话结论</span><p>{paper.study_summary.takeaway}</p></div>
                  <div className="tags">{paper.topics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}</div>
                  <div className="audit-row">
                    <span className={`badge deploy ${paper.deployment.level}`}>{deployLabel[paper.deployment.level] ?? paper.deployment.judgment}</span>
                    <span className={`badge risk ${paper.leakage_audit.risk_level}`}>{riskLabel[paper.leakage_audit.risk_level] ?? "风险已记录"}</span>
                    <span className="open-detail">查看方法、结果与结论 →</span>
                  </div>
                </button>
              ))}
            </div>
            {visible < filtered.length && <button className="load-more" onClick={() => setVisible((count) => count + 12)}>继续加载 · 还剩 {filtered.length - visible} 项</button>}
          </>
        ) : <div className="empty-state"><strong>没有找到匹配记录</strong><p>换一个关键词，或清除部分筛选条件。</p><button onClick={reset}>清除筛选</button></div>}
      </section>

      <section className="audit-section" id="audit">
        <div className="audit-copy"><span>ABP / BP 泄露审计</span><h2>漂亮的 MAE，可能只是因为测试时已经知道答案。</h2><p>数据库把训练监督与测试目标依赖严格分开。Subject-disjoint 并不能抵消当前 ABP 反归一化、对齐或筛选造成的泄露。</p><button onClick={() => { setRisk("flagged"); document.querySelector("#papers")?.scrollIntoView(); }}>查看全部高风险记录</button></div>
        <div className="critical-card"><span>严重案例 · TCN–BiLSTM</span><h3>每个测试 ABP 窗口的 μ/σ 被用于恢复 mmHg。</h3><div><AuditLine label="Subject-disjoint" value={true} /><AuditLine label="External dataset" value={true} /><AuditLine label="测试 ABP 反归一化" value="是" danger /><AuditLine label="ABP 质量筛选" value="是" danger /></div><button onClick={() => setSelected(papers.find((paper) => paper.title.includes("TCN–BiLSTM")) ?? null)}>打开完整审计 →</button></div>
      </section>

      <footer><div className="brand"><span className="brand-mark">P</span><span><strong>PPG·BP Evidence Atlas</strong><small>先看证据，再看精度。</small></span></div><p>当前版本：{papers.length} 条记录 · {reviewed} 条重点深审 · 数据核验于 2026-08-24</p></footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="paper-detail-title">
            <button className="close-button" onClick={() => setSelected(null)} aria-label="关闭论文详情">×</button>
            <div className="detail-kicker">版本年份 {selected.publication_audit.display_year} · {selected.source.venue} · 日报收录 {selected.first_reported_in_daily?.replaceAll("-", ".") ?? "补录"}</div>
            <h2 id="paper-detail-title">{selected.title}</h2>
            <div className="detail-badges">
              <span className={`badge deploy ${selected.deployment.level}`}>{deployLabel[selected.deployment.level] ?? selected.deployment.judgment}</span>
              <span className={`badge risk ${selected.leakage_audit.risk_level}`}>{riskLabel[selected.leakage_audit.risk_level] ?? "风险已记录"}</span>
              <span className={`badge neutral ${selected.audit_status === "priority-reviewed" ? "verified" : "pending"}`}>{selected.study_summary.evidence_status}</span>
            </div>
            <div className="publication-note"><strong>年份已经核验</strong><span>{selected.publication_audit.basis}。{selected.publication_audit.note}</span></div>
            {selected.audit_status !== "priority-reviewed" && <div className="verification-banner"><strong>这篇仍在全文核验队列中</strong><span>目前只展示可确认的研究方向；方法、指标与结论不做推测。</span></div>}
            <div className="reading-flow" aria-label="论文内容解读">
              <article><span>01</span><div><h3>这篇研究做了什么</h3><p>{selected.study_summary.goal}</p></div></article>
              <article><span>02</span><div><h3>使用了什么方法</h3><p>{selected.study_summary.method}</p></div></article>
              <article><span>03</span><div><h3>结果如何</h3><p>{selected.study_summary.results}</p></div></article>
              <article><span>04</span><div><h3>结论是什么</h3><p>{selected.study_summary.conclusion}</p></div></article>
            </div>
            <div className="takeaway-box"><span>数据库的一句话判断</span><strong>{selected.study_summary.takeaway}</strong></div>
            <div className="detail-facts">
              <div><span>数据集 / 队列</span><strong>{selected.datasets[0] === "not_reported" ? "未报告" : selected.datasets.join("、")}</strong></div>
              <div><span>输入信号</span><strong>{selected.input_signals.join("、")}</strong></div>
              <div><span>Subject split</span><strong>{statusText(selected.subject_split.status as Scalar)}</strong></div>
              <div><span>External validation</span><strong>{statusText(selected.external_validation.status as Scalar)}</strong></div>
            </div>
            <div className="detail-columns">
              <div className="detail-section">
                <h3>真实部署怎么理解</h3><p className="section-summary">{selected.study_summary.deployment}</p>
                <AuditLine label="推理所需输入" value={selected.deployment.inference_inputs.join("、")} />
                <AuditLine label="当前真实 BP 是否必需" value={selected.deployment.current_reference_bp_required} danger={selected.deployment.current_reference_bp_required === true} />
                <AuditLine label="校准方式" value={calibrationLabel[selected.calibration.type] ?? (selected.calibration.type.includes("calibration") ? "需要校准，具体方式见论文" : selected.calibration.type)} />
              </div>
              <div className="detail-section">
                <h3>ABP / BP 泄露审计结论</h3><p className="section-summary">{selected.study_summary.leakage}</p>
                <AuditLine label="反归一化" value={selected.leakage_audit.abp_bp_denormalization} auditValue danger={String(selected.leakage_audit.abp_bp_denormalization).toLowerCase().includes("yes")} />
                <AuditLine label="目标对齐" value={selected.leakage_audit.abp_bp_alignment} auditValue />
                <AuditLine label="切窗" value={selected.leakage_audit.abp_bp_windowing} auditValue />
                <AuditLine label="质量筛选" value={selected.leakage_audit.abp_bp_quality_filtering} auditValue />
                <AuditLine label="Window leakage" value={selected.leakage_audit.window_leakage} auditValue />
                <AuditLine label="Subject leakage" value={selected.leakage_audit.subject_leakage} auditValue />
              </div>
            </div>
            {selected.source.url && <a className="source-link" href={selected.source.url} target="_blank" rel="noreferrer">打开论文原始来源 ↗</a>}
          </section>
        </div>
      )}
    </main>
  );
}
