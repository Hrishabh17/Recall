import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Data
  getItems: () => ipcRenderer.invoke("get-items"),
  getClips: () => ipcRenderer.invoke("get-clips"),
  getScripts: () => ipcRenderer.invoke("get-scripts"),
  
  // Scripts
  saveScript: (script: any) => ipcRenderer.invoke("save-script", script),
  deleteScript: (id: string) => ipcRenderer.invoke("delete-script", id),
  removeTagFromAll: (tag: string) => ipcRenderer.invoke("remove-tag-from-all", tag),
  
  // Clips
  deleteClip: (id: string) => ipcRenderer.invoke("delete-clip", id),
  pinClip: (clipId: string, title?: string) => ipcRenderer.invoke("pin-clip", clipId, title),
  clearClips: () => ipcRenderer.invoke("clear-clips"),
  
  // Tasks
  getTasks: () => ipcRenderer.invoke("get-tasks"),
  getOverdueCount: () => ipcRenderer.invoke("get-overdue-count"),
  addTask: (
    content: string, 
    title: string, 
    remindAt: string, 
    recurringInterval?: string | null,
    priority?: "low" | "medium" | "high" | "urgent",
    category?: string
  ) => 
    ipcRenderer.invoke("add-task", content, title, remindAt, recurringInterval, priority, category),
  updateTask: (
    id: string, 
    title: string, 
    remindAt: string, 
    recurringInterval?: string | null,
    priority?: "low" | "medium" | "high" | "urgent",
    category?: string
  ) =>
    ipcRenderer.invoke("update-task", id, title, remindAt, recurringInterval, priority, category),
  snoozeTask: (id: string, snoozedUntil: string) =>
    ipcRenderer.invoke("snooze-task", id, snoozedUntil),
  clearSnooze: (id: string) =>
    ipcRenderer.invoke("clear-snooze", id),
  completeTask: (id: string) => ipcRenderer.invoke("complete-task", id),
  deleteTask: (id: string) => ipcRenderer.invoke("delete-task", id),
  
  // Clipboard (supports text or image)
  copyToClipboard: (data: string | { type: "image"; imageData: string }) => 
    ipcRenderer.invoke("copy-to-clipboard", data),
  
  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: any) => ipcRenderer.invoke("update-settings", settings),
  
  // Window
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  lowerWindowLevel: () => ipcRenderer.invoke("lower-window-level"),
  restoreWindowLevel: () => ipcRenderer.invoke("restore-window-level"),
  openExternalUrl: (url: string) => ipcRenderer.invoke("open-external-url", url),
  
  // Events
  onClipAdded: (callback: () => void) => {
    ipcRenderer.on("clip-added", callback);
    return () => ipcRenderer.removeListener("clip-added", callback);
  },
  onWindowShown: (callback: () => void) => {
    ipcRenderer.on("window-shown", callback);
    return () => ipcRenderer.removeListener("window-shown", callback);
  },
  onWindowHidden: (callback: () => void) => {
    ipcRenderer.on("window-hidden", callback);
    return () => ipcRenderer.removeListener("window-hidden", callback);
  },
  onNavigateToTask: (callback: (taskId: string) => void) => {
    const handler = (_: any, taskId: string) => callback(taskId);
    ipcRenderer.on("navigate-to-task", handler);
    return () => ipcRenderer.removeListener("navigate-to-task", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
