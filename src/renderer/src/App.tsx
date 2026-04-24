import React, { useEffect, useState, useRef } from "react";
import { centerScreen, C } from "./styles";
import { useCapture } from "./hooks/useCapture";
import { Dialog, type DialogState } from "./components/Dialog";
import { SideNav } from "./components/SideNav";
import { SettingsModal } from "./components/settings/SettingsModal";
import { DashboardHome, type PlatformView } from "./components/dashboard/DashboardHome";
import { ShopOrdersView } from "./components/dashboard/ShopOrdersView";
import { AlipayBillsView } from "./components/dashboard/AlipayBillsView";
import { WechatBillsView } from "./components/dashboard/WechatBillsView";
import { BankTransactionsView } from "./components/dashboard/BankTransactionsView";
import { FloatWebviewPanel } from "./components/webview/FloatWebviewPanel";

export type ViewType = "home" | PlatformView;

// 即将上线的平台列表
const SOON_VIEWS: ViewType[] = [
  "pdd", "sams", "other_shop",
  "unionpay",
  "ccb", "abc", "icbc", "boc", "postal", "citic", "minsheng", "other_bank",
];

const SOON_LABELS: Partial<Record<ViewType, string>> = {
  pdd: "拼多多",
  sams: "山姆",
  other_shop: "其他电商",
  unionpay: "云闪付",
  ccb: "建设银行",
  abc: "农业银行",
  icbc: "工商银行",
  boc: "中国银行",
  postal: "邮政储蓄",
  citic: "中信银行",
  minsheng: "民生银行",
  other_bank: "其他银行",
};

function ComingSoonView({ view }: { view: ViewType }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        color: "#475569",
      }}
    >
      <div style={{ fontSize: 56 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#64748b" }}>
        {SOON_LABELS[view] ?? view} — 即将上线
      </div>
      <div style={{ fontSize: 14, color: "#334155", maxWidth: 320, textAlign: "center" }}>
        此数据源正在开发中，敬请期待
      </div>
    </div>
  );
}

