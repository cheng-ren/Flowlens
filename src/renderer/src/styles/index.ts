import type { CSSProperties } from "react";

// ── 设计令牌 ─────────────────────────────────────────────────────────────────
// 参考 GitHub Dark / Linear 深色主题，比 Tailwind slate 更有层次感
export const C = {
  bgBase:    "#0d1117",   // 主背景
  bgSidebar: "#090c12",   // 侧边栏
  bgSurface: "#161b27",   // 卡片/浮层
  bgHover:   "#1c2233",   // 悬停
  bgActive:  "rgba(77,156,240,0.1)",  // 选中背景

  border:    "rgba(240,246,255,0.08)",   // 细边框
  borderMd:  "rgba(240,246,255,0.13)",   // 中等边框

  accent:    "#4d9cf0",   // 主蓝色（比 sky-400 更沉稳）
  accentSoft: "#7bb8f5",  // 浅蓝（选中文字）
  violet:    "#818cf8",   // 紫色（logo 渐变）

  text1: "#e6edf3",   // 主文字
  text2: "#8b949e",   // 次要文字
  text3: "#3d4756",   // 禁用/占位

  green:  "#3ecf8e",
  yellow: "#d29922",
  red:    "#f85149",
} as const;

// ── 全局样式 ──────────────────────────────────────────────────────────────────
export const centerScreen: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: C.bgBase,
  color: C.accent,
  fontSize: 18,
};

export const primaryBtn: CSSProperties = {
  padding: "8px 18px",
  borderRadius: 7,
  background: C.accent,
  color: "#fff",
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

export const secondaryBtn: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 7,
  background: "transparent",
  color: C.text1,
  border: `1px solid ${C.borderMd}`,
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  transition: "background 0.15s, border-color 0.15s",
};

export const iconBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  fontSize: 22,
  cursor: "pointer",
  transition: "transform 0.2s",
};

export const selectStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 7,
  background: C.bgSurface,
  border: `1px solid ${C.borderMd}`,
  color: C.text1,
  outline: "none",
  fontSize: 13,
};

export const card: CSSProperties = {
  background: C.bgSurface,
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
  border: `1px solid ${C.border}`,
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
};
