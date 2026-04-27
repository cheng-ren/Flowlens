import React, { useEffect, useState } from "react";
import { C } from "../../styles";

interface BankProfile {
  id: string;
  name: string;
  file_type: string | null;
  import_script: string | null;
  script_description: string | null;
  created_at: string;
  updated_at: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: C.bgSurface,
  border: `1px solid ${C.borderMd}`,
  borderRadius: 8,
  color: C.text1,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

interface BankProfilesViewProps {
  onProfilesChanged?: () => void;
}

export function BankProfilesView({ onProfilesChanged }: BankProfilesViewProps) {
  const [profiles, setProfiles] = useState<BankProfile[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScriptId, setShowScriptId] = useState<string | null>(null);

  const loadProfiles = async () => {
    // @ts-ignore
    const data = await window.api.bankGetProfiles();
    setProfiles(data || []);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    // @ts-ignore
    await window.api.bankCreateProfile({ name });
    setNewName("");
    setAdding(false);
    await loadProfiles();
    onProfilesChanged?.();
  };

  const handleDelete = async (profile: BankProfile) => {
    if (!window.confirm(`确定删除银行【${profile.name}】及其所有流水数据吗？`)) return;
    // @ts-ignore
    await window.api.bankDeleteProfile(profile.id);
    await loadProfiles();
    onProfilesChanged?.();
  };

  const FILE_TYPE_LABEL: Record<string, string> = {
    pdf: "PDF",
    csv: "CSV",
    xlsx: "Excel",
    xls: "Excel",
    txt: "文本",
  };

  return (
    <div style={{ padding: 30, maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: 17, fontWeight: 600, color: C.text1 }}>
          银行账户
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.text2 }}>
          添加您的银行卡，首次导入流水时 AI 会自动分析文件格式并生成解析脚本。
        </p>
      </div>

      {/* 添加新银行 */}
      <div
        style={{
          background: C.bgSurface,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          padding: "16px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, color: C.text2, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          添加银行
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：招商银行工资卡、工商银行"
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.borderMd)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            style={{
              padding: "9px 22px",
              background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: adding || !newName.trim() ? "default" : "pointer",
              opacity: adding || !newName.trim() ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            添加
          </button>
        </div>
      </div>

      {/* 银行列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {profiles.length === 0 && (
          <div
            style={{
              padding: "28px 24px",
              textAlign: "center",
              color: C.text3,
              background: C.bgSurface,
              borderRadius: 10,
              border: `1px dashed ${C.borderMd}`,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏦</div>
            <div style={{ fontSize: 13 }}>还没有添加银行账户</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              添加后即可在左侧导航栏中选择对应银行导入流水
            </div>
          </div>
        )}

        {profiles.map((profile) => (
          <div
            key={profile.id}
            style={{
              background: C.bgSurface,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  🏦
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>
                    {profile.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
                    {profile.import_script ? (
                      <span style={{ color: C.green }}>
                        ✓ 已有解析脚本
                        {profile.file_type && ` · ${FILE_TYPE_LABEL[profile.file_type] ?? profile.file_type}`}
                      </span>
                    ) : (
                      <span style={{ color: C.text3 }}>未配置脚本 · 首次导入时 AI 自动生成</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {profile.import_script && (
                  <button
                    onClick={() => setShowScriptId(showScriptId === profile.id ? null : profile.id)}
                    style={{
                      padding: "6px 14px",
                      background: "transparent",
                      border: `1px solid ${C.borderMd}`,
                      borderRadius: 7,
                      color: C.text2,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {showScriptId === profile.id ? "收起脚本" : "查看脚本"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(profile)}
                  style={{
                    padding: "6px 14px",
                    background: "transparent",
                    border: `1px solid rgba(248,81,73,0.3)`,
                    borderRadius: 7,
                    color: "#f85149",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  删除
                </button>
              </div>
            </div>

            {/* 脚本展示区 */}
            {showScriptId === profile.id && profile.import_script && (
              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  padding: "14px 16px",
                  background: "#0d1117",
                }}
              >
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  解析脚本（可分享给他人使用）
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "#8b949e",
                    lineHeight: 1.6,
                    overflowX: "auto",
                    maxHeight: 240,
                    overflowY: "auto",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {profile.import_script}
                </pre>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile.import_script!);
                    }}
                    style={{
                      padding: "5px 14px",
                      background: "transparent",
                      border: `1px solid ${C.borderMd}`,
                      borderRadius: 6,
                      color: C.text2,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    复制脚本
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 说明 */}
      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          background: C.bgSurface,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.9 }}>
          <strong style={{ color: C.text2 }}>使用说明</strong>
          <br />
          1. 点击"添加银行"输入银行名称（如"工商银行储蓄卡"）
          <br />
          2. 在左侧导航栏中点击该银行，然后点击"导入流水"
          <br />
          3. 选择银行导出的流水文件（支持 PDF / CSV / Excel）
          <br />
          4. AI 自动分析文件格式，生成解析脚本，预览数据无误后确认导入
          <br />
          5. 脚本保存后，下次导入同格式文件无需重新分析
        </div>
      </div>
    </div>
  );
}
