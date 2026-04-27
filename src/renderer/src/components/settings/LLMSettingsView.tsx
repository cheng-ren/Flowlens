import React, { useEffect, useState } from "react";
import { C } from "../../styles";

const DEFAULT = {
  baseUrl: "http://localhost:11434",
  apiKey: "",
  model: "qwen2.5:7b",
};

const PRESETS = [
  {
    label: "Ollama 本地",
    baseUrl: "http://localhost:11434",
    model: "qwen2.5:7b",
    apiKey: "",
  },
  {
    label: "阿里百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    apiKey: "",
  },
  {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "",
  },
  {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "",
  },
];

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
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.text2,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: C.text3,
  marginTop: 5,
  lineHeight: 1.5,
};

export function LLMSettingsView() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT.baseUrl);
  const [apiKey, setApiKey]   = useState(DEFAULT.apiKey);
  const [model, setModel]     = useState(DEFAULT.model);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus]   = useState<"idle" | "saved" | "error">("idle");
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg]     = useState("");

  useEffect(() => {
    // @ts-ignore
    window.api.getLlmConfig().then((cfg: typeof DEFAULT) => {
      setBaseUrl(cfg.baseUrl || DEFAULT.baseUrl);
      setApiKey(cfg.apiKey  || "");
      setModel(cfg.model    || DEFAULT.model);
    });
  }, []);

  const handleTest = async () => {
    setTestState("testing");
    setTestMsg("");
    try {
      // @ts-ignore
      const result: { ok: boolean; reply?: string; error?: string } = await window.api.testLlmConfig({ baseUrl, apiKey, model });
      if (result.ok) {
        setTestState("ok");
        setTestMsg(result.reply || "连接成功");
      } else {
        setTestState("fail");
        setTestMsg(result.error || "连接失败");
      }
    } catch (e: any) {
      setTestState("fail");
      setTestMsg(e?.message || "未知错误");
    }
  };

  const handleSave = async () => {
    try {
      // @ts-ignore
      await window.api.saveLlmConfig({ baseUrl, apiKey, model });
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const isOllama = baseUrl.includes("11434") || !apiKey;

  return (
    <div style={{ padding: 30, maxWidth: 520 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: 17, fontWeight: 600, color: C.text1 }}>
          AI 分类设置
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.text2 }}>
          用于商品账单的自动分类，默认使用本机 Ollama。
        </p>
      </div>

      {/* 快速选择服务商 */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>快速选择服务商</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRESETS.map((p) => {
            const active = baseUrl.trim() === p.baseUrl;
            return (
              <button
                key={p.label}
                onClick={() => {
                  setBaseUrl(p.baseUrl);
                  setModel(p.model);
                  if (p.apiKey) setApiKey(p.apiKey);
                  setTestState("idle");
                  setTestMsg("");
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 20,
                  border: `1px solid ${active ? C.accent : C.borderMd}`,
                  background: active ? `${C.accent}18` : "transparent",
                  color: active ? C.accent : C.text2,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = C.accent;
                    e.currentTarget.style.color = C.text1;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = C.borderMd;
                    e.currentTarget.style.color = C.text2;
                  }
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Base URL */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>Base URL</span>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={DEFAULT.baseUrl}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e)  => (e.target.style.borderColor = C.borderMd)}
        />
        <p style={hintStyle}>
          {isOllama
            ? "Ollama 本地模式，无需 API Key"
            : "OpenAI 兼容接口，请填写 /v1 结尾的地址，例如 https://api.deepseek.com/v1"}
        </p>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>
          API Key
          <span style={{ color: C.text3, marginLeft: 6, fontWeight: 400, textTransform: "none" }}>
            （Ollama 本地可留空）
          </span>
        </span>
        <div style={{ position: "relative" }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{ ...inputStyle, paddingRight: 44 }}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e)  => (e.target.style.borderColor = C.borderMd)}
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
              color: C.text3,
              cursor: "pointer",
              fontSize: 14,
              padding: 2,
            }}
          >
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* 模型名称 */}
      <div style={{ marginBottom: 28 }}>
        <span style={labelStyle}>模型名称</span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={DEFAULT.model}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e)  => (e.target.style.borderColor = C.borderMd)}
        />
        <p style={hintStyle}>
          Ollama 示例：qwen2.5:7b、llama3.2&emsp;|&emsp;云端示例：deepseek-chat、gpt-4o-mini
        </p>
      </div>

      {/* 操作按钮行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* 测试按钮 */}
        <button
          onClick={handleTest}
          disabled={testState === "testing"}
          style={{
            padding: "9px 20px",
            background: "transparent",
            border: `1px solid ${testState === "ok" ? C.green : testState === "fail" ? C.red : C.borderMd}`,
            borderRadius: 8,
            color: testState === "ok" ? C.green : testState === "fail" ? C.red : C.text2,
            fontSize: 13,
            fontWeight: 500,
            cursor: testState === "testing" ? "default" : "pointer",
            transition: "all 0.15s",
            opacity: testState === "testing" ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (testState !== "testing") e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.text1; }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = testState === "ok" ? C.green : testState === "fail" ? C.red : C.borderMd;
            e.currentTarget.style.color = testState === "ok" ? C.green : testState === "fail" ? C.red : C.text2;
          }}
        >
          {testState === "testing" ? "测试中…" : "测试连接"}
        </button>

        {/* 保存按钮 */}
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
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          保存
        </button>

        {status === "saved" && (
          <span style={{ fontSize: 13, color: C.green }}>✓ 已保存</span>
        )}
        {status === "error" && (
          <span style={{ fontSize: 13, color: C.red }}>保存失败</span>
        )}
      </div>

      {/* 测试结果 */}
      {testMsg && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: testState === "ok"
              ? "rgba(62,207,142,0.07)"
              : "rgba(248,81,73,0.07)",
            border: `1px solid ${testState === "ok" ? "rgba(62,207,142,0.2)" : "rgba(248,81,73,0.2)"}`,
            fontSize: 13,
            color: testState === "ok" ? C.green : C.red,
            lineHeight: 1.6,
            wordBreak: "break-all",
          }}
        >
          {testState === "ok" ? "✓ 连接成功，模型回复：" : "✕ 连接失败："}
          <span style={{ color: C.text2, marginLeft: 4 }}>{testMsg}</span>
        </div>
      )}

      {/* 提示 */}
      <div
        style={{
          marginTop: 28,
          padding: "14px 16px",
          background: C.bgSurface,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.9 }}>
          <strong style={{ color: C.text2 }}>本地 Ollama（推荐，免费）</strong>
          <br />
          安装 Ollama 后运行：<code style={{ color: C.accentSoft }}>ollama pull qwen2.5:7b</code>，无需填写 API Key。
          <br /><br />
          <strong style={{ color: C.text2 }}>阿里百炼</strong>
          <br />
          Base URL 填 <code style={{ color: C.accentSoft }}>https://dashscope.aliyuncs.com/compatible-mode/v1</code>，
          填入百炼 API Key，模型填 <code style={{ color: C.accentSoft }}>qwen-plus</code> 或 <code style={{ color: C.accentSoft }}>qwen-turbo</code>。
          <br /><br />
          <strong style={{ color: C.text2 }}>DeepSeek / OpenAI</strong>
          <br />
          Base URL 填 <code style={{ color: C.accentSoft }}>https://api.deepseek.com/v1</code>，
          填入 API Key，模型填 <code style={{ color: C.accentSoft }}>deepseek-chat</code>。
        </div>
      </div>
    </div>
  );
}
