import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { C } from "../../styles";

// ── 类型 ─────────────────────────────────────────────────────────────────────

export type PlatformView =
  | "taobao" | "jd" | "pdd" | "sams" | "other_shop"
  | "alipay" | "wechat" | "unionpay"
  | "bank" | "ccb" | "abc" | "icbc" | "boc" | "postal" | "citic" | "minsheng" | "other_bank";

interface DashboardHomeProps {
  onSelectPlatform: (p: PlatformView) => void;
}

interface Overview {
  orders:  { count: number; total: number };
  alipay:  { count: number; expense: number; income: number };
  wechat:  { count: number; expense: number; income: number };
  bank:    { count: number; expense: number; income: number };
}

interface MonthlyRow { month: string; expense: number; income: number }
interface MonthlyTrend {
  alipay: MonthlyRow[];
  wechat: MonthlyRow[];
  bank:   MonthlyRow[];
  ecommerce: MonthlyRow[];
}

interface PlatformStat { platform: string; count: number; total: number }
interface BankStat     { bank: string; count: number; expense: number; income: number }
interface CategoryStat  { category: string; count: number; total: number }

// ── 平台显示名 ───────────────────────────────────────────────────────────────
const PLATFORM_LABEL: Record<string, string> = {
  taobao: "淘宝", jd: "京东", pdd: "拼多多", sams: "山姆", other_shop: "其他电商",
};

// ── 调色板（深色主题友好）────────────────────────────────────────────────────
const PALETTE = ["#4d9cf0", "#3ecf8e", "#f59e0b", "#f85149", "#818cf8", "#06b6d4",
                 "#e879a0", "#84cc16", "#ff7c3c", "#a78bfa", "#22d3ee", "#fb923c"];

// ── 工具函数 ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `¥${n.toFixed(0)}`;

const fmtFull = (n: number) => `¥${n.toFixed(2)}`;

/** 把各渠道 MonthlyRow[] 合并成 { month, expense, income } 的统一序列 */
function mergeMonthly(sources: MonthlyRow[][]): { month: string; expense: number; income: number }[] {
  const map = new Map<string, { expense: number; income: number }>();
  for (const rows of sources) {
    for (const r of rows) {
      const prev = map.get(r.month) ?? { expense: 0, income: 0 };
      map.set(r.month, {
        expense: prev.expense + (r.expense || 0),
        income:  prev.income  + (r.income  || 0),
      });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month: month.slice(5), // "2025-01" → "01"（年份已由选择器体现）
      expense: Math.round(v.expense * 100) / 100,
      income:  Math.round(v.income  * 100) / 100,
    }));
}

// ── 自定义 Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c2233", border: `1px solid ${C.borderMd}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: C.text2, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}：<span style={{ color: C.text1 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── 饼图自定义 Label ─────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) {
  if (percent < 0.05) return null; // 太小的扇区不显示 label
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {name.length > 4 ? name.slice(0, 4) : name}
    </text>
  );
}

// ── 收入/支出行（用 / 分隔）────────────────────────────────────────────────────
function IncomeExpenseRow({ income, expense }: { income: number; expense: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#34d399", letterSpacing: "-0.3px" }}>
        +{fmt(income)}
      </span>
      <span style={{ fontSize: 13, color: C.text3, fontWeight: 400, lineHeight: 1 }}>/</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#f472b6", letterSpacing: "-0.3px" }}>
        -{fmt(expense)}
      </span>
    </div>
  );
}

function IncomeExpenseCard({
  label, accentColor, income, expense, count,
}: {
  label: string; accentColor: string; income: number; expense: number; count: number;
}) {
  return (
    <div style={{ background: C.bgSurface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.text2, marginBottom: 10, fontWeight: 500 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: accentColor, marginRight: 5, verticalAlign: "middle" }} />
        {label}
      </div>
      <IncomeExpenseRow income={income} expense={expense} />
      <div style={{ fontSize: 11, color: C.text3, marginTop: 6 }}>共 {count} 笔</div>
    </div>
  );
}

