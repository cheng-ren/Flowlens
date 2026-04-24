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
  getAccountOrderIds: (accountId: string) => ipcRenderer.invoke('get-account-order-ids', accountId),
  getAccountOrders: (accountId: string) => ipcRenderer.invoke('get-account-orders', accountId),
  getOrdersWithDetail: (accountId: string, platform: string) => ipcRenderer.invoke('get-orders-with-detail', accountId, platform),
  // 支付宝账单
  importAlipayExcel: () => ipcRenderer.invoke('import-alipay-excel'),
  getAlipayBills: () => ipcRenderer.invoke('get-alipay-bills'),
  // 微信账单
  importWechatExcel: () => ipcRenderer.invoke('import-wechat-excel'),
  getWechatBills: () => ipcRenderer.invoke('get-wechat-bills'),
  // 银行流水
  importBankPdf: () => ipcRenderer.invoke('import-bank-pdf'),
  getBankTransactions: () => ipcRenderer.invoke('get-bank-transactions'),
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
