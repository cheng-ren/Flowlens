import React, { useEffect, useRef, useState } from 'react'
import { C } from '../../styles'

// ── Raw data from IPC ────────────────────────────────────────────────────────
interface RawFlowData {
  bankIn: number
  bankOut: number
  alipayIn: number
  alipayByCategory: Array<{ cat: string; v: number }>
  wechatIn: number
  wechatByType: Array<{ cat: string; v: number }>
}

// ── Internal flow link ────────────────────────────────────────────────────────
interface FlowLink {
  from: string
  to: string
  amount: number
}

// ── Node / link shapes for SVG layout ────────────────────────────────────────
interface LayoutNode {
  id: string
  col: number
  x: number
  y: number
  h: number
  color: string
  value: number
}

interface LayoutLink {
  source: string
  target: string
  amount: number
  color: string
  path: string
  midX: number
  midY: number
}

// ── Design constants ─────────────────────────────────────────────────────────
const SVG_W = 880
const SVG_H = 480
const NODE_W = 14
const NODE_GAP = 12
const PAD_V = 28
const PAD_H = 110   // left/right space for labels

/** Colors per node id */
const NODE_COLORS: Record<string, string> = {
  外部收入: '#64748b',
  银行卡: '#f59e0b',
  支付宝: '#38bdf8',
  微信支付: '#07c160',
  银行支出: '#a16207',
  投资理财: '#a78bfa',
  充值缴费: '#22d3ee',
  转账还款: '#6366f1',
  日常消费: '#94a3b8',
}

/** Column index per node – everything else goes to col 2 */
const NODE_COL: Record<string, number> = {
  外部收入: 0,
  银行卡: 1,
  支付宝: 1,
  微信支付: 1,
}

function getCol(id: string): number {
  return NODE_COL[id] ?? 2
}

// ── Category mapping ──────────────────────────────────────────────────────────
function mapAlipayCategory(cat: string): string {
  if (/投资|理财|余额宝|基金|股票|债券/.test(cat)) return '投资理财'
  if (/转账|还款|信用卡/.test(cat)) return '转账还款'
  if (/充值|缴费|话费|水电|煤气|缴纳/.test(cat)) return '充值缴费'
  return '日常消费'
}

function mapWechatType(cat: string): string {
  if (/转账|红包|信用卡还款/.test(cat)) return '转账还款'
  if (/充值/.test(cat)) return '充值缴费'
  return '日常消费'
}

// ── Build flow list from raw IPC data ────────────────────────────────────────
function buildFlows(data: RawFlowData): FlowLink[] {
  const acc = new Map<string, number>()
  const add = (from: string, to: string, amount: number) => {
    if (amount <= 0) return
    const key = `${from}|${to}`
    acc.set(key, (acc.get(key) ?? 0) + amount)
  }

  add('外部收入', '银行卡', data.bankIn)
  add('外部收入', '支付宝', data.alipayIn)
  add('外部收入', '微信支付', data.wechatIn)
  add('银行卡', '银行支出', data.bankOut)

  for (const { cat, v } of data.alipayByCategory) add('支付宝', mapAlipayCategory(cat), v)
  for (const { cat, v } of data.wechatByType) add('微信支付', mapWechatType(cat), v)

  return Array.from(acc.entries())
    .map(([key, amount]) => {
      const [from, to] = key.split('|')
      return { from, to, amount: Math.round(amount * 100) / 100 }
    })
    .filter((f) => f.amount > 0)
}

// ── Sankey path (filled ribbon) ───────────────────────────────────────────────
function ribbonPath(
  sx: number,
  sy0: number,
  sy1: number,
  tx: number,
  ty0: number,
  ty1: number
): string {
  const mx = (sx + tx) / 2
  return [
    `M ${sx} ${sy0}`,
    `C ${mx} ${sy0}, ${mx} ${ty0}, ${tx} ${ty0}`,
    `L ${tx} ${ty1}`,
    `C ${mx} ${ty1}, ${mx} ${sy1}, ${sx} ${sy1}`,
    'Z',
  ].join(' ')
}

