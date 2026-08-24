"use client";

import { useMemo, useState } from "react";
import tracker from "./papers.json";

type Paper = (typeof tracker.records)[number];
type Scalar = string | number | boolean | null;

const deployLabel: Record<string, string> = {
  conditional: "需个体校准",
  "strong-conditional": "临床证据较强",
  "research-enabler": "研究基础设施",
  "deployable-front-end": "可作部署前端",
  "not-deployable-as-reported": "原流程不可部署",
  "promising-but-not-ready": "有前景，尚未就绪",
  "promising-research": "研究阶段",
  "limited-for-BP": "BP 能力有限",
  "promising-change-tracking": "变化追踪有前景",
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
  "low for target leakage / medium for downstream split provenance": "下游划分待核验",
  "low for BP target leakage": "低目标泄露风险",
  "low at dataset construction / high if mis-split": "误划分风险",
  "low for BP target leakage / medium for downstream split provenance": "下游划分待核验",
  low: "低风险",
  unknown: "待审计",
};

const statusText = (value: Scalar) => {
  if (value === true) return "是";
  if (value === false) return "否";
  if (value === null || value === "") return "未报告";
  return String(value);
};

function AuditLine({ label, value, danger = false }: { label: string; value: Scalar; danger?: boolean }) {
  return (
    <div className="audit-line">
      <span>{label}</span>
      <strong className={danger ? "danger-text" : ""}>{statusText(value)}</strong>
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
        paper.model_method,
        paper.main_results,
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
  const deployable = papers.filter((paper) =>
    ["conditional", "strong-conditional", "deployable-front-end"].includes(paper.deployment.level),
  ).length;
  const flagged = papers.filter((paper) =>
    ["critical", "high"].some((level) => paper.leakage_audit.risk_level.includes(level)),
  ).length;
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
          <span>
            <strong>PPG·BP Evidence Atlas</strong>
            <small>无袖带血压研究审计库</small>
          </span>
        </a>
        <nav aria-label="主要导航">
          <a href="#daily">今日简报</a>
          <a href="#papers">论文搜索</a>
          <a href="#datasets">数据集</a>
          <a href="#audit">泄露审计</a>
        </nav>
        <span className="update-pill">更新至 {latestDate?.replaceAll("-", ".")}</span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">EVIDENCE BEFORE ACCURACY</div>
        <h1>不只收集论文，<br />还要判断它能不能真实测血压。</h1>
        <p>
          聚合 PPG、可穿戴与无袖带血压研究，逐篇核对数据划分、校准方式、
          推理输入、外部验证和 ABP/BP 泄露风险。
        </p>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisible(12); }}
            placeholder="搜索论文、数据集、模型或信号，例如 LoRA、VitalDB、ring PPG"
            aria-label="搜索论文数据库"
          />
          <kbd>{filtered.length} 项</kbd>
        </label>
        <div className="quick-links">
          <button onClick={() => { setRisk("flagged"); document.querySelector("#papers")?.scrollIntoView(); }}>查看高风险论文</button>
          <button onClick={() => { setAudit("priority-reviewed"); document.querySelector("#papers")?.scrollIntoView(); }}>只看重点深审</button>
        </div>
      </section>

      <section className="stats" aria-label="数据库概览">
        <article><strong>{papers.length}</strong><span>首批论文记录</span></article>
        <article><strong>{reviewed}</strong><span>已完成重点深审</span></article>
        <article><strong>{deployable}</strong><span>具备条件部署路径</span></article>
        <article className="danger-stat"><strong>{flagged}</strong><span>高风险审计项</span></article>
      </section>

      <section className="daily-section" id="daily">
        <div className="section-heading">
          <div><span>今日简报 · {latestDate}</span><h2>最新纳入数据库</h2></div>
          <p>共 {latest.length} 项新增或补录</p>
        </div>
        <div className="daily-layout">
          <div className="daily-list">
            {latest.slice(0, 4).map((paper, index) => (
              <button key={paper.id} onClick={() => setSelected(paper)} className="daily-item">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{paper.title}</strong><small>{paper.source.venue} · {paper.deployment.judgment}</small></div>
                <i>↗</i>
              </button>
            ))}
          </div>
          <aside className="daily-note">
            <span>本日重点判断</span>
            <h3>真实部署，必须从“推理时到底需要什么”开始审查。</h3>
            <p>历史 cuff 校准可以是合理输入；当前测试 ABP 的均值、标准差、对齐或筛选信息则不能。</p>
          </aside>
        </div>
      </section>

      <section className="content-section" id="papers">
        <div className="section-heading">
          <div><span>PAPER DATABASE</span><h2>{query ? `“${query}”的检索结果` : "全部研究记录"}</h2></div>
          <p>当前匹配 {filtered.length} 项</p>
        </div>
        <div className="filter-panel">
          <label><span>数据集</span><select value={dataset} onChange={(e) => { setDataset(e.target.value); setVisible(12); }}><option value="all">全部数据集</option>{datasetOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>输入信号</span><select value={signal} onChange={(e) => { setSignal(e.target.value); setVisible(12); }}><option value="all">全部信号</option>{signalOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>泄露风险</span><select value={risk} onChange={(e) => { setRisk(e.target.value); setVisible(12); }}><option value="all">全部风险</option><option value="flagged">高风险与严重泄露</option><option value="critical">严重泄露</option><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option><option value="unknown">待审计</option></select></label>
          <label><span>审计进度</span><select value={audit} onChange={(e) => { setAudit(e.target.value); setVisible(12); }}><option value="all">全部进度</option><option value="priority-reviewed">重点深审</option><option value="preliminary-index">首批索引</option></select></label>
          <button className="reset-button" onClick={reset} disabled={!activeFilters}>重置{activeFilters ? ` · ${activeFilters}` : ""}</button>
        </div>

        {filtered.length ? (
          <>
            <div className="paper-grid">
              {filtered.slice(0, visible).map((paper) => (
                <button className="paper-card" key={paper.id} onClick={() => setSelected(paper)}>
                  <div className="card-meta"><span>{paper.year}</span><span>{paper.source.venue}</span></div>
                  <h3>{paper.title}</h3>
                  <p>{paper.main_results}</p>
                  <div className="tags">{paper.topics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}</div>
                  <div className="audit-row">
                    <span className={`badge deploy ${paper.deployment.level}`}>{deployLabel[paper.deployment.level] ?? paper.deployment.judgment}</span>
                    <span className={`badge risk ${paper.leakage_audit.risk_level}`}>{riskLabel[paper.leakage_audit.risk_level] ?? paper.leakage_audit.risk_level}</span>
                    <span className="open-detail">查看审计详情 →</span>
                  </div>
                </button>
              ))}
            </div>
            {visible < filtered.length && <button className="load-more" onClick={() => setVisible((count) => count + 12)}>继续加载 · 还剩 {filtered.length - visible} 项</button>}
          </>
        ) : (
          <div className="empty-state"><strong>没有找到匹配记录</strong><p>换一个关键词，或清除部分筛选条件。</p><button onClick={reset}>清除筛选</button></div>
        )}
      </section>

      <section className="dataset-section" id="datasets">
        <div className="section-heading">
          <div><span>DATASET LENS</span><h2>常用数据集与真实域差异</h2></div>
          <p>点击数据集直接筛选论文</p>
        </div>
        <div className="dataset-grid">
          {datasetOptions.slice(0, 8).map((item) => {
            const count = papers.filter((paper) => paper.datasets.includes(item)).length;
            return <button key={item} onClick={() => { setDataset(item); setVisible(12); document.querySelector("#papers")?.scrollIntoView(); }}><strong>{item}</strong><span>{count} 篇记录</span><i>→</i></button>;
          })}
        </div>
      </section>

      <section className="audit-section" id="audit">
        <div className="audit-copy">
          <span>LEAKAGE AUDIT</span>
          <h2>漂亮的 MAE，可能只是因为测试时已经知道答案。</h2>
          <p>数据库把训练监督与测试目标依赖严格分开。Subject-disjoint 并不能抵消当前 ABP 反归一化、对齐或筛选造成的泄露。</p>
          <button onClick={() => { setRisk("flagged"); document.querySelector("#papers")?.scrollIntoView(); }}>查看全部高风险记录</button>
        </div>
        <div className="critical-card">
          <span>CRITICAL CASE · TCN–BiLSTM</span>
          <h3>每个测试 ABP 窗口的 μ/σ 被用于恢复 mmHg。</h3>
          <div>
            <AuditLine label="Subject-disjoint" value={true} />
            <AuditLine label="External dataset" value={true} />
            <AuditLine label="测试 ABP 反归一化" value="是" danger />
            <AuditLine label="ABP 质量筛选" value="是" danger />
          </div>
          <button onClick={() => setSelected(papers.find((paper) => paper.title.includes("TCN–BiLSTM")) ?? null)}>打开完整审计 →</button>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">P</span><span><strong>PPG·BP Evidence Atlas</strong><small>Evidence before accuracy.</small></span></div>
        <p>当前版本：{papers.length} 条记录 · {reviewed} 条重点深审 · 数据核验于 2026-08-24</p>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="paper-detail-title">
            <button className="close-button" onClick={() => setSelected(null)} aria-label="关闭论文详情">×</button>
            <div className="detail-kicker">{selected.year} · {selected.source.venue}</div>
            <h2 id="paper-detail-title">{selected.title}</h2>
            <div className="detail-badges">
              <span className={`badge deploy ${selected.deployment.level}`}>{selected.deployment.judgment}</span>
              <span className={`badge risk ${selected.leakage_audit.risk_level}`}>{riskLabel[selected.leakage_audit.risk_level] ?? selected.leakage_audit.risk_level}</span>
              <span className="badge neutral">{selected.audit_status === "priority-reviewed" ? "重点深审" : "待全文二审"}</span>
            </div>
            <div className="detail-section"><h3>方法与结果</h3><p>{selected.model_method}</p><p>{selected.main_results}</p></div>
            <div className="detail-columns">
              <div className="detail-section">
                <h3>部署审查</h3>
                <AuditLine label="推理输入" value={selected.deployment.inference_inputs.join("、")} />
                <AuditLine label="当前真实 BP 必需" value={selected.deployment.current_reference_bp_required} danger={selected.deployment.current_reference_bp_required === true} />
                <AuditLine label="校准方式" value={selected.calibration.type} />
                <AuditLine label="Subject split" value={selected.subject_split.status as Scalar} />
                <AuditLine label="External validation" value={selected.external_validation.status as Scalar} />
                <p>{selected.deployment.notes}</p>
              </div>
              <div className="detail-section">
                <h3>ABP / BP 泄露路径</h3>
                <AuditLine label="反归一化" value={selected.leakage_audit.abp_bp_denormalization} danger={String(selected.leakage_audit.abp_bp_denormalization).startsWith("YES")} />
                <AuditLine label="目标对齐" value={selected.leakage_audit.abp_bp_alignment} />
                <AuditLine label="切窗" value={selected.leakage_audit.abp_bp_windowing} />
                <AuditLine label="质量筛选" value={selected.leakage_audit.abp_bp_quality_filtering} />
                <AuditLine label="Window leakage" value={selected.leakage_audit.window_leakage} />
                <AuditLine label="Subject leakage" value={selected.leakage_audit.subject_leakage} />
                <p>{selected.leakage_audit.notes}</p>
              </div>
            </div>
            {selected.source.url && <a className="source-link" href={selected.source.url} target="_blank" rel="noreferrer">打开论文来源 ↗</a>}
          </section>
        </div>
      )}
    </main>
  );
}
