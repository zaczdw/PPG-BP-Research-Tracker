import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const reviewed = {
  "ppgbp-002-evaluating-cross-dataset-transfer-learning-for-photoplethysmography-base": {
    goal: "检验一个在医院数据上训练的 PPG→BP 模型，能否用少量目标用户数据迁移到新数据集和真实可穿戴场景。",
    method: "先在源数据集预训练轻量 BP-CRNN，再只微调最后的卷积层和全连接层，用少量目标用户的 PPG 与参考 BP 完成个体化。",
    results: "在 200 名目标患者的个体化实验中，SBP/DBP MAE 为 3.36/1.81 mmHg，比不做迁移约改善 13%；到了外部可穿戴数据，误差升至约 10.5–10.9/6.9 mmHg。",
    conclusion: "跨数据集迁移和个体化确实有帮助，但医院数据上的好成绩不能直接代表可穿戴场景；真实域差异仍然很大。",
    takeaway: "可用于需要入组校准的个体化方案，不能当作免校准、跨人群通用模型。",
    deployment: "上线前需要用户提供少量 PPG+参考 BP 做微调；之后单次推理只需 PPG 和已保存的个体参数。",
    leakage: "未发现推理时使用当前测试 BP；主要风险是同一用户的校准窗口与测试窗口过近，造成个体化结果偏乐观。",
  },
  "ppgbp-006-few-shot-personalized-blood-pressure-estimation-from-photoplethysmograph": {
    goal: "用少量个人样本，把群体 PPG→BP 模型快速适配到新用户，同时尽量减少需要更新的参数量。",
    method: "先训练群体 Transformer，再用 SRR-LoRA 做低秩个体化，并加入 pulse pressure 一致性损失；个人适配只更新少量 LoRA 参数。",
    results: "论文报告个体化后 SBP/DBP MAE 为 1.52/1.07 mmHg；此前日报记录的预训练人群为 2,405 人，个体化实验为 316 人。",
    conclusion: "Few-shot LoRA 能显著提高同一用户上的预测精度，但高精度依赖个人标注样本，不能表述为“无需校准”。",
    takeaway: "工程上有吸引力，但必须把个人 cuff BP 的采集成本和校准—测试时间间隔写清楚。",
    deployment: "完成入组校准后可仅用 PPG 推理；生成个人 LoRA adapter 时仍需要带参考 BP 的个人样本。",
    leakage: "未发现当前测试 BP 进入推理；需继续核对个人校准窗口与测试窗口是否严格分离。",
  },
  "ppgbp-007-feasibility-and-performance-evaluation-of-ppg-on-a-galaxy-watch-in-conti": {
    goal: "验证 Galaxy Watch 的腕部 PPG 能否连续追踪中心动脉 BP 的相对变化，而不是只在静息时给出一个绝对 BP 数字。",
    method: "算法从手表 PPG 提取 MAP/SBP/DBP 的变化，并在导管检查人群中与侵入式中心主动脉 BP 做前瞻性比较；同时比较有、无基线校准。",
    results: "识别 MAP 上升≥15% 的 AUC 为 0.85；MAP 变化相关系数 r=0.92，偏差 0.51 mmHg，中位检测延迟 1 分钟；无校准时变化检测仍较稳健。",
    conclusion: "腕部 PPG 很适合做 ΔBP/MAP 趋势追踪，但这项研究并未证明手表可按完整标准输出可靠的绝对 BP。",
    takeaway: "把它理解为“变化报警器”比“电子血压计”更准确。",
    deployment: "推理只需腕部 PPG，可选基线；适合趋势监测，不应外推为绝对 BP 产品验证。",
    leakage: "开发与前瞻性验证队列分开，未见当前参考 BP 输入模型；侵入式 BP 仅用于评价。",
  },
  "ppgbp-008-validation-and-subgroup-analysis-of-the-accuracy-of-the-photoplethysmogr": {
    goal: "按医疗器械标准检验 Microlife 上臂式 PPG 无袖带血压计的准确性，并观察年龄和肤色亚组是否一致。",
    method: "在 120 名成人中采用同臂序贯测量，与参考 cuff BP 比较，并按 AAMI/ESH/ISO 81060-2:2018/Amd 1:2020 的要求评估。",
    results: "设备达到论文采用的 AAMI/ESH/ISO 准确性判据；年龄与 Fitzpatrick 肤色亚组结果总体一致。",
    conclusion: "这是较接近产品验证的证据，但使用方式和校准条件仍需遵守研究协议，不能泛化到所有场景。",
    takeaway: "比纯算法回顾性实验更接近真实产品证据，但仍要看校准、测量姿势和适用人群。",
    deployment: "适合校准后进行居家频繁测量；需要按设备说明完成初始校准。",
    leakage: "属于独立设备验证，不是随机窗口训练评估；主要关注校准流程与参考测量协议，而非模型窗口泄露。",
  },
  "ppgbp-011-benchmarking-and-enhancing-ppg-based-cuffless-blood-pressure-estimation-": {
    goal: "在统一数据和评估流程下比较多种 PPG→BP 模型，避免不同论文因数据处理不同而无法公平比较。",
    method: "构建 1,103 名健康成人、101,453 个片段的统一基准，比较多种网络，并测试把人口学信息与 PPG 表征融合。",
    results: "所有基础模型都未达到 AAMI/ISO 的数值门槛；加入人口学信息后，MInception 误差下降 23%，SBP/DBP MAE 为 4.75/2.90 mmHg。",
    conclusion: "人口学信息能改善数值表现，但达到某个 MAE 门槛不等于完成医疗器械标准验证。",
    takeaway: "这是模型公平比较的基准，不是产品合规证明。",
    deployment: "仍处研究基准阶段；推理可能需要 PPG 和人口学信息，尚无独立临床产品验证。",
    leakage: "重点要核对统一 benchmark 是否严格 subject-disjoint；数值达标不能替代标准规定的受试者级协议。",
  },
  "ppgbp-012-anyppg-an-ecg-guided-ppg-foundation-model-trained-on-over-100-000-hours-": {
    goal: "利用训练期同步 ECG 帮助 PPG 学到更稳定的生理表征，再把 PPG encoder 用到多种健康任务。",
    method: "通过跨模态对齐，让同步 PPG 与 ECG 进入共享生理空间；下游部署时可以只保留 PPG encoder。",
    results: "预训练规模约 109,909 小时、58,796 人；在 11 个任务上，回归平均提升 12.8%，分类平均提升 9.1%。",
    conclusion: "ECG 可作为训练期的 privileged supervision 提升 PPG 表征，但 AnyPPG 本身不是专门的 BP 医疗器械验证。",
    takeaway: "适合作为 PPG foundation model 底座；是否能测 BP 仍取决于下游数据、划分和临床验证。",
    deployment: "训练时需要 ECG 对齐监督，下游推理可以只用 PPG。",
    leakage: "ECG 是训练监督而非测试目标；下游任务仍需重新审计 subject split 和 BP 标签使用方式。",
  },
  "ppgbp-015-arterial-blood-pressure-waveform-reconstruction-estimation-from-ppg-usin": {
    goal: "只根据 PPG 重建完整 ABP 波形，并从波形中估计 SBP/DBP。",
    method: "将 8 秒 PPG 窗口（2 秒步长）送入 TCN–BiLSTM，预测归一化 ABP 波形，并用强调极值的 Huber loss 训练。",
    results: "VitalDB 上 SBP MAE/RMSE 为 3.61/5.24 mmHg，DBP 为 1.79/2.37 mmHg；外部 MIMIC-IV 表格约为 4.6/1.9 mmHg MAE。",
    conclusion: "表面误差很低，但论文使用每个测试 ABP 窗口自身的 μ/σ 恢复 mmHg，推理时等于借用了真实答案的信息。",
    takeaway: "这是数据库中的严重泄露案例：数值不能代表真实 PPG-only 部署能力。",
    deployment: "按论文报告的流程无法部署，因为真实系统不知道当前 ABP 窗口的均值和标准差。",
    leakage: "严重：测试 ABP 用于逐窗反归一化，且 ABP 参与质量筛选；即使 subject-disjoint 和外部数据成立，也不能抵消目标泄露。",
  },
  "ppgbp-019-pulselm-a-foundation-dataset-and-benchmark-for-ppg-text-learning": {
    goal: "把 PPG 波形与生理问答文本连接起来，建立可用于多任务训练的 PPG-text 数据集和 benchmark。",
    method: "统一整理 PPG 片段，并为 12 类生理任务构造问答对，用于训练和评估 PPG 与文本联合模型。",
    results: "数据包含约 131 万个 10 秒 PPG 片段和 315 万组问答对，覆盖 12 个生理 QA 任务。",
    conclusion: "PulseLM 的主要贡献是数据和多任务接口，不是证明无袖带绝对 BP 已达到临床准确性。",
    takeaway: "适合做表征学习与问答研究，不能把数据规模直接换算成 BP 产品性能。",
    deployment: "可作为下游多任务模型底座；具体 BP head 仍需单独验证。",
    leakage: "数据构建本身不等于安全评估；复用时必须按受试者划分，并核对问答标签是否来自目标 BP。",
  },
  "ppgbp-024-cuffless-hemodynamic-monitoring-with-physics-informed-machine-learning-m": {
    goal: "用 BioZ 和物理约束模型同时估计 BP 与血流动力学状态，并观察长期使用时是否稳定。",
    method: "BioZ encoder 与 signal-tagged PINN 结合，用 Navier–Stokes 和弹性管模型约束 BP 及径向/轴向速度场。",
    results: "不同队列的横断面 r² 约 0.588–0.854，个体专属模型更高；一年 pilot 中需要每日重新校准才能维持表现。",
    conclusion: "物理约束提高了可解释性，但长期稳定性仍依赖高频校准，当前硬件续航也限制连续部署。",
    takeaway: "是很有价值的 BioZ+sPINN 研究原型，还不是低维护、长期自主运行的设备。",
    deployment: "报告配置下连续 BLE 续航约 6 小时，长期使用还需要每日 recalibration。",
    leakage: "需要明确每日重新校准使用的参考 BP；若同日测试紧邻校准，长期泛化可能被高估。",
  },
  "ppgbp-043-long-term-accuracy-and-stability-of-blood-pressure-measurements-from-a-s": {
    goal: "观察 Galaxy Watch 经过一次初始校准后，连续 27 天的 BP 准确性和漂移情况。",
    method: "第 0 天校准手表，此后 27 天与 Omron M4 做成对比较；日常 Omron 读数只作为参考，不更新手表。",
    results: "总体 SBP/DBP MD 约 −0.34/+0.62 mmHg，估计 28 天漂移 −0.19/+1.02 mmHg；真实 BP 距初始校准点约 10 mmHg 时，误差明显增大。",
    conclusion: "平均漂移不大，但模型更擅长在校准点附近工作；BP 状态发生较大变化时可靠性下降。",
    takeaway: "“30 天稳定”不能只看平均偏差，还要看离开个人校准点后的误差。",
    deployment: "只需第 0 天校准，之后手表独立输出；每日 Omron 仅用于研究验证。",
    leakage: "未见验证期参考 BP 回写手表；主要问题不是泄露，而是校准点依赖和 BP 变化后的性能下降。",
  },
  "ppgbp-045-cardiostate-jepa-delay-aware-cross-modal-learning-of-a-shared-cardiac-re": {
    goal: "让 PPG、ECG、PCG 在存在生理时间延迟时仍能学习共享的 cardiac representation。",
    method: "两阶段 JEPA：各模态 tokenizer、共享 Transformer、masked latent prediction，加上可学习的跨模态 delay alignment。",
    results: "冻结 encoder 后，相比最佳 SSL baseline，PPG 分类、PCG murmur 检测和 ECG 分类分别提高 8.2、18.8、15.5 个 AUROC 点。",
    conclusion: "延迟感知的跨模态预训练能提升通用心血管表征，但论文并未直接验证无袖带 BP head。",
    takeaway: "可作为下游模型底座，不能把多任务 AUROC 提升等同于 BP 精度提升。",
    deployment: "跨模态 delay aligner 在预训练阶段学习；具体下游可仅保留目标模态，但 BP 任务需另做验证。",
    leakage: "共享表征本身不是 BP 泄露；风险取决于下游 BP 标签、时间对齐和受试者划分。",
  },
  "ppgbp-049-the-role-of-dataset-integrity-calibration-and-signal-quality-in-neural-n": {
    goal: "系统分析数据同步质量、个人校准次数和 PPG signal quality 对神经网络 BP 估计的影响。",
    method: "在同步质量不同的数据集上比较 MLP、ResNet、TCN；采用 subject-wise split，并测试 3–9 次初始参考测量的校准效果。",
    results: "VitalDB 持续优于 MIMIC-III；超过 3 次校准后收益递减；校准后的 DBP 达到数值临床门槛，SBP 仍较困难。",
    conclusion: "数据完整性和同步质量可能比更复杂的网络更重要；少量校准有效，但不能解决 SBP 的全部问题。",
    takeaway: "先修数据和划分，再谈模型；3 次左右校准是值得重点验证的工程折中点。",
    deployment: "需要初始 cuff/reference BP，并依赖可靠的同步与 SQA。",
    leakage: "采用 subject-wise split 降低跨人泄露；仍要保证个人校准样本与测试时间段分离。",
  },
  "ppgbp-051-change-point-aware-evaluation-and-re-calibration-of-ppg-based-blood-pres": {
    goal: "研究 BP 分布突然变化时 PPG→BP 模型为什么失效，以及何时应该重新校准。",
    method: "检测 BP trajectory 的 change point，分别评估变化点前后误差，并在检测到变化时触发 targeted recalibration。",
    results: "模型在 BP change point 附近明显退化；固定周期校准不足，变化点触发的重新校准更稳健。具体数值仍待表格复核。",
    conclusion: "校准应与生理状态变化关联，而不只是按固定天数执行；但触发器不能依赖部署时不可得的真实 BP。",
    takeaway: "思路重要，关键审计问题是：系统如何在不知道真实 BP 的情况下发现 change point。",
    deployment: "若变化点由真实 BP 触发，流程并不自主；需要用 PPG/IMU/上下文构建可部署的触发器。",
    leakage: "潜在高风险在触发机制：若用当前真实 BP 判断变化并决定重校准，就把目标信息带入了评估流程。",
  },
  "ppgbp-056-domain-independent-ppg-signal-quality-assessment-framework-via-represent": {
    goal: "建立跨部位、跨设备更稳健的 PPG signal quality assessment，先识别坏信号再进入 BP 或其他下游模型。",
    method: "用 triplet loss 微调预训练 PPG Transformer，以待测片段到高质量 reference embedding 的距离判断质量。",
    results: "F1 约为手指 90%、手腕 95%、颈部 70%；跨域效果因采集部位而异。",
    conclusion: "SQA 可实时运行且不依赖 BP 标签，适合作为部署前端；颈部等新域仍需更多数据。",
    takeaway: "先判断 PPG 能不能用，再估 BP；这是减少运动伪影失败的实用组件。",
    deployment: "推理仅需 PPG 和已保存的高质量 reference embedding，不需要当前 BP。",
    leakage: "未使用 BP 目标做质量筛选，目标泄露风险低；应继续避免同一受试者片段跨训练/测试。",
  },
  "ppgbp-057-large-scale-bilateral-cardiovascular-monitoring-via-wearable-rings": {
    goal: "检验左右手双 ring PPG 是否比单侧信号更适合预测 BP 等心血管和人口学指标。",
    method: "在 12 种 backbone 上比较左手、右手、双侧融合和平均 ring PPG 的多目标预测。",
    results: "1,810 人、97,559 个有效样本；双侧 SBP/DBP MAE 为 12.36/8.21 mmHg，只比人群均值 baseline 13.81/9.27 略好。",
    conclusion: "双侧信号有一定增益，但绝对 BP 误差仍大，且双 ring 的硬件成本并未换来决定性提升。",
    takeaway: "更适合作为左右差异和姿势研究资源，不宜宣传为高精度 BP 方案。",
    deployment: "需要两枚 ring，是额外佩戴成本；当前 BP 精度不足以支撑产品结论。",
    leakage: "必须按参与者划分；若把同一人的左右手或不同 session 分到训练和测试，会显著高估泛化。",
  },
  "ppgbp-059-evaluation-of-alysis-001-cuffless-blood-pressure-estimation-algorithm-ag": {
    goal: "在高血压门诊人群中检验 Alysis-001 的 24 小时 awake/asleep BP 表现和 non-dipper 识别能力。",
    method: "基于 Moens–Korteweg 的多参数生物力学算法估计血流速度、容量和动脉弹性，并结合多光谱 PPG、electro-potential、IMU、温度与人口学信息做运动/姿势校正和 SQA。",
    results: "92 人入组、78 人纳入分析；两种提取策略都通过 ESH awake/asleep 条件，ICC>0.70；non-dipper sensitivity 0.93、specificity 0.75、accuracy 0.82。",
    conclusion: "这是较强的真实 24 h wearable 证据，且无需 cuff 校准；但通过 awake/asleep 主测试不等于完成全部 cuffless device 验证。",
    takeaway: "在当前库中属于部署证据较强的一项，但结论范围应严格限定在研究完成的测试上。",
    deployment: "推理需要多光谱 PPG、electro-potential、IMU、温度和人口学信息；高强度活动会自动拒测。",
    leakage: "独立前瞻性队列，参考 ABPM 只用于比较；未发现用参考 BP 反归一化、选 beat 或做内部 SQA。",
  },
  "ppgbp-060-a-multi-posture-asymmetry-aware-intelligent-bilateral-observation-datase": {
    goal: "发布一个同时包含左右手 ring PPG 和多种体位的 BP 数据集，用于研究侧别与姿势造成的 domain shift。",
    method: "同步采集左右手 ring PPG，覆盖 3 种标准体位，并提供 SBP/DBP/HR、年龄、性别、BMI 等标签。",
    results: "MAIBO 包含 1,810 名参与者和 7,478 个 session，适合做左右手与姿势依赖的心血管 benchmark。",
    conclusion: "数据集非常贴近 wearable 研究，但它不会自动保证安全划分；使用者必须自己按 participant ID 分组。",
    takeaway: "最有价值的实验是 left→right、supine→sitting/standing，而不是随机 window split。",
    deployment: "下游推理可只用 ring PPG，也可加入设备实际可得的 posture/IMU。",
    leakage: "数据构建未见当前 BP 反归一化；最大风险是把同一人的不同手、体位或 session 随机分到训练和测试。",
  },
  "ppgbp-061-healthring-physiology-dataset-for-health-sensing-on-rings": {
    goal: "提供包含真实运动伪影的 ring physiology 数据，让算法不只在静坐实验中评估。",
    method: "采集 controlled stimuli、semi-free-living 日常活动和 treadmill running 三组同步数据；两枚 ring 记录反射/透射 red/IR PPG 与 3-axis accelerometer。",
    results: "共 54 名成人；controlled+daily benchmark 的 SBP/DBP MAE 为 12.98/7.64 mmHg，HR 5.33 bpm，RR 2.98 次/分，SpO₂ 1.72%。",
    conclusion: "HealthRing 对运动鲁棒性和拒测策略很有价值，但当前 BP benchmark 精度有限，不能视作消费设备验证。",
    takeaway: "适合研究 arm swing 下“何时不该输出”，而不是证明 ring 已能准确测 BP。",
    deployment: "推理输入是 ring PPG 与 accelerometer；可用于运动场景下的 SQA 和鲁棒性研究。",
    leakage: "数据本身不要求目标依赖处理；复用时必须按 subject 分组，不能随机打散高度重叠的 windows。",
  },
  "ppgbp-064-causal-decomposition-of-ppg-signals-for-cuffless-blood-pressure-estimati": {
    goal: "找出 PPG 中与 BP 更有因果关联的频率成分，而不是直接把整段波形交给黑箱模型。",
    method: "用 EEMD 把 PPG 分解为多个 IMF，再通过 counterfactual exclusion 和 structural causal modeling 选择 BP 相关分量，并比较 CNN、GBRT、PAT。",
    results: "IMF4–6 的因果关联最强；CNN 使用 IMF4+5 时，SBP/DBP MAE 为 5.55/3.45 mmHg，比原始 PPG 改善 26.39%/17.86%。",
    conclusion: "选择生理相关分量能改善模型，但“causal”命名不能替代 subject-disjoint 和 external validation。",
    takeaway: "解释性方向值得跟进，当前证据仍不足以证明跨数据集和实时部署稳定。",
    deployment: "推理可 PPG-only，但需要固定 EEMD/分量选择流程；实时计算成本与跨域稳定性尚未解决。",
    leakage: "摘要未报告明显目标反归一化；subject split、切窗和外部验证仍需全文审计。",
  },
  "ppgbp-065-a-revised-point-to-point-calibration-approach-with-adaptive-errors-corre": {
    goal: "降低 PTT 类无袖带 BP 模型对单个初始校准点的敏感性，让运动状态变化时更稳定。",
    method: "比较原始 one-point PTP、多个静息点取平均的 mPTP，以及加入 penalty factor 动态修正的 fPTP。",
    results: "mPTP 和 fPTP 相比 oPTP 减少了对单个静息样本的依赖，并提高不同运动强度下的一致性；具体数值保留在原文中。",
    conclusion: "多点或自适应校准比单点更稳，但它仍是校准型方法，不是 calibration-free BP。",
    takeaway: "适合作为校准策略 baseline；必须确认实时 correction 不会使用部署时拿不到的当前参考 BP。",
    deployment: "推理需要 ECG/PPG-derived PTT 和个人参数；自适应更新的可用输入必须重新审计。",
    leakage: "历史 BP 用于校准是明确的；若 fPTP 在测试时使用同时刻参考 BP 更新参数，就会形成目标依赖。",
  },
};

