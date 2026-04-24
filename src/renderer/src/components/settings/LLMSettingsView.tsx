import React, { useState } from "react";
import { C } from "../../styles";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", icon: "🟢", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic (Claude)", icon: "🟣", placeholder: "sk-ant-..." },
  { id: "deepseek", label: "DeepSeek", icon: "🔵", placeholder: "sk-..." },
  { id: "zhipu", label: "智谱 GLM", icon: "🔶", placeholder: "..." },
  { id: "custom", label: "自定义", icon: "⚙️", placeholder: "sk-..." },
];

const MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-3-5-haiku-20241022",
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  zhipu: ["glm-4-flash", "glm-4-air", "glm-4"],
  custom: [],
};

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
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.text3,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

export function LLMSettingsView() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleProviderChange = (id: string) => {
    setProvider(id);
    const models = MODELS[id];
    setModel(models?.[0] ?? "");
    if (id !== "custom") setBaseUrl("");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === provider);
  const availableModels = MODELS[provider] ?? [];

  return (
    <div style={{ padding: 30, maxWidth: 560 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: 17, fontWeight: 600, color: C.text1 }}>
          大模型设置
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.text2 }}>
          配置用于账单分析与报表生成的 AI 大模型接入信息
        </p>
      </div>

      {/* 提供商选择 */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>模型提供商</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${provider === p.id ? C.accent : C.border}`,
                background: provider === p.id ? C.bgActive : C.bgSurface,
                color: provider === p.id ? C.accentSoft : C.text2,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: provider === p.id ? 500 : 400,
                transition: "all 0.15s",
              }}
            >
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>API Key</span>
        <div style={{ position: "relative" }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={currentProvider?.placeholder ?? "请输入 API Key"}
            style={{ ...inputStyle, paddingRight: 44 }}
            onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#38bdf8")}
            onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#334155")}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 14,
              padding: 2,
            }}
          >
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* 模型选择 */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>使用模型</span>
        {availableModels.length > 0 ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              ...inputStyle,
              appearance: "none",
              WebkitAppearance: "none",
              cursor: "pointer",
            }}
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="请输入模型名称（如 qwen-plus）"
            style={inputStyle}
            onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#38bdf8")}
            onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#334155")}
          />
        )}
      </div>

      {/* 自定义 Base URL（custom 或通用） */}
      <div style={{ marginBottom: 28 }}>
        <span style={labelStyle}>
          Base URL
          <span
            style={{ color: "#334155", marginLeft: 6, fontWeight: 400, textTransform: "none" }}
          >
            （可选，用于代理或本地部署）
          </span>
        </span>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          style={inputStyle}
          onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#38bdf8")}
          onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#334155")}
        />
      </div>

      {/* 保存按钮 */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={handleSave}
          style={{
            padding: "9px 26px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`,
            border: "none",
            borderRadius: 8,
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
        >
          保存设置
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
            ✓ 已保存
          </span>
        )}
      </div>

      {/* 提示卡片 */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: C.bgSurface,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.8 }}>
          <strong style={{ color: C.text3, fontWeight: 600 }}>🔒 安全提示</strong>
          <br />
          API Key 仅存储在本地设备，不会上传至任何服务器。
          <br />
          大模型功能将用于智能分类账单、生成财务报表摘要等场景。
        </div>
      </div>
    </div>
  );
}