// ── 空状态占位 ────────────────────────────────────────────────────────────────
function EmptyChart({ label }: { label: string }) {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
        <rect x={4} y={20} width={6} height={12} rx={2} fill={C.border} />
        <rect x={15} y={14} width={6} height={18} rx={2} fill={C.border} />
        <rect x={26} y={8}  width={6} height={24} rx={2} fill={C.border} />
      </svg>
      <span style={{ color: C.text3, fontSize: 12 }}>暂无{label}数据</span>
    </div>
  );
}

// ── 导航卡片 ─────────────────────────────────────────────────────────────────
const NAV_CARDS: { id: PlatformView; label: string; color: string; ready: boolean }[] = [
  { id: "taobao", label: "淘宝订单",   color: "#f97316", ready: true  },
  { id: "jd",     label: "京东订单",   color: "#ef4444", ready: true  },
  { id: "alipay", label: "支付宝账单", color: "#38bdf8", ready: true  },
  { id: "wechat", label: "微信账单",   color: "#34d399", ready: true  },
  { id: "bank",   label: "招商流水",   color: "#fbbf24", ready: true  },
];

// ── 主组件 ───────────────────────────────────────────────────────────────────
export function DashboardHome({ onSelectPlatform }: DashboardHomeProps) {
  const currentYear = String(new Date().getFullYear());

  const [years,          setYears]          = useState<string[]>([currentYear]);
  const [selectedYear,   setSelectedYear]   = useState<string>(currentYear);
  const [overview,       setOverview]       = useState<Overview | null>(null);
  const [monthlyTrend,   setMonthlyTrend]   = useState<MonthlyTrend | null>(null);
  const [platformStats,  setPlatformStats]  = useState<PlatformStat[]>([]);
  const [bankStats,      setBankStats]      = useState<BankStat[]>([]);
  const [categoryStats,  setCategoryStats]  = useState<CategoryStat[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeNavCard,  setActiveNavCard]  = useState<PlatformView | null>(null);
  const [orderPlatform,  setOrderPlatform]  = useState<string>("all");
  const [selectedBank,   setSelectedBank]   = useState<string>("all");

  // 初次加载：先获取可用年份列表，再加载当年数据
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const ys: string[] = await window.api.getAnalyticsYears();
        if (ys.length > 0) {
          setYears(ys);
          // 若当年无数据，默认选最近有数据的年份
          if (!ys.includes(currentYear)) setSelectedYear(ys[0]);
        }
      } catch (e) {
        console.error("getAnalyticsYears error", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(async (year: string) => {
    setLoading(true);
    try {
      const [ov, mt, ps, bs, cs] = await Promise.all([
        // @ts-ignore
        window.api.getAnalyticsOverview(year),
        // @ts-ignore
        window.api.getMonthlyTrend(year),
        // @ts-ignore
        window.api.getPlatformStats(year),
        // @ts-ignore
        window.api.getBankStats(year),
        // @ts-ignore
        window.api.getCategoryStats(year),
      ]);
      setOverview(ov);
      setMonthlyTrend(mt);
      setPlatformStats(ps || []);
      setBankStats(bs || []);
      setCategoryStats(cs || []);
    } catch (e) {
      console.error("Analytics load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrderPlatform("all");
    setSelectedBank("all");
    loadAll(selectedYear);
  }, [loadAll, selectedYear]);

  // ── 汇总计算 ────────────────────────────────────────────────────────────────
  // 电商订单按平台筛选（从 platformStats 派生，无需额外请求）
  const filteredOrders = orderPlatform === "all"
    ? { count: overview?.orders.count ?? 0, total: overview?.orders.total ?? 0 }
    : (() => {
        const row = platformStats.find(p => p.platform === orderPlatform);
        return { count: row?.count ?? 0, total: row?.total ?? 0 };
      })();

  const totalOrders  = filteredOrders.count;
  const totalOrderAmt= filteredOrders.total;
  const alipayExp    = overview?.alipay.expense ?? 0;
  const alipayInc    = overview?.alipay.income  ?? 0;
  const wechatExp    = overview?.wechat.expense ?? 0;
  const wechatInc    = overview?.wechat.income  ?? 0;

  // 银行收支按银行筛选（从 bankStats 派生）
  const filteredBank = selectedBank === "all"
    ? { count: overview?.bank.count ?? 0, expense: overview?.bank.expense ?? 0, income: overview?.bank.income ?? 0 }
    : (() => {
        const row = bankStats.find(b => b.bank === selectedBank);
        return { count: row?.count ?? 0, expense: row?.expense ?? 0, income: row?.income ?? 0 };
      })();
  const bankExp      = filteredBank.expense;
  const bankInc      = filteredBank.income;
  const bankCount    = filteredBank.count;

  const hasAnyData   = totalOrders > 0 || alipayExp > 0 || wechatExp > 0 || (overview?.bank.expense ?? 0) > 0;

  // 月度趋势合并（支付宝 + 微信 + 电商）
  const trendData = monthlyTrend
    ? mergeMonthly([monthlyTrend.alipay, monthlyTrend.wechat, monthlyTrend.ecommerce])
    : [];
  const hasMonthly = trendData.length > 0;

  // 平台柱状图数据
  const platformData = platformStats.map(p => ({
    name: PLATFORM_LABEL[p.platform] ?? p.platform,
    订单数: p.count,
    消费额: p.total,
  }));
  const hasPlatform = platformData.length > 0;

  // 分类饼图数据（全量，按消费金额）
  const categoryData = categoryStats.map(c => ({
    name: c.category,
    消费额: c.total,
    件数: c.count,
  }));
  const hasCategory = categoryData.length > 0;

  // ── 渲染 ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.text2, fontSize: 14 }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── 顶部标题栏 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text1, letterSpacing: "-0.3px" }}>
            财务概览
          </h2>
          <p style={{ margin: "4px 0 0", color: C.text2, fontSize: 12 }}>
            汇总全渠道数据分析
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* 年份选择器 */}
          <div style={{ display: "flex", gap: 4 }}>
            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  border: `1px solid ${selectedYear === y ? C.accent : C.borderMd}`,
                  background: selectedYear === y ? `${C.accent}22` : "transparent",
                  color: selectedYear === y ? C.accent : C.text2,
                }}
              >
                {y}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAll(selectedYear)}
            style={{
              padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.borderMd}`,
              background: "transparent", color: C.text2, fontSize: 12, cursor: "pointer",
            }}
          >
            ↻ 刷新
          </button>
        </div>
      </div>

      {/* ── 概览统计卡片 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>

        {/* 电商订单卡片：含平台选择器 */}
        <div style={{ background: C.bgSurface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>电商订单</span>
            {/* 平台 tab */}
            <div style={{ display: "flex", gap: 3 }}>
              {[{ key: "all", label: "全部" }, ...platformStats.map(p => ({
                key: p.platform,
                label: PLATFORM_LABEL[p.platform] ?? p.platform,
              }))].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setOrderPlatform(tab.key)}
                  style={{
                    padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.12s",
                    border: `1px solid ${orderPlatform === tab.key ? C.accent : C.border}`,
                    background: orderPlatform === tab.key ? `${C.accent}22` : "transparent",
                    color: orderPlatform === tab.key ? C.accent : C.text3,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, letterSpacing: "-0.5px" }}>
            {fmt(totalOrderAmt)}
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>共 {totalOrders} 笔</div>
        </div>

        {/* 支付宝卡片 */}
        <IncomeExpenseCard
          label="支付宝"
          accentColor="#38bdf8"
          income={alipayInc}
          expense={alipayExp}
          count={overview?.alipay.count ?? 0}
        />

        {/* 微信卡片 */}
        <IncomeExpenseCard
          label="微信支付"
          accentColor="#34d399"
          income={wechatInc}
          expense={wechatExp}
          count={overview?.wechat.count ?? 0}
        />

        {/* 银行卡片：含银行选择器 */}
        <div style={{ background: C.bgSurface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>银行</span>
            {/* 银行 tab */}
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {[{ key: "all", label: "全部" }, ...bankStats.map(b => ({ key: b.bank, label: b.bank }))].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedBank(tab.key)}
                  style={{
                    padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.12s",
                    border: `1px solid ${selectedBank === tab.key ? "#fbbf24" : C.border}`,
                    background: selectedBank === tab.key ? "#fbbf2422" : "transparent",
                    color: selectedBank === tab.key ? "#fbbf24" : C.text3,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <IncomeExpenseRow income={bankInc} expense={bankExp} />
          <div style={{ fontSize: 11, color: C.text3, marginTop: 6 }}>共 {bankCount} 笔</div>
        </div>
      </div>

      {!hasAnyData && (
        <div style={{
          background: C.bgSurface, borderRadius: 10, border: `1px dashed ${C.borderMd}`,
          padding: "36px 24px", textAlign: "center", color: C.text2,
        }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>暂无数据</div>
          <div style={{ fontSize: 12, color: C.text3 }}>
            请先采集电商订单，或导入支付宝 / 微信 / 银行账单
          </div>
        </div>
      )}

      {/* ── 月度收支趋势 ── */}
      <div style={{ background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 16 }}>月度支出趋势</div>
        <div style={{ height: 220 }}>
          {hasMonthly ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis
                  dataKey="month" tick={{ fill: C.text2, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: C.text2, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle" iconSize={7}
                  wrapperStyle={{ fontSize: 11, color: C.text2, paddingTop: 8 }}
                />
                <Line
                  type="monotone" dataKey="expense" name="支出"
                  stroke="#f85149" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone" dataKey="income" name="收入"
                  stroke={C.green} strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="月度趋势" />
          )}
        </div>
      </div>

      {/* ── 平台分析 + 分类分布 并排 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* 电商平台消费 */}
        <div style={{ background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 16 }}>电商平台消费</div>
          <div style={{ height: 200 }}>
            {hasPlatform ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.text2, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: C.text2, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="消费额" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {platformData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="平台消费" />
            )}
          </div>
        </div>

        {/* 商品分类分布 */}
        <div style={{ background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 14 }}>商品分类分布</div>
          <div style={{ height: 200 }}>
            {hasCategory ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={categoryData}
                    dataKey="消费额"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    labelLine={false}
                    label={PieLabel}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[(i + 3) % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip />}
                    formatter={(value: any, _name: any, entry: any) =>
                      [`¥${Number(value).toFixed(2)}（${entry.payload?.件数 ?? 0} 笔）`, entry.payload?.name]
                    }
                  />
                  <Legend
                    iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: 10, color: C.text2, paddingTop: 4, lineHeight: "18px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="商品分类" />
            )}
          </div>
        </div>
      </div>

      {/* ── 银行月度收支折线图 ── */}
      {(monthlyTrend?.bank?.length ?? 0) > 0 && (
        <div style={{ background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 16 }}>银行月度收支</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(monthlyTrend?.bank ?? []).map(r => ({
                  month: r.month.slice(5),
                  收入: r.income,
                  支出: r.expense,
                }))}
                margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: C.text2, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: C.text2, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v}`}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: C.text2, paddingTop: 8 }} />
                <Line type="monotone" dataKey="收入" stroke={C.green}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="支出" stroke="#f85149" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 快速导航 ── */}
      <div>
        <div style={{ fontSize: 12, color: C.text2, fontWeight: 500, marginBottom: 10 }}>快速进入</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {NAV_CARDS.map(card => {
            const isHov = activeNavCard === card.id;
            return (
              <button
                key={card.id}
                onMouseEnter={() => setActiveNavCard(card.id)}
                onMouseLeave={() => setActiveNavCard(null)}
                onClick={() => onSelectPlatform(card.id)}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  border: `1px solid ${isHov ? card.color + "60" : C.border}`,
                  background: isHov ? card.color + "18" : "transparent",
                  color: isHov ? card.color : C.text2,
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {card.label} →
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