const topicZh = {
  "cuffless BP": "无袖带 BP",
  personalization: "个体化",
  "foundation model": "foundation model",
  "wearable deployment": "可穿戴部署",
  dataset: "数据集",
  calibration: "校准",
  "signal quality": "signal quality",
  "motion artifact": "运动伪影",
  "cross-dataset transfer": "跨数据集迁移",
};

const publicationOverrides = {
  "ppgbp-001-blood-pressure-estimation-from-ppg-a-comparative-study-of-direct-and-ecg": { url: "https://arxiv.org/abs/2607.23406", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-003-single-beat-cuffless-blood-pressure-estimation-using-ear-ppg-and-ecg-wit": { url: "https://arxiv.org/abs/2607.27076", verification: "primary-abstract", basis: "arXiv 与 IEEE EMBC 2026 议程核验" },
  "ppgbp-005-a-robust-ppg-foundation-model-using-multimodal-physiological-supervision": { url: "https://arxiv.org/abs/2606.07365", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-009-sigma-ppg-statistical-prior-informed-generative-masking-architecture-for": { url: "https://arxiv.org/abs/2601.21031", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-010-wavelet-driven-masked-multiscale-reconstruction-for-ppg-foundation-model": { url: "https://arxiv.org/abs/2601.12215", verification: "primary-abstract", basis: "2026 arXiv/ICLR 版本核验", displayYear: "2025 workshop / 2026 完整版", note: "存在 2025 年较短的 workshop 版本；当前记录对应 2026 年完整题名版本。" },
  "ppgbp-013-reassessing-the-feasibility-of-ppg-based-non-invasive-blood-glucose-leve": { url: "https://arxiv.org/abs/2608.01820", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-016-biosignal-fingerprinting-a-cross-modal-ppg-ecg-foundation-model": { url: "https://arxiv.org/abs/2605.09579", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-020-integrating-biophysical-dynamics-with-a-data-driven-method-for-blood-pre": { doi: "10.1016/j.bspc.2026.110445", url: "https://doi.org/10.1016/j.bspc.2026.110445", verification: "primary-metadata", basis: "Crossref 近似题名与 DOI 核验" },
  "ppgbp-022-calibration-based-continuous-blood-pressure-estimation-using-pulse-deriv": { doi: "10.1016/j.bspc.2026.109852", url: "https://doi.org/10.1016/j.bspc.2026.109852", verification: "primary-full-text", basis: "Elsevier 期刊文章核验", displayYear: "2025 预印本 / 2026 期刊", note: "SSRN 预印本发布于 2025 年；当前记录对应 2026 年正式期刊文章。" },
  "ppgbp-025-apnea-burden-guided-framework-enhancing-out-of-distribution-generalizati": { url: "https://arxiv.org/abs/2608.12229", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-032-rethinking-ppg-based-sleep-staging-datasets-metrics-and-benchmarks": { url: "https://arxiv.org/abs/2608.00943", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-038-cfd-guided-detection-of-concept-drift-in-multimodal-physiologic-signals": { url: "https://arxiv.org/abs/2608.07759", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-040-photoplethysmography-acceleration-indices-as-digital-biomarkers-of-cardi": { doi: "10.3389/fdgth.2026.1910212", url: "https://doi.org/10.3389/fdgth.2026.1910212", verification: "primary-abstract", basis: "Frontiers 正式文章核验" },
  "ppgbp-044-validation-of-ring-type-cuffless-blood-pressure-monitoring-device-for-de": { doi: "10.1038/s41440-026-02759-6", url: "https://www.nature.com/articles/s41440-026-02759-6", verification: "primary-full-text", basis: "Hypertension Research 正式文章核验", displayYear: "2025 摘要 / 2026 期刊", note: "该研究先有 2025 年会议摘要；当前记录对应 2026 年正式期刊文章。" },
  "ppgbp-046-in-hospital-stroke-prediction-from-ppg-derived-hemodynamic-features": { url: "https://arxiv.org/abs/2602.09328", venue: "arXiv", verification: "primary-abstract", basis: "arXiv 题名与首次提交日期核验" },
  "ppgbp-058-photoplethysmography-for-heart-rate-and-rhythm-monitoring-current-eviden": { doi: "10.1016/j.jacep.2026.06.034", url: "https://doi.org/10.1016/j.jacep.2026.06.034", venue: "JACC: Clinical Electrophysiology", verification: "primary-abstract", basis: "JACC 正式文章核验" },
};

function preliminarySummary(record) {
  const focus = record.topics
    .slice(0, 4)
    .map((topic) => topicZh[topic] ?? topic)
    .join("、");
  return {
    goal: `这篇记录关注${focus || "PPG 心血管研究"}。当前数据库只完成题录和研究方向收录。`,
    method: "尚未完成全文方法核验，暂不展示模型结构、预处理或训练流程，避免把标题推断当成论文事实。",
    results: "尚未核对样本量、误差指标、对照组和统计结果，因此不提供定量性能结论。",
    conclusion: "现阶段只能确认研究方向，不能据此判断模型优劣、临床准确性或真实可部署性。",
    takeaway: "可作为后续阅读线索；在完成全文核验前，不应作为工程选型或临床证据。",
    deployment: "推理输入来自题录初步标注，校准要求和真实部署条件仍待全文确认。",
    leakage: "反归一化、对齐、切窗、质量筛选、校准以及 window/subject leakage 均待全文级审计。",
  };
}

export function enrichDatabase(database) {
  database.records = database.records.map((record) => {
    const publication = publicationOverrides[record.id] ?? {};
    return {
      ...record,
      source: {
        ...record.source,
        ...(publication.venue ? { venue: publication.venue } : {}),
        ...(publication.doi ? { doi: publication.doi } : {}),
        ...(publication.url ? { url: publication.url } : {}),
        ...(publication.verification ? { verification: publication.verification } : {}),
      },
      publication_audit: {
        status: "verified",
        verified_year: record.year,
        display_year: publication.displayYear ?? String(record.year),
        checked_on: "2026-08-24",
        basis: publication.basis ?? (record.audit_status === "preliminary-index" ? "Crossref 精确题名与出版年份核验" : "此前重点深审记录"),
        note: publication.note ?? "当前年份按本记录所对应的正式文章或预印本版本填写。",
      },
      study_summary: {
        ...(reviewed[record.id] ?? preliminarySummary(record)),
        evidence_status: record.audit_status === "priority-reviewed" ? "已完成重点深审" : "题录年份已核验 · 全文待审",
      },
    };
  });
  database.reviewed_count = database.records.filter((record) => record.audit_status === "priority-reviewed").length;
  database.record_count = database.records.length;
  return database;
}

const csvColumns = [
  "id", "title", "year", "first_reported_in_daily", "record_type", "source_venue", "doi", "url", "source_verification",
  "topics", "datasets", "input_signals", "model_method", "main_results",
  "study_goal_zh", "method_summary_zh", "result_summary_zh", "conclusion_summary_zh", "takeaway_zh", "deployment_summary_zh", "leakage_summary_zh", "content_status_zh",
  "publication_year_status", "publication_year_display", "publication_year_basis", "publication_year_note",
  "calibration_type", "calibration_points", "calibration_timing", "calibration_notes", "subject_split", "subject_split_notes",
  "external_validation", "external_dataset_or_cohort", "external_validation_notes", "deployability", "deployment_judgment", "inference_inputs",
  "current_reference_bp_required", "deployment_notes", "leakage_risk", "abp_bp_denormalization", "abp_bp_alignment", "abp_bp_windowing",
  "abp_bp_quality_filtering", "target_dependent_calibration", "window_leakage", "subject_leakage", "leakage_notes", "audit_status", "evidence_checked_on", "notes",
];

const csvEscape = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function databaseToCsv(database) {
  const rows = database.records.map((record) => ({
    id: record.id,
    title: record.title,
    year: record.year,
    first_reported_in_daily: record.first_reported_in_daily,
    record_type: record.record_type,
    source_venue: record.source.venue,
    doi: record.source.doi,
    url: record.source.url,
    source_verification: record.source.verification,
    topics: record.topics.join(" | "),
    datasets: record.datasets.join(" | "),
    input_signals: record.input_signals.join(" | "),
    model_method: record.model_method,
    main_results: record.main_results,
    study_goal_zh: record.study_summary.goal,
    method_summary_zh: record.study_summary.method,
    result_summary_zh: record.study_summary.results,
    conclusion_summary_zh: record.study_summary.conclusion,
    takeaway_zh: record.study_summary.takeaway,
    deployment_summary_zh: record.study_summary.deployment,
    leakage_summary_zh: record.study_summary.leakage,
    content_status_zh: record.study_summary.evidence_status,
    publication_year_status: record.publication_audit.status,
    publication_year_display: record.publication_audit.display_year,
    publication_year_basis: record.publication_audit.basis,
    publication_year_note: record.publication_audit.note,
    calibration_type: record.calibration.type,
    calibration_points: record.calibration.points,
    calibration_timing: record.calibration.timing,
    calibration_notes: record.calibration.notes,
    subject_split: record.subject_split.status,
    subject_split_notes: record.subject_split.notes,
    external_validation: record.external_validation.status,
    external_dataset_or_cohort: record.external_validation.dataset_or_cohort,
    external_validation_notes: record.external_validation.notes,
    deployability: record.deployment.level,
    deployment_judgment: record.deployment.judgment,
    inference_inputs: record.deployment.inference_inputs.join(" | "),
    current_reference_bp_required: record.deployment.current_reference_bp_required,
    deployment_notes: record.deployment.notes,
    leakage_risk: record.leakage_audit.risk_level,
    abp_bp_denormalization: record.leakage_audit.abp_bp_denormalization,
    abp_bp_alignment: record.leakage_audit.abp_bp_alignment,
    abp_bp_windowing: record.leakage_audit.abp_bp_windowing,
    abp_bp_quality_filtering: record.leakage_audit.abp_bp_quality_filtering,
    target_dependent_calibration: record.leakage_audit.target_dependent_calibration,
    window_leakage: record.leakage_audit.window_leakage,
    subject_leakage: record.leakage_audit.subject_leakage,
    leakage_notes: record.leakage_audit.notes,
    audit_status: record.audit_status,
    evidence_checked_on: record.evidence_checked_on,
    notes: record.notes,
  }));
  return `${csvColumns.join(",")}\n${rows.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

export async function enrichFile(filePath) {
  const database = JSON.parse(await readFile(filePath, "utf8"));
  const enriched = enrichDatabase(database);
  await writeFile(filePath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  await writeFile(resolve(dirname(filePath), "papers.csv"), databaseToCsv(enriched), "utf8");
}

if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll("\\", "/").toLowerCase())) {
  const targets = process.argv.slice(2);
  if (!targets.length) throw new Error("Provide at least one papers.json path");
  for (const target of targets) await enrichFile(target);
}
