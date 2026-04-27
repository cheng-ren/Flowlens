import { useState, useEffect, useRef } from "react";
import { C } from "../../styles";

interface WizardProps {
  profileId: string;
  profileName: string;
  onClose: () => void;
  onImported: () => void;
}

// 拆分成更细的步骤，让用户能看到每阶段进度
type Step =
  | "idle"           // 初始状态
  | "reading"        // 正在读取文件（快，通常 <2s）
  | "file_ready"     // 文件已读取，等待用户确认开始 AI 分析（或已有脚本直接进 preview）
  | "generating"     // AI 正在生成脚本（慢，可能 10-120s）
  | "preview"        // 预览解析结果
  | "importing"      // 正在写入数据库
  | "done"           // 完成
  | "error";         // 出错

interface FileInfo {
  filePath: string;
  fileType: string;
  fileContent: string;       // 用于传给 LLM 及执行脚本
  script?: string;           // 若已有可用脚本
  previewRows?: TxRow[];
  totalRows?: number;
  fromCache?: boolean;
}

interface TxRow {
  date: string;
  amount: number;
  type: string;
  balance: number;
  description: string;
  counterparty: string;
}

const COLS = ["日期", "收/支", "金额", "余额", "摘要", "对手方"];
const FILE_TYPE_ICON: Record<string, string> = { pdf: "📄", csv: "📊", xlsx: "📊", xls: "📊", txt: "📝" };