// ── Layout algorithm ──────────────────────────────────────────────────────────
function computeLayout(flows: FlowLink[]): { nodes: LayoutNode[]; links: LayoutLink[] } {
  if (flows.length === 0) return { nodes: [], links: [] }

  // Aggregate totals per node
  const totIn = new Map<string, number>()
  const totOut = new Map<string, number>()
  const nodeIds = new Set<string>()
  for (const f of flows) {
    nodeIds.add(f.from)
    nodeIds.add(f.to)
    totIn.set(f.to, (totIn.get(f.to) ?? 0) + f.amount)
    totOut.set(f.from, (totOut.get(f.from) ?? 0) + f.amount)
  }
  const nodeVal = (id: string) => Math.max(totIn.get(id) ?? 0, totOut.get(id) ?? 0)

  // Group nodes by column
  const colMap = new Map<number, string[]>()
  for (const id of nodeIds) {
    const c = getCol(id)
    if (!colMap.has(c)) colMap.set(c, [])
    colMap.get(c)!.push(id)
  }
  // Sort each column by value descending
  colMap.forEach((ids) => ids.sort((a, b) => nodeVal(b) - nodeVal(a)))

  // Global height scale: 1 currency unit → N pixels
  let maxColVal = 0
  colMap.forEach((ids) => {
    const s = ids.reduce((acc, id) => acc + nodeVal(id), 0)
    if (s > maxColVal) maxColVal = s
  })
  const availH = SVG_H - PAD_V * 2
  const heightScale = maxColVal > 0 ? (availH * 0.82) / maxColVal : 1

  // Column x positions (3 columns, evenly distributed inside PAD_H)
  const numCols = Math.max(...Array.from(colMap.keys())) + 1
  const colX = (col: number) =>
    PAD_H + col * (SVG_W - PAD_H * 2 - NODE_W) / Math.max(numCols - 1, 1)

  // Position nodes vertically within each column (centered)
  const nodeMap = new Map<string, LayoutNode>()
  colMap.forEach((ids, col) => {
    const colVal = ids.reduce((acc, id) => acc + nodeVal(id), 0)
    const colH = colVal * heightScale + Math.max(ids.length - 1, 0) * NODE_GAP
    let y = PAD_V + (availH - colH) / 2
    const x = colX(col)
    for (const id of ids) {
      const val = nodeVal(id)
      const h = Math.max(val * heightScale, 4)
      nodeMap.set(id, { id, col, x, y, h, color: NODE_COLORS[id] ?? '#475569', value: val })
      y += h + NODE_GAP
    }
  })

  // Build link paths – ribbon height for a flow = amount * heightScale
  const outCursor = new Map<string, number>()
  const inCursor = new Map<string, number>()
  nodeMap.forEach((n, id) => {
    outCursor.set(id, n.y)
    inCursor.set(id, n.y)
  })

  // Sort flows largest-first so small flows aren't hidden under large ones
  const sorted = [...flows].sort((a, b) => b.amount - a.amount)
  const links: LayoutLink[] = []
  for (const f of sorted) {
    const src = nodeMap.get(f.from)
    const tgt = nodeMap.get(f.to)
    if (!src || !tgt) continue

    const rh = Math.max(f.amount * heightScale, 2)

    const sy0 = outCursor.get(f.from)!
    const sy1 = sy0 + rh
    outCursor.set(f.from, sy1)

    const ty0 = inCursor.get(f.to)!
    const ty1 = ty0 + rh
    inCursor.set(f.to, ty1)

    const sx = src.x + NODE_W
    const tx = tgt.x
    links.push({
      source: f.from,
      target: f.to,
      amount: f.amount,
      color: src.color,
      path: ribbonPath(sx, sy0, sy1, tx, ty0, ty1),
      midX: (sx + tx) / 2,
      midY: (sy0 + sy1 + ty0 + ty1) / 4,
    })
  }

  return { nodes: Array.from(nodeMap.values()), links }
}

