import { useState, useRef } from "react";

const log = (...args: any[]) => {
  console.log(...args);
  // @ts-ignore
  window.api.log(...args);
};
import {
  EXTRACT_JD_SCRIPT,
  EXTRACT_JD_DETAIL_SCRIPT,
  EXTRACT_TAOBAO_SCRIPT,
  EXTRACT_TAOBAO_DETAIL_SCRIPT,
  NEXT_PAGE_SCRIPT,
  NEXT_PAGE_TAOBAO_SCRIPT,
  getOrderUrl,
  getJDUrlsForRange,
  getTimeRangeCutoff,
  type TimeRangeCutoff,
} from "../constants/scripts";

interface UseCaptureParams {
  webviewRef: React.RefObject<any>;
  authAccountId: string | null;
  setAuthAccountId: (id: string | null) => void;
  setBrowserUrl: (url: string) => void;
  setIsBrowserOpen: (open: boolean) => void;
  users: any[];
  setOrders: (orders: any[]) => void;
}

export function useCapture({
  webviewRef,
  authAccountId,
  setAuthAccountId,
  setBrowserUrl,
  setIsBrowserOpen,
  users,
  setOrders,
}: UseCaptureParams) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [captureQueue, setCaptureQueue] = useState<any[]>([]);
  const [captureQueueIndex, setCaptureQueueIndex] = useState(0);
  const captureTimeRangeRef = useRef("this_year");

  /** 尝试将订单时间字符串解析为 Date，兼容 ISO 格式和中文格式 */
  const parseOrderDate = (timeStr: string): Date | null => {
    if (!timeStr) return null;
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
    // 中文格式：2026年04月12日 10:30:00
    const m = timeStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    return null;
  };

  /** 根据 cutoff 过滤订单列表 */
  const filterByRange = (orders: any[], cutoff: TimeRangeCutoff): any[] => {
    if (!cutoff.start && !cutoff.end) return orders;
    return orders.filter((o: any) => {
      const d = parseOrderDate(o.time);
      if (!d) return true;
      if (cutoff.start && d < cutoff.start) return false;
      if (cutoff.end && d >= cutoff.end) return false;
      return true;
    });
  };

  /**
   * 判断当前页是否已超出时间范围下界（订单比 start 还早），
   * 若全部超出则可以停止翻页。
   */
  const isPageBeforeRange = (orders: any[], cutoff: TimeRangeCutoff): boolean => {
    if (!cutoff.start) return false;
    return orders.every((o: any) => {
      const d = parseOrderDate(o.time);
      return d !== null && d < cutoff.start!;
    });
  };

  const executeInWebview = async (script: string): Promise<any> => {
    if (!webviewRef.current) return null;
    return await webviewRef.current.executeJavaScript(script);
  };

  const waitForWebviewLoad = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!webviewRef.current) return resolve();
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) { isResolved = true; resolve(); }
      }, 4000);
      webviewRef.current.addEventListener(
        "did-finish-load",
        () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            setTimeout(resolve, 1000);
          }
        },
        { once: true },
      );
    });
  };

  const handleCaptureNextOrFinish = async (
    totalSaved: number,
    queue: any[],
    idx: number,
  ) => {
    const next = idx + 1;
    if (next < queue.length) {
      setCaptureQueueIndex(next);
      const nextAcc = queue[next];
      setAuthAccountId(nextAcc.id);
      setBrowserUrl(getOrderUrl(nextAcc.platform));
      setProgressMsg(
        `切换到第 ${next + 1}/${queue.length} 个账户 [${nextAcc.platform.toUpperCase()}]: ${nextAcc.nickname || nextAcc.account_name}，等待加载...`,
      );
      await waitForWebviewLoad();
    } else {
      setCaptureQueue([]);
      setCaptureQueueIndex(0);
      alert(`全部采集完成！共入库 ${totalSaved} 个订单。`);
      // @ts-ignore
      const ords = await window.api.getOrders();
      setOrders(ords);
    }
  };

  const handleCaptureStart = async (currentQueue: any[], currentIdx: number) => {
    if (!authAccountId || !webviewRef.current) return;
    const currentAccount = currentQueue.length > 0 ? currentQueue[currentIdx] : null;
    const platform = currentAccount?.platform || "jd";
    const extractScript = platform === "taobao" ? EXTRACT_TAOBAO_SCRIPT : EXTRACT_JD_SCRIPT;
    const nextPageScript = platform === "taobao" ? NEXT_PAGE_TAOBAO_SCRIPT : NEXT_PAGE_SCRIPT;
    const detailScript = platform === "taobao" ? EXTRACT_TAOBAO_DETAIL_SCRIPT : EXTRACT_JD_DETAIL_SCRIPT;

    log(`[采集启动] platform=${platform}, authAccountId=${authAccountId}`);

    // 在主 webview 加载 URL 并等待 did-stop-loading（含超时兜底）
    const loadInMainWebview = (url: string, maxMs = 12000): Promise<void> =>
      new Promise((resolve) => {
        const wv = webviewRef.current;
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            wv.removeEventListener("did-stop-loading", finish);
            resolve();
          }
        };
        wv.addEventListener("did-stop-loading", finish);
        setTimeout(finish, maxMs);
        wv.loadURL(url);
      });

    // 随机等待 min~max ms，避免请求间隔过短被风控
    const randomDelay = (min = 1000, max = 2000) =>
      new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

    // 加载完成后轮询提取，400ms/次，最多等 pollMaxMs
    // 一旦拿到有效数据立即返回，无需等满固定时间
    const pollExtract = async (script: string, pollMaxMs = 8000): Promise<any> => {
      const start = Date.now();
      let last: any = null;
      while (Date.now() - start < pollMaxMs) {
        const data = await executeInWebview(script);
        if (data && !data.error && data.order_id && data.products?.length > 0) return data;
        last = data;
        await new Promise(r => setTimeout(r, 400));
      }
      return last; // 超时，返回最后一次结果（可能是空/报错）
    };

    try {
      setIsCapturing(true);
      const accLabel = currentQueue.length > 0 ? `[${currentIdx + 1}/${currentQueue.length}] ` : "";

      // ── 第一阶段：翻列表页 ──────────────────────────────────────────────────
      // 先拉一次已有 order_id 集合用于增量判断
      // @ts-ignore
      const existingIds: Set<string> = await window.api.getAccountOrderIds(authAccountId);

      const allOrders: any[] = [];
      let totalSaved = 0;

        const timeRange = captureTimeRangeRef.current;
      const cutoff = getTimeRangeCutoff(timeRange);

      // 京东：按时间范围选择要访问的年份 URL（最多只访问必要的年份）
      // 淘宝：仅访问一次列表入口，依靠翻页 + 日期提前停止控制范围
      const listUrlsToVisit: Array<string | null> =
        platform === "jd" ? getJDUrlsForRange(timeRange) : [null];

      for (let urlIdx = 0; urlIdx < listUrlsToVisit.length; urlIdx++) {
        const yearUrl = listUrlsToVisit[urlIdx];

        // 获取当前年份标签，用于进度提示
        let yearLabel = "";
        if (yearUrl) {
          const dParam = new URL(yearUrl).searchParams.get("d");
          yearLabel = dParam === "2" ? "今年" : `${dParam}年`;
          setProgressMsg(`${accLabel}[列表] 加载 ${yearLabel} 订单页...`);
          await loadInMainWebview(yearUrl);
          await randomDelay(800, 1500);
        }

        let page = 1;
        let hasNext = true;

        while (hasNext) {
          setProgressMsg(
            `${accLabel}[列表]${yearLabel ? " " + yearLabel : ""} 第 ${page} 页...`
          );
          const orders = await executeInWebview(extractScript);
          log(
            `[采集]${yearLabel ? " " + yearLabel : ""} 第 ${page} 页提取结果:`,
            orders?.error ?? `${orders?.length ?? 0} 条订单`
          );

          if (orders && !orders.error && orders.length > 0) {
            // 飞猪订单在入库前就改写 detail_url，保证 DB 里存的是可用地址
            orders.forEach((o: any) => {
              if (o.detailUrl && /fliggy\.com/i.test(o.detailUrl)) {
                let fliggyOrderId = o.orderId;
                try {
                  const u = new URL(o.detailUrl);
                  fliggyOrderId =
                    u.searchParams.get("orderId") ||
                    u.searchParams.get("bizOrderId") ||
                    u.searchParams.get("biz_order_id") ||
                    o.orderId;
                } catch { /* 解析失败保留 orderId */ }
                o.detailUrl = `https://tradearchive.taobao.com/trade/detail/trade_item_detail.htm?biz_order_id=${fliggyOrderId}`;
              }
            });

            // 按时间范围过滤，只入库在范围内的订单
            const inRangeOrders = filterByRange(orders, cutoff);

            if (inRangeOrders.length > 0) {
              // @ts-ignore
              await window.api.saveOrders({ orders: inRangeOrders, accountId: authAccountId });
              totalSaved += inRangeOrders.length;
              allOrders.push(...inRangeOrders);
            }

            // 统计本页中有多少是新订单（用于增量跳过）
            const newCount = orders.filter(
              (o: any) => !existingIds.has(o.orderId)
            ).length;
            orders.forEach((o: any) => existingIds.add(o.orderId));

            // 当前页所有订单均早于时间范围 → 无需继续翻页
            if (isPageBeforeRange(orders, cutoff)) {
              log(
                `[采集]${yearLabel ? " " + yearLabel : ""} 第 ${page} 页订单已超出时间范围，停止翻页`
              );
              break;
            }

            if (newCount === 0) {
              log(
                `[采集]${yearLabel ? " " + yearLabel : ""} 第 ${page} 页全为已有订单，跳至下一年`
              );
              break;
            }
          }

          hasNext = await executeInWebview(nextPageScript);
          if (hasNext) {
            page++;
            setProgressMsg(
              `${accLabel}[列表]${yearLabel ? " " + yearLabel : ""} 准备进入第 ${page} 页...`
            );
            await randomDelay(1000, 2000);
            await waitForWebviewLoad();
          }
        }
      }

      log(`[采集] 第一阶段完成，本次收集 ${allOrders.length} 条订单`);

      // ── 第二阶段：用同一个主 webview 逐一加载详情页 ──────────────────────
      // 复用主 webview 已有的登录 session，天猫/淘宝 SameSite Cookie 自然携带，
      // 不再需要隐藏 webview 预热，彻底避免 ERR_FAILED (-2) 问题。
      if (platform === "jd" || platform === "taobao") {
        // 从 DB 读取该账户全量 raw_orders（含 detail_url、fallback_detail），不只是本次采集的
        // @ts-ignore
        const allDbOrders: { order_id: string; detail_url: string; fallback_detail: string | null }[] = await window.api.getAccountOrders(authAccountId);
        // 拉取已有详情的 order_id 集合
        // @ts-ignore
        const doneDetailIds: Set<string> = await window.api.getOrdersWithDetail(authAccountId, platform);

        // 差集：DB 里有但详情表里没有的才需要抓
        const needDetail = allDbOrders.filter((o) => !doneDetailIds.has(o.order_id));
        log(`[详情] DB共 ${allDbOrders.length} 条，${needDetail.length} 条缺详情，${doneDetailIds.size} 条已有详情，跳过`);

        for (let i = 0; i < needDetail.length; i++) {
          const order = needDetail[i];
          // DB 字段用下划线命名（order_id / detail_url / fallback_detail）
          const orderId = order.order_id;
          const storedDetailUrl = order.detail_url;
          try {
            setProgressMsg(`${accLabel}[详情] (${i + 1}/${needDetail.length}) 订单 ${orderId}`);

            // 判断 detail_url 是否为不可导航的伪链接（javascript:void(0) 等）
            const isJsVoidUrl = !storedDetailUrl
              || /^javascript:/i.test(storedDetailUrl.trim())
              || storedDetailUrl.trim() === '#';

            if (isJsVoidUrl) {
              // detail_url 不可用：直接用 fallback_detail（来自列表页的结构化数据）
              let fallbackDetail: any = null;
              try {
                if (order.fallback_detail) fallbackDetail = JSON.parse(order.fallback_detail);
              } catch { /* JSON 解析失败忽略 */ }

              if (fallbackDetail && fallbackDetail.order_id) {
                log(`[详情] 订单 ${orderId} detail_url 不可导航，使用 fallback_detail 入库`);
                const saveApi = platform === "taobao"
                  ? (window as any).api.saveTaobaoOrderDetail
                  : (window as any).api.saveJDOrderDetail;
                await saveApi({ order_id: orderId, account_id: authAccountId, ...fallbackDetail });
              } else {
                log(`[详情] 订单 ${orderId} detail_url 不可导航且无 fallback_detail，跳过`);
              }
              continue;
            }

            const fallbackUrl = platform === "taobao"
              ? `https://buyertrade.taobao.com/trade/detail/trade_item_detail.htm?bizOrderId=${orderId}`
              : `https://details.jd.com/normal/item.action?orderid=${orderId}`;
            let targetUrl = storedDetailUrl || fallbackUrl;

            // 飞猪订单改写到 tradearchive.taobao.com（页面结构与淘宝详情一致）
            // 订单号优先从飞猪 URL 参数里提取（orderId= / bizOrderId=），避免 DB 清洗导致不一致
            if (/fliggy\.com/i.test(targetUrl)) {
              let fliggyOrderId = orderId;
              try {
                const u = new URL(targetUrl);
                fliggyOrderId = u.searchParams.get("orderId")
                  || u.searchParams.get("bizOrderId")
                  || u.searchParams.get("biz_order_id")
                  || orderId;
              } catch { /* 解析失败保留 orderId */ }
              targetUrl = `https://tradearchive.taobao.com/trade/detail/trade_item_detail.htm?biz_order_id=${fliggyOrderId}`;
              log(`[详情] 飞猪订单改写 URL -> ${targetUrl}`);
            }

            const urlSource = storedDetailUrl ? "db" : "fallback";
            log(`[详情] (${i + 1}/${needDetail.length}) 订单 ${orderId} [${urlSource}] -> ${targetUrl}`);

            // 加载详情页后轮询提取，失败时最多整页重载 2 次
            let detailData: any = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
              await loadInMainWebview(targetUrl);
              await randomDelay(1000, 2000); // 页面加载后随机等待，避免风控
              detailData = await pollExtract(detailScript);

              const ok = !detailData?.error && detailData?.order_id && detailData?.products?.length > 0;
              if (ok) break;

              const debugInfo = await executeInWebview(
                `({ url: location.href, title: document.title, bodyLen: document.body.innerHTML.length })`
              );
              log(`[详情调试] 落地URL: ${debugInfo?.url} | bodyLen: ${debugInfo?.bodyLen} | attempt=${attempt}`);
              log(`[详情调试] 提取结果: order_id=${detailData?.order_id}, products=${detailData?.products?.length}`);

              if (attempt < 3) {
                log(`[详情] 订单 ${orderId} 第 ${attempt} 次失败(${detailData?.error || "无数据"})，重载重试...`);
              } else {
                log(`[详情] 订单 ${orderId} 已重试 3 次，均失败`);
              }
            }

            const hasError = !!detailData?.error;
            const hasNoStructure = !detailData?.products?.length || !detailData?.order_id;

            if (hasError || hasNoStructure) {
              log(`Order ${orderId} detail failed, skipping.`);
            }

            if (detailData && !detailData.error) {
              if (detailData.products && detailData.products.length > 0) {
                for (let j = 0; j < detailData.products.length; j++) {
                  const p = detailData.products[j];
                  if (p.name) {
                    try {
                      setProgressMsg(`${accLabel}[AI分类] (${i + 1}/${needDetail.length}) 商品 ${j + 1}/${detailData.products.length}...`);
                      // @ts-ignore
                      p.category = await window.api.askOllama(p.name);
                    } catch (e) {
                      console.error("Ollama classification failed:", e);
                      p.category = "其他";
                    }
                  }
                }
              }

              const saveApi = platform === "taobao"
                ? (window as any).api.saveTaobaoOrderDetail
                : (window as any).api.saveJDOrderDetail;
              await saveApi({ order_id: orderId, account_id: authAccountId, ...detailData });
            } else if (detailData?.error) {
              console.error(`${platform} Detail error:`, detailData.error);
            }
          } catch (e: any) {
            console.error("Failed detail", orderId, e);
          }
        }
      }

      if (currentQueue.length > 0) {
        await handleCaptureNextOrFinish(totalSaved, currentQueue, currentIdx);
      } else {
        alert(`采集结束，入库 ${totalSaved} 个订单！`);
        // @ts-ignore
        const ords = await window.api.getOrders();
        setOrders(ords);
      }
    } catch (e: any) {
      alert(`采集失败: ${e.message}`);
    } finally {
      setIsCapturing(false);
      setProgressMsg("");
    }
  };

  /**
   * 采集所有账户，可通过 platformFilter 限定只采集某平台（"jd" | "taobao"），
   * timeRange 指定时间范围（"last_month" | "this_year" | "2025" | "2024" 等）
   */
  const handleCaptureAll = async (platformFilter?: string, timeRange?: string) => {
    captureTimeRangeRef.current = timeRange || "this_year";
    const allAccounts: any[] = [];
    for (const user of users) {
      // @ts-ignore
      const accs = await window.api.getAccounts(user.id);
      const valid = accs.filter((a: any) => {
        if (a.status !== "valid") return false;
        if (platformFilter) return a.platform === platformFilter;
        return a.platform === "jd" || a.platform === "taobao";
      });
      allAccounts.push(...valid.map((a: any) => ({ ...a, userName: user.name })));
    }

    const label = platformFilter ? platformFilter.toUpperCase() : "京东或淘宝";
    if (allAccounts.length === 0) {
      return alert(`没有可用的${label}账户，请先在设置页面授权账号！`);
    }

    setCaptureQueue(allAccounts);
    setCaptureQueueIndex(0);

    const first = allAccounts[0];
    setAuthAccountId(first.id);
    setBrowserUrl(getOrderUrl(first.platform));
    setIsBrowserOpen(true);
    setProgressMsg(
      `准备采集第 1 / ${allAccounts.length} 个账户[${first.platform.toUpperCase()}]: ${first.nickname || first.account_name}`,
    );
  };

  return {
    isCapturing,
    progressMsg,
    captureQueue,
    captureQueueIndex,
    handleCaptureStart,
    handleCaptureAll,
  };
}