function App() {
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamily, setActiveFamily] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [view, setView] = useState<ViewType>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  // Webview 状态
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [authAccountId, setAuthAccountId] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState("");
  const webviewRef = useRef<any>(null);
  const detailWebviewRef = useRef<any>(null);

  // 悬浮窗尺寸与拖拽
  const [floatSize, setFloatSize] = useState({ width: 533, height: 300 });
  const [isResizing, setIsResizing] = useState(false);

  const [, setOrders] = useState<any[]>([]);

  const {
    isCapturing,
    progressMsg,
    captureQueue,
    captureQueueIndex,
    handleCaptureStart,
    handleCaptureAll,
  } = useCapture({
    webviewRef,
    authAccountId,
    setAuthAccountId,
    setBrowserUrl,
    setIsBrowserOpen,
    users,
    setOrders,
  });

  // ── 初始化 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // @ts-ignore
      const fams = await window.api.getFamilies();
      setFamilies(fams);
      if (fams.length === 0) {
        setDialog({
          isOpen: true,
          title: "欢迎使用 财流镜 FlowLens",
          placeholder: "请为您的第一个家庭或组织命名",
          type: "family",
          onSubmit: async (name: string) => {
            // @ts-ignore
            const newFam = await window.api.createFamily(name);
            setFamilies([newFam]);
            setActiveFamily(newFam);
            setDialog(null);
          },
        });
      } else {
        setActiveFamily(fams[0]);
      }
    } catch (e: any) {
      alert("初始化数据失败: " + e.message);
    }
  };

  useEffect(() => {
    if (activeFamily) {
      // @ts-ignore
      window.api.getUsers(activeFamily.id).then((us: any[]) => {
        setUsers(us);
        setActiveUser(us.length > 0 ? us[0] : null);
      });
    } else {
      setUsers([]);
      setActiveUser(null);
    }
  }, [activeFamily]);

  useEffect(() => {
    if (activeUser) {
      // @ts-ignore
      window.api.getAccounts(activeUser.id).then(setAccounts);
    } else {
      setAccounts([]);
    }
  }, [activeUser]);

  // ── 家庭 CRUD ────────────────────────────────────────────────────────────
  const handleAddFamily = () => {
    setDialog({
      isOpen: true,
      title: "创建新家庭",
      placeholder: "输入新家庭名称",
      type: "family",
      onSubmit: async (name: string) => {
        // @ts-ignore
        const newFam = await window.api.createFamily(name);
        setFamilies((prev) => [newFam, ...prev]);
        setActiveFamily(newFam);
        setDialog(null);
      },
    });
  };

  const handleDeleteFamily = async () => {
    if (!activeFamily) return;
    if (
      window.confirm(
        `确定要彻底删除家庭【${activeFamily.name}】以及其下所有的成员、账户和账单数据吗？此操作不可逆！`,
      )
    ) {
      // @ts-ignore
      await window.api.deleteFamily(activeFamily.id);
      setActiveFamily(null);
      loadInitialData();
    }
  };

  // ── 成员 CRUD ────────────────────────────────────────────────────────────
  const handleAddUser = () => {
    if (!activeFamily) return;
    setDialog({
      isOpen: true,
      title: "添加新成员",
      placeholder: "输入成员名称 (例如: 自己, 配偶)",
      type: "user",
      onSubmit: async (name: string) => {
        // @ts-ignore
        await window.api.createUser({ familyId: activeFamily.id, name });
        // @ts-ignore
        const us = await window.api.getUsers(activeFamily.id);
        setUsers(us);
        setActiveUser(us[us.length - 1]);
        setDialog(null);
      },
    });
  };

  const handleDeleteUser = async (user: any) => {
    if (window.confirm(`确定要删除成员【${user.name}】及其所有账号和订单吗？`)) {
      // @ts-ignore
      await window.api.deleteUser(user.id);
      // @ts-ignore
      const us = await window.api.getUsers(activeFamily.id);
      setUsers(us);
      setActiveUser(us.length > 0 ? us[0] : null);
    }
  };

  // ── 账户 CRUD ────────────────────────────────────────────────────────────
  const handleAddAccount = async (platform: string) => {
    if (!activeUser) return alert("请先选择一个成员");
    // @ts-ignore
    const acc = await window.api.createAccount({
      userId: activeUser.id,
      platform,
      accountName: "待授权账号",
    });
    setAccounts((prev) => [acc, ...prev]);
    handleAuthorize(acc);
  };

  const handleDeleteAccount = async (acc: any) => {
    if (
      window.confirm(`确定要删除账户【${acc.account_name}】及其所有订单数据吗？`)
    ) {
      // @ts-ignore
      await window.api.deleteAccount(acc.id);
      // @ts-ignore
      window.api.getAccounts(activeUser.id).then(setAccounts);
    }
  };

  // ── 授权 & 采集 ──────────────────────────────────────────────────────────
  const handleAuthorize = (account: any) => {
    setAuthAccountId(account.id);
    setBrowserUrl(
      account.platform === "jd"
        ? "https://passport.jd.com/new/login.aspx"
        : "https://login.taobao.com",
    );
    setIsBrowserOpen(true);
  };

  const handleFinishAuth = async () => {
    if (!authAccountId) return;
    // @ts-ignore
    const status = await window.api.saveAccountCookies(authAccountId);
    alert(
      status === "valid"
        ? "授权成功！"
        : "授权失败或未检测到有效Cookie，请重新尝试。",
    );
    setIsBrowserOpen(false);
    setAuthAccountId(null);
    if (activeUser) {
      // @ts-ignore
      window.api.getAccounts(activeUser.id).then(setAccounts);
    }
  };

  // ── 悬浮窗拖拽缩放 ───────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = floatSize.width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      let newWidth = startWidth + deltaX;
      if (newWidth < 320) newWidth = 320;
      if (newWidth > window.innerWidth - 100) newWidth = window.innerWidth - 100;
      setFloatSize({ width: newWidth, height: (newWidth * 9) / 16 });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // ── 渲染内容区 ────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (view === "home") {
      return <DashboardHome onSelectPlatform={(p) => setView(p)} />;
    }
    if (SOON_VIEWS.includes(view)) {
      return <ComingSoonView view={view} />;
    }
    if (view === "taobao") {
      return (
        <ShopOrdersView
          platform="taobao"
          isCapturing={isCapturing}
          progressMsg={progressMsg}
          users={users}
          onCaptureAll={(timeRange) => handleCaptureAll("taobao", timeRange)}
          onGoSettings={() => setSettingsOpen(true)}
        />
      );
    }
    if (view === "jd") {
      return (
        <ShopOrdersView
          platform="jd"
          isCapturing={isCapturing}
          progressMsg={progressMsg}
          users={users}
          onCaptureAll={(timeRange) => handleCaptureAll("jd", timeRange)}
          onGoSettings={() => setSettingsOpen(true)}
        />
      );
    }
    if (view === "alipay") return <AlipayBillsView />;
    if (view === "wechat") return <WechatBillsView />;
    if (view === "bank") return <BankTransactionsView />;
    return null;
  };

  if (!activeFamily && !dialog) {
    return <div style={centerScreen}>正在加载或创建家庭配置...</div>;
  }

  return (
    <div
      style={{
        fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        background: C.bgBase,
        color: C.text1,
        overflow: "hidden",
      }}
    >
      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; background: #0d1117; }
        @keyframes fadeInScale {
          from { transform: scale(0.9); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .float-webview {
          animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>

      <Dialog
        dialog={dialog}
        setDialog={setDialog}
        canCancel={families.length > 0}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        families={families}
        activeFamily={activeFamily}
        onSelectFamily={setActiveFamily}
        onAddFamily={handleAddFamily}
        onDeleteFamily={handleDeleteFamily}
        users={users}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        accounts={accounts}
        onAddAccount={handleAddAccount}
        onAuthorize={handleAuthorize}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* 左侧导航栏 */}
      <SideNav
        activeFamily={activeFamily}
        view={view}
        onNavigate={setView}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* 右侧主内容区 */}
      {activeFamily && (
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {renderContent()}

          {isBrowserOpen && (
            <FloatWebviewPanel
              authAccountId={authAccountId}
              browserUrl={browserUrl}
              webviewRef={webviewRef}
              detailWebviewRef={detailWebviewRef}
              view={settingsOpen ? "settings" : "dashboard"}
              progressMsg={progressMsg}
              isCapturing={isCapturing}
              floatSize={floatSize}
              isResizing={isResizing}
              onFinishAuth={handleFinishAuth}
              onCaptureStart={() => handleCaptureStart(captureQueue, captureQueueIndex)}
              onClose={() => setIsBrowserOpen(false)}
              onResizeStart={handleResizeStart}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