// ── Number formatter ──────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return `¥${n.toFixed(0)}`
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AssetFlowView() {
  const [rawData, setRawData] = useState<RawFlowData | null>(null)
  const [years, setYears] = useState<string[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<LayoutLink | null>(null)
  const tooltipRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    ;(window as any).api
      .getAnalyticsYears()
      .then((ys: string[]) => {
        setYears(ys)
        if (ys.length > 0 && !ys.includes(year)) setYear(ys[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    ;(window as any).api
      .getAssetFlow(year)
      .then((d: RawFlowData) => {
        setRawData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year])

  const flows = rawData ? buildFlows(rawData) : []
  const { nodes, links } = computeLayout(flows)
  const hasData = flows.length > 0

  // Stats row
  const bankIn = rawData?.bankIn ?? 0
  const bankOut = rawData?.bankOut ?? 0
  const alipayIn = rawData?.alipayIn ?? 0
  const alipayOut = (rawData?.alipayByCategory ?? []).reduce((s, c) => s + c.v, 0)
  const wechatIn = rawData?.wechatIn ?? 0
  const wechatOut = (rawData?.wechatByType ?? []).reduce((s, c) => s + c.v, 0)

  return (
    <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto', background: C.bgBase }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text1 }}>资产流转</h2>
          <p style={{ margin: '4px 0 0', color: C.text2, fontSize: 12 }}>
            资金在各账户与消费渠道间的流转路径 · 线条宽度代表金额大小
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: '5px 14px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${y === year ? C.accent : C.borderMd}`,
                background: y === year ? `${C.accent}22` : 'transparent',
                color: y === year ? C.accent : C.text2,
                transition: 'all 0.15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {hasData && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: '银行 收入', val: bankIn, color: '#f59e0b' },
            { label: '银行 支出', val: bankOut, color: '#a16207' },
            { label: '支付宝 收入', val: alipayIn, color: '#38bdf8' },
            { label: '支付宝 支出', val: alipayOut, color: '#0ea5e9' },
            { label: '微信 收入', val: wechatIn, color: '#07c160' },
            { label: '微信 支出', val: wechatOut, color: '#059669' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.bgSurface,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 8,
                padding: '8px 14px',
                minWidth: 110,
              }}
            >
              <div style={{ fontSize: 10, color: C.text2, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{fmt(s.val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div
        style={{
          background: C.bgSurface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '20px 0',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ height: SVG_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2, fontSize: 13 }}>
            加载中…
          </div>
        ) : !hasData ? (
          <div style={{ height: SVG_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2, fontSize: 13, gap: 8 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>⟁</div>
            <div>暂无流转数据</div>
            <div style={{ fontSize: 11, color: C.text3 }}>请先导入银行、支付宝或微信账单</div>
          </div>
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: 'block' }}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Links (rendered before nodes so nodes appear on top) */}
            {links.map((lk, i) => (
              <path
                key={i}
                d={lk.path}
                fill={lk.color}
                fillOpacity={hovered ? (hovered === lk ? 0.55 : 0.12) : 0.28}
                stroke="none"
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                onMouseEnter={(e) => {
                  tooltipRef.current = { x: e.clientX, y: e.clientY }
                  setHovered(lk)
                }}
                onMouseMove={(e) => {
                  tooltipRef.current = { x: e.clientX, y: e.clientY }
                }}
                onMouseLeave={() => setHovered(null)}
              />
            ))}

            {/* Nodes */}
            {nodes.map((n) => {
              const labelRight = n.col === 2
              const labelX = labelRight ? n.x + NODE_W + 8 : n.x - 8
              const anchor = labelRight ? 'start' : 'end'
              const showAmt = n.h >= 22
              return (
                <g key={n.id}>
                  <rect x={n.x} y={n.y} width={NODE_W} height={n.h} fill={n.color} rx={3} />
                  <text
                    x={labelX}
                    y={n.y + n.h / 2 + (showAmt ? -7 : 0)}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={11}
                    fill={C.text1}
                    fontWeight={500}
                  >
                    {n.id}
                  </text>
                  {showAmt && (
                    <text
                      x={labelX}
                      y={n.y + n.h / 2 + 8}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fontSize={10}
                      fill={C.text2}
                    >
                      {fmt(n.value)}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Hovered link label in SVG */}
            {hovered && (() => {
              const lx = hovered.midX
              const ly = hovered.midY
              const label = `${hovered.source} → ${hovered.target}`
              const amtLabel = fmt(hovered.amount)
              return (
                <g pointerEvents="none">
                  <rect
                    x={lx - 66}
                    y={ly - 22}
                    width={132}
                    height={44}
                    rx={7}
                    fill={C.bgHover}
                    stroke={C.borderMd}
                    strokeWidth={1}
                  />
                  <text x={lx} y={ly - 8} textAnchor="middle" fontSize={9.5} fill={C.text2}>
                    {label}
                  </text>
                  <text x={lx} y={ly + 9} textAnchor="middle" fontSize={12} fontWeight={700} fill={hovered.color}>
                    {amtLabel}
                  </text>
                </g>
              )
            })()}
          </svg>
        )}
      </div>

      {/* Legend */}
      {hasData && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Object.entries(NODE_COLORS).map(([id, color]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.text2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              {id}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {hasData && (
        <p style={{ fontSize: 11, color: C.text3, marginTop: 14, lineHeight: 1.7 }}>
          · 银行收入/支出来自银行账单；支付宝/微信按类别/交易类型自动归类。
          <br />
          · 节点高度与流过的资金量正相关；鼠标悬停到色带可查看具体金额。
        </p>
      )}
    </div>
  )
}
