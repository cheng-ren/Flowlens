import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getOrders: () => ipcRenderer.invoke('get-orders'),
  getOrdersByPlatform: (platform: string) => ipcRenderer.invoke('get-orders-by-platform', platform),

  // Family
  createFamily: (name: string) => ipcRenderer.invoke('create-family', name),
  getFamilies: () => ipcRenderer.invoke('get-families'),
  deleteFamily: (id: string) => ipcRenderer.invoke('delete-family', id),
  // User
  createUser: (data: { familyId: string, name: string }) => ipcRenderer.invoke('create-user', data),
  getUsers: (familyId: string) => ipcRenderer.invoke('get-users', familyId),
  deleteUser: (id: string) => ipcRenderer.invoke('delete-user', id),
  // Account
  createAccount: (data: { userId: string, platform: string, accountName: string }) => ipcRenderer.invoke('create-account', data),
  getAccounts: (userId: string) => ipcRenderer.invoke('get-accounts', userId),
  deleteAccount: (id: string) => ipcRenderer.invoke('delete-account', id),
  saveAccountCookies: (accountId: string) => ipcRenderer.invoke('save-account-cookies', accountId),
  saveOrders: (data: { orders: any[], accountId: string }) => ipcRenderer.invoke('save-orders', data),
  saveJDOrderDetail: (detail: any) => ipcRenderer.invoke('save-jd-order-detail', detail),
  saveTaobaoOrderDetail: (detail: any) => ipcRenderer.invoke('save-taobao-order-detail', detail),
  askOllama: (prompt: string) => ipcRenderer.invoke('ask-ollama', prompt),
  getLlmConfig: () => ipcRenderer.invoke('get-llm-config'),
  saveLlmConfig: (config: { baseUrl: string; apiKey: string; model: string }) => ipcRenderer.invoke('save-llm-config', config),
  testLlmConfig: (config: { baseUrl: string; apiKey: string; model: string }) => ipcRenderer.invoke('test-llm-config', config),
  getAccountOrderIds: (accountId: string) => ipcRenderer.invoke('get-account-order-ids', accountId),
  getAccountOrders: (accountId: string) => ipcRenderer.invoke('get-account-orders', accountId),
  getOrdersWithDetail: (accountId: string, platform: string) => ipcRenderer.invoke('get-orders-with-detail', accountId, platform),
  // 支付宝账单
  importAlipayExcel: (userId?: string) => ipcRenderer.invoke('import-alipay-excel', userId),
  getAlipayBills: (userId?: string) => ipcRenderer.invoke('get-alipay-bills', userId),
  // 微信账单
  importWechatExcel: (userId?: string) => ipcRenderer.invoke('import-wechat-excel', userId),
  getWechatBills: (userId?: string) => ipcRenderer.invoke('get-wechat-bills', userId),
  // 银行流水（旧接口保留兼容）
  importBankPdf: () => ipcRenderer.invoke('import-bank-pdf'),
  getBankTransactions: (profileId?: string) => ipcRenderer.invoke('get-bank-transactions', profileId),
  // 银行档案管理
  bankGetProfiles: (userId?: string) => ipcRenderer.invoke('bank-get-profiles', userId),
  bankCreateProfile: (data: { name: string; userId: string }) => ipcRenderer.invoke('bank-create-profile', data),
  bankUpdateScript: (data: { id: string; script: string; description: string; fileType: string }) => ipcRenderer.invoke('bank-update-script', data),
  bankDeleteProfile: (id: string) => ipcRenderer.invoke('bank-delete-profile', id),
  // AI 分析导入流程（两步拆分：选文件 + 生成脚本）
  bankPickFile: (data: { profileId: string }) => ipcRenderer.invoke('bank-pick-file', data),
  bankGenerateScript: (data: { filePath: string; fileType: string; fileContent: string }) => ipcRenderer.invoke('bank-generate-script', data),
  bankPreviewWithScript: (data: { filePath: string; script: string; fileType: string }) => ipcRenderer.invoke('bank-preview-with-script', data),
  bankImportConfirmed: (data: { profileId: string; filePath: string; script: string; fileType: string }) => ipcRenderer.invoke('bank-import-confirmed', data),
  // 数据分析
  getAnalyticsYears: () => ipcRenderer.invoke('get-analytics-years'),
  getAnalyticsOverview: (year: string) => ipcRenderer.invoke('get-analytics-overview', year),
  getMonthlyTrend: (year: string) => ipcRenderer.invoke('get-monthly-trend', year),
  getPlatformStats: (year: string) => ipcRenderer.invoke('get-platform-stats', year),
  getBankStats: (year: string) => ipcRenderer.invoke('get-bank-stats', year),
  getCategoryStats: (year: string) => ipcRenderer.invoke('get-category-stats', year),
  getAssetFlow: (year: string) => ipcRenderer.invoke('get-asset-flow', year),
  log: (...args: any[]) => ipcRenderer.send('log', ...args)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
