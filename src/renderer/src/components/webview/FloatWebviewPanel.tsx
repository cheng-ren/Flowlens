import React from "react";
import { primaryBtn, secondaryBtn } from "../../styles";

interface FloatWebviewPanelProps {
  authAccountId: string | null;
  browserUrl: string;
  webviewRef: React.RefObject<any>;
  detailWebviewRef: React.RefObject<any>;
  view: "dashboard" | "settings";
  progressMsg: string;
  isCapturing: boolean;
  floatSize: { width: number; height: number };
  isResizing: boolean;
  onFinishAuth: () => void;
  onCaptureStart: () => void;
  onClose: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

export function FloatWebviewPanel({
  authAccountId,
  browserUrl,
  webviewRef,
  detailWebviewRef,
  view,
  progressMsg,
  isCapturing,
  floatSize,
  isResizing,
  onFinishAuth,
  onCaptureStart,
  onClose,
  onResizeStart,
}: FloatWebviewPanelProps) {
  if (!authAccountId) return null;

  // 授权场景（从设置页打开）需要高于 SettingsModal 的 zIndex（50000）
  const panelZ = view === "settings" ? 60000 : 9999;

  return (
    <>
      {/* 拖拽时全屏遮罩，防止 webview 吃掉鼠标事件 */}
      {isResizing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: panelZ + 1000,
            cursor: "nwse-resize",
          }}
        />
      )}

      {/* 控制面板 */}
      <div
        style={{
          position: "fixed",
          bottom: 40,
          right: floatSize.width + 60,
          transition: "right 0.1s",
          background: "#1e293b",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          border: "1px solid #38bdf8",
          zIndex: panelZ,
          width: 250,
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8" }}>财流镜 控制台</h4>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 15 }}>
          右侧悬浮窗口已就绪。请在其中操作或预览。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {view === "settings" ? (
            <button onClick={onFinishAuth} style={primaryBtn}>
              我已扫码，保存登录状态
            </button>
          ) : (
            <button
              onClick={onCaptureStart}
              disabled={isCapturing}
              style={{
                ...primaryBtn,
                background: isCapturing ? "#64748b" : "#ef4444",
              }}
            >
              {isCapturing ? "采集中..." : "开始抓取本页及后续页面"}
            </button>
          )}
          <button onClick={onClose} style={secondaryBtn}>
            关闭窗口
          </button>
        </div>
        {progressMsg && (
          <p style={{ fontSize: 12, color: "#34d399", marginTop: 10 }}>
            {progressMsg}
          </p>
        )}
      </div>

      {/* 悬浮 Webview */}
      <div
        className="float-webview"
        style={{
          position: "fixed",
          bottom: 40,
          right: 40,
          width: floatSize.width,
          height: floatSize.height,
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          border: "1px solid #334155",
          overflow: "hidden",
          zIndex: panelZ,
          background: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 左上角缩放把手 */}
        <div
          onMouseDown={onResizeStart}
          title="拖拽左上角以等比例缩放"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 30,
            height: 30,
            cursor: "nwse-resize",
            zIndex: 10000,
            background:
              "linear-gradient(135deg, rgba(56, 189, 248, 0.8) 0%, rgba(56, 189, 248, 0) 50%)",
            borderTopLeftRadius: 20,
          }}
        />

        {/* @ts-ignore */}
        <webview
          ref={webviewRef}
          src={browserUrl}
          partition={`persist:${authAccountId}`}
          style={{ flex: 1, width: "100%", height: "100%", border: "none" }}
        />
      </div>

      {/* 隐藏 webview，用于抓取详情页 */}
      {/* @ts-ignore */}
      <webview
        ref={detailWebviewRef}
        src="about:blank"
        partition={`persist:${authAccountId}`}
        style={{
          width: 800,
          height: 600,
          position: "absolute",
          top: -9999,
          left: -9999,
        }}
      />
    </>
  );
}