export function BankImportWizard({ profileId, profileName, onClose, onImported }: WizardProps) {
  const [step, setStep] = useState<Step>("idle");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [scriptEditing, setScriptEditing] = useState(false);
  const [previewRows, setPreviewRows] = useState<TxRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [importCount, setImportCount] = useState(0);
  const [repreviewing, setRepreviewing] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const [scriptError, setScriptError] = useState("");

  // 计时器：显示 AI 已等待多少秒
  const [waitSeconds, setWaitSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "generating") {
      setWaitSeconds(0);
      timerRef.current = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // ── 第一步：选择并读取文件 ─────────────────────────────────────────────────
  const handlePickFile = async () => {
    setStep("reading");
    setErrorMsg("");
    try {
      // @ts-ignore
      const result = await window.api.bankPickFile({ profileId });

      if (result.canceled) { setStep("idle"); return; }
      if (result.error) { setErrorMsg(result.error); setStep("error"); return; }

      setFileInfo(result);

      // 已有可用脚本 → 直接跳到预览
      if (result.fromCache && result.script) {
        setScript(result.script);
        setPreviewRows(result.previewRows || []);
        setTotalRows(result.totalRows || 0);
        setStep("preview");
        return;
      }

      // 需要 AI 生成脚本 → 先进入 file_ready 状态，让用户看到文件信息后再启动 AI
      setStep("file_ready");
    } catch (e: any) {
      setErrorMsg(e.message || "读取文件出错");
      setStep("error");
    }
  };

  // ── 第二步：调用 AI 生成解析脚本 ──────────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!fileInfo) return;
    setStep("generating");
    setScriptError("");
    try {
      // @ts-ignore
      const result = await window.api.bankGenerateScript({
        filePath: fileInfo.filePath,
        fileType: fileInfo.fileType,
        fileContent: fileInfo.fileContent,
      });

      if (result.error) { setErrorMsg(result.error); setStep("error"); return; }

      setScript(result.script || "");
      setPreviewRows(result.previewRows || []);
      setTotalRows(result.totalRows || 0);
      setFileInfo((prev) => prev ? { ...prev, script: result.script } : prev);

      // 脚本生成成功但执行报错 → 进入 preview，提示用户手动修改脚本
      if (result.scriptError) {
        setScriptError(result.scriptError);
        setShowScript(true);
      }
      setStep("preview");
    } catch (e: any) {
      setErrorMsg(e.message || "AI 分析失败");
      setStep("error");
    }
  };

  // ── 重新预览（用户修改脚本后）─────────────────────────────────────────────
  const handleRepreview = async () => {
    if (!fileInfo) return;
    setRepreviewing(true);
    try {
      // @ts-ignore
      const result = await window.api.bankPreviewWithScript({
        filePath: fileInfo.filePath,
        script,
        fileType: fileInfo.fileType,
      });
      if (result.ok) {
        setPreviewRows(result.previewRows || []);
        setTotalRows(result.totalRows || 0);
      } else {
        alert("脚本执行出错：" + result.error);
      }
    } finally {
      setRepreviewing(false);
    }
  };

  // ── 确认导入 ───────────────────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!fileInfo) return;
    setStep("importing");
    try {
      // @ts-ignore
      const result = await window.api.bankImportConfirmed({
        profileId,
        filePath: fileInfo.filePath,
        script,
        fileType: fileInfo.fileType,
      });
      if (result.error) { setErrorMsg(result.error); setStep("error"); return; }
      setImportCount(result.count || 0);
      setStep("done");
      onImported();
    } catch (e: any) {
      setErrorMsg(e.message || "导入失败");
      setStep("error");
    }
  };

  const isBusy = step === "reading" || step === "generating" || step === "importing";

  const fileTypeName = (t?: string) => {
    const map: Record<string, string> = { pdf: "PDF", csv: "CSV", xlsx: "Excel", xls: "Excel", txt: "文本" };
    return map[t || ""] ?? (t?.toUpperCase() || "文件");
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 60000, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose(); }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { transform: scale(0.96) translateY(6px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>
      <div
        style={{
          width: 720, maxWidth: "96vw", maxHeight: "88vh",
          background: C.bgBase, borderRadius: 14, border: `1px solid ${C.borderMd}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
          animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* ── 头部 ── */}
        <div style={{ padding: "18px 22px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text1 }}>
              导入流水 · {profileName}
            </div>
            <StepHint step={step} waitSeconds={waitSeconds} fileInfo={fileInfo} />
          </div>
          {!isBusy && (
            <button
              onClick={onClose}
              style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(240,246,255,0.06)", border: `1px solid ${C.border}`, color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* ── 进度条 ── */}
        <StepProgressBar step={step} />

        {/* ── 内容区 ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 22px" }}>

          {/* 初始状态 */}
          {step === "idle" && (
            <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
              <div style={{ fontSize: 14, color: C.text1, fontWeight: 500, marginBottom: 8 }}>选择 {profileName} 的流水文件</div>
              <div style={{ fontSize: 13, color: C.text3, marginBottom: 28, lineHeight: 1.8 }}>
                支持 PDF、CSV、Excel（.xlsx/.xls）等格式<br />
                AI 会自动分析文件格式，生成专属解析脚本
              </div>
              <button onClick={handlePickFile} style={primaryBtnStyle}>
                选择文件
              </button>
            </div>
          )}

          {/* 读取文件中 */}
          {step === "reading" && (
            <SpinnerView title="正在读取文件..." hint="解析文件内容，通常在 1-2 秒内完成" />
          )}

          {/* 文件已就绪，等待启动 AI */}
          {step === "file_ready" && fileInfo && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>
                {FILE_TYPE_ICON[fileInfo.fileType] ?? "📄"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 6 }}>
                文件已读取
              </div>
              <div
                style={{
                  display: "inline-block", padding: "6px 14px", marginBottom: 20,
                  background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}`,
                  fontSize: 12, color: C.text2,
                }}
              >
                {fileInfo.filePath.split(/[/\\]/).pop()} · {fileTypeName(fileInfo.fileType)}
              </div>
              <div style={{ fontSize: 13, color: C.text3, marginBottom: 20, lineHeight: 1.8 }}>
                此银行尚无解析脚本，需要调用 AI 分析文件格式。<br />
                <span style={{ color: "#fbbf24" }}>⏱ AI 生成通常需要 10~60 秒</span>，请耐心等待
              </div>

              {/* 查看原始内容（帮助诊断 PDF 提取质量） */}
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setShowRawContent((v) => !v)}
                  style={{ ...secondaryBtnStyle, fontSize: 12, padding: "5px 14px" }}
                >
                  {showRawContent ? "收起" : "查看 AI 收到的原始内容"}
                </button>
                {showRawContent && (
                  <pre
                    style={{
                      marginTop: 10, padding: "10px 14px", textAlign: "left",
                      background: "#0d1117", borderRadius: 8, border: `1px solid ${C.border}`,
                      fontSize: 11, color: "#c9d1d9", lineHeight: 1.6,
                      maxHeight: 220, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                    }}
                  >
                    {fileInfo.fileContent.split("\n").slice(0, 50).join("\n")}
                    {fileInfo.fileContent.split("\n").length > 50 && "\n...(仅显示前50行)"}
                  </pre>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => setStep("idle")} style={secondaryBtnStyle}>
                  重新选择文件
                </button>
                <button onClick={handleGenerateScript} style={primaryBtnStyle}>
                  开始 AI 分析
                </button>
              </div>
            </div>
          )}

          {/* AI 生成中 */}
          {step === "generating" && (
            <SpinnerView
              title="AI 正在生成解析脚本…"
              hint={waitSeconds < 15
                ? "正在分析文件格式，即将完成..."
                : waitSeconds < 45
                ? `已等待 ${waitSeconds} 秒，AI 正在处理中，请继续等待...`
                : `已等待 ${waitSeconds} 秒，若 Ollama 是首次加载模型可能较慢，请耐心等待`}
              accent={waitSeconds >= 45 ? "#fbbf24" : undefined}
            />
          )}

          {/* 预览 */}
          {step === "preview" && fileInfo && (
            <>
              {scriptError && (
                <div
                  style={{
                    marginBottom: 16, padding: "10px 14px",
                    background: "rgba(248,81,73,0.08)", borderRadius: 8,
                    border: "1px solid rgba(248,81,73,0.25)",
                    fontSize: 12, color: "#f85149", lineHeight: 1.6,
                  }}
                >
                  <strong>脚本执行报错（AI 已自动重试）：</strong>{scriptError}
                  <br />
                  <span style={{ color: C.text3 }}>
                    请在下方修改脚本后点击"重新预览"，或点击底部"重新 AI 分析"再试一次。
                  </span>
                </div>
              )}
            <PreviewPanel
              fromCache={fileInfo.fromCache ?? false}
              previewRows={previewRows}
              totalRows={totalRows}
              script={script}
              setScript={setScript}
              showScript={showScript}
              setShowScript={setShowScript}
              scriptEditing={scriptEditing}
              setScriptEditing={setScriptEditing}
              repreviewing={repreviewing}
              onRepreview={handleRepreview}
            />
            </>
          )}

          {/* 导入中 */}
          {step === "importing" && (
            <SpinnerView title="正在写入数据库..." hint="即将完成" accent={C.green} />
          )}

          {/* 完成 */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text1, marginBottom: 8 }}>导入成功！</div>
              <div style={{ fontSize: 13, color: C.text3, marginBottom: 24 }}>
                共导入 <strong style={{ color: C.text1 }}>{importCount}</strong> 条流水记录<br />
                解析脚本已保存，下次导入同格式文件直接使用
              </div>
              <button onClick={onClose} style={primaryBtnStyle}>关闭</button>
            </div>
          )}

          {/* 错误 */}
          {step === "error" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f85149", marginBottom: 10 }}>发生错误</div>
              <div
                style={{
                  padding: "12px 16px", background: "rgba(248,81,73,0.08)",
                  borderRadius: 8, border: "1px solid rgba(248,81,73,0.2)",
                  color: "#f85149", fontSize: 13, textAlign: "left",
                  marginBottom: 20, wordBreak: "break-all",
                }}
              >
                {errorMsg}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setStep("idle")} style={secondaryBtnStyle}>重新开始</button>
                {fileInfo?.fileContent && (
                  <button onClick={handleGenerateScript} style={primaryBtnStyle}>
                    重试 AI 分析
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 底部确认栏（仅 preview 状态显示）── */}
        {step === "preview" && (
          <div
            style={{
              padding: "14px 22px", borderTop: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0, background: C.bgSurface,
            }}
          >
            <div style={{ fontSize: 12, color: C.text3 }}>
              {previewRows.length > 0
                ? `数据正确吗？确认后将导入全部 ${totalRows} 条记录`
                : "请修复脚本使其能正确解析数据后再导入"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("idle")} style={secondaryBtnStyle}>
                重新选择文件
              </button>
              {fileInfo?.fileContent && (
                <button onClick={handleGenerateScript} style={secondaryBtnStyle}>
                  重新 AI 分析
                </button>
              )}
              <button
                onClick={handleConfirmImport}
                disabled={previewRows.length === 0}
                style={{
                  padding: "9px 26px",
                  background: previewRows.length === 0 ? "#334155" : `linear-gradient(135deg, ${C.green}, #059669)`,
                  border: "none", borderRadius: 8,
                  color: previewRows.length === 0 ? C.text3 : "white",
                  fontSize: 13, fontWeight: 600,
                  cursor: previewRows.length === 0 ? "default" : "pointer",
                }}
              >
                确认导入 {totalRows > 0 ? `(${totalRows} 条)` : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 辅助组件 ───────────────────────────────────────────────────────────────────

function StepHint({ step, waitSeconds, fileInfo }: { step: Step; waitSeconds: number; fileInfo: FileInfo | null }) {
  const hints: Partial<Record<Step, string>> = {
    idle: "选择文件，AI 自动分析格式并生成解析脚本",
    reading: "正在读取文件内容...",
    file_ready: "文件已就绪，可开始 AI 分析",
    generating: waitSeconds > 0 ? `AI 生成脚本中，已等待 ${waitSeconds} 秒...` : "正在调用 AI 分析文件格式...",
    preview: fileInfo?.fromCache ? "复用已有脚本解析，请确认数据是否正确" : "AI 已生成解析脚本，请核对数据后导入",
    importing: "正在写入数据库...",
    done: "导入完成",
    error: "发生错误",
  };
  return (
    <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>
      {hints[step] ?? ""}
    </div>
  );
}

const STEP_ORDER: Step[] = ["idle", "reading", "file_ready", "generating", "preview", "importing", "done"];

function StepProgressBar({ step }: { step: Step }) {
  if (step === "error") return null;
  const steps = [
    { key: "file_ready" as Step, label: "选择文件" },
    { key: "generating" as Step, label: "AI 分析" },
    { key: "preview" as Step, label: "预览确认" },
    { key: "done" as Step, label: "导入完成" },
  ];
  const currentIdx = STEP_ORDER.indexOf(step);
  const getStatus = (key: Step) => {
    const keyIdx = STEP_ORDER.indexOf(key);
    if (currentIdx > keyIdx) return "done";
    if (currentIdx === keyIdx || (key === "file_ready" && (step === "reading" || step === "file_ready"))) return "active";
    return "pending";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 22px 0", gap: 0, flexShrink: 0 }}>
      {steps.map((s, i) => {
        const status = getStatus(s.key);
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: status === "done" ? C.green : status === "active" ? C.accent : C.bgSurface,
                  border: `2px solid ${status === "done" ? C.green : status === "active" ? C.accent : C.borderMd}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: status === "pending" ? C.text3 : "white", fontWeight: 700,
                  transition: "all 0.3s",
                }}
              >
                {status === "done" ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 10, color: status === "pending" ? C.text3 : status === "active" ? C.accent : C.green, whiteSpace: "nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: status === "done" ? C.green : C.border, margin: "0 4px 16px", transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SpinnerView({ title, hint, accent }: { title: string; hint: string; accent?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div
        style={{
          width: 44, height: 44, borderRadius: "50%",
          border: `3px solid ${C.border}`,
          borderTopColor: accent ?? C.accent,
          animation: "spin 0.9s linear infinite",
          margin: "0 auto 18px",
        }}
      />
      <div style={{ fontSize: 14, color: C.text1, fontWeight: 500, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.text3, maxWidth: 380, margin: "0 auto", lineHeight: 1.7 }}>{hint}</div>
    </div>
  );
}

function PreviewPanel({
  fromCache, previewRows, totalRows, script, setScript,
  showScript, setShowScript, scriptEditing, setScriptEditing,
  repreviewing, onRepreview,
}: {
  fromCache: boolean; previewRows: TxRow[]; totalRows: number;
  script: string; setScript: (s: string) => void;
  showScript: boolean; setShowScript: (v: boolean) => void;
  scriptEditing: boolean; setScriptEditing: (v: boolean) => void;
  repreviewing: boolean; onRepreview: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
            background: fromCache ? `${C.green}22` : `${C.accent}22`,
            color: fromCache ? C.green : C.accent,
            border: `1px solid ${fromCache ? C.green : C.accent}44`,
          }}
        >
          {fromCache ? "✓ 复用已有脚本" : "✨ AI 新生成脚本"}
        </span>
        <span style={{ fontSize: 12, color: C.text3 }}>
          共解析出 <strong style={{ color: C.text1 }}>{totalRows}</strong> 条流水
          {totalRows > 15 && "，下方显示前 15 条"}
        </span>
      </div>

      {previewRows.length > 0 ? (
        <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0d1117", color: C.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {COLS.map((col) => <th key={col} style={{ padding: "9px 12px", textAlign: "left" }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => {
                const isIn = row.type === "收入";
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "9px 12px", color: C.text3, whiteSpace: "nowrap" }}>{row.date}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: isIn ? "#34d39922" : "#f472b622", color: isIn ? "#34d399" : "#f472b6" }}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: isIn ? "#34d399" : "#f472b6", whiteSpace: "nowrap" }}>
                      {isIn ? "+" : "-"}¥{(Number(row.amount) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#fbbf24", whiteSpace: "nowrap" }}>
                      {row.balance ? `¥${(Number(row.balance) || 0).toFixed(2)}` : "-"}
                    </td>
                    <td style={{ padding: "9px 12px", color: C.text2, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.description || "-"}
                    </td>
                    <td style={{ padding: "9px 12px", color: C.text3, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.counterparty || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "24px", textAlign: "center", color: C.text3, background: C.bgSurface, borderRadius: 8, border: `1px dashed ${C.borderMd}`, marginBottom: 14 }}>
          未解析出有效数据，请展开脚本编辑后重试
        </div>
      )}

      {/* 脚本查看/编辑 */}
      <div style={{ background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <button
          onClick={() => setShowScript(!showScript)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "transparent", border: "none", color: C.text2, fontSize: 12, cursor: "pointer", fontWeight: 500 }}
        >
          <span>解析脚本（可查看 / 编辑 / 分享）</span>
          <span style={{ color: C.text3 }}>{showScript ? "▲ 收起" : "▼ 展开"}</span>
        </button>
        {showScript && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: 14 }}>
            {scriptEditing ? (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                style={{ width: "100%", minHeight: 200, background: "#0d1117", border: `1px solid ${C.accent}`, borderRadius: 6, color: "#8b949e", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6, padding: "10px 12px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            ) : (
              <pre style={{ margin: 0, fontSize: 11, color: "#8b949e", lineHeight: 1.6, overflowX: "auto", maxHeight: 200, overflowY: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#0d1117", padding: "10px 12px", borderRadius: 6 }}>
                {script}
              </pre>
            )}
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setScriptEditing(!scriptEditing)} style={tinyBtnStyle}>
                {scriptEditing ? "取消编辑" : "编辑脚本"}
              </button>
              {scriptEditing && (
                <button onClick={onRepreview} disabled={repreviewing} style={{ ...tinyBtnStyle, borderColor: C.accent, color: C.accent, opacity: repreviewing ? 0.5 : 1 }}>
                  {repreviewing ? "解析中..." : "重新解析预览"}
                </button>
              )}
              <button onClick={() => navigator.clipboard.writeText(script)} style={tinyBtnStyle}>
                复制脚本
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 样式常量 ────────────────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 28px",
  background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
  border: "none", borderRadius: 8, color: "white",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "9px 20px", background: "transparent",
  border: `1px solid ${C.borderMd}`, borderRadius: 8,
  color: C.text2, fontSize: 13, cursor: "pointer",
};

const tinyBtnStyle: React.CSSProperties = {
  padding: "5px 12px", background: "transparent",
  border: `1px solid ${C.borderMd}`, borderRadius: 6,
  color: C.text2, fontSize: 11, cursor: "pointer",
};
