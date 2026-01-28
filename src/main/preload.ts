import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Data
  getItems: () => ipcRenderer.invoke("get-items"),
  getClips: () => ipcRenderer.invoke("get-clips"),
  getScripts: () => ipcRenderer.invoke("get-scripts"),
  
  // Scripts
  saveScript: (script: any) => ipcRenderer.invoke("save-script", script),
  deleteScript: (id: string) => ipcRenderer.invoke("delete-script", id),
  
  // Clips
  deleteClip: (id: string) => ipcRenderer.invoke("delete-clip", id),
  pinClip: (clipId: string, title?: string) => ipcRenderer.invoke("pin-clip", clipId, title),
  clearClips: () => ipcRenderer.invoke("clear-clips"),
  
  // Tasks
  getTasks: () => ipcRenderer.invoke("get-tasks"),
  getOverdueCount: () => ipcRenderer.invoke("get-overdue-count"),
  addTask: (content: string, title: string, remindAt: string, recurringInterval?: string | null) => 
    ipcRenderer.invoke("add-task", content, title, remindAt, recurringInterval),
  updateTask: (id: string, title: string, remindAt: string, recurringInterval?: string | null) =>
    ipcRenderer.invoke("update-task", id, title, remindAt, recurringInterval),
  completeTask: (id: string) => ipcRenderer.invoke("complete-task", id),
  deleteTask: (id: string) => ipcRenderer.invoke("delete-task", id),
  
  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke("copy-to-clipboard", text),
  
  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: any) => ipcRenderer.invoke("update-settings", settings),
  
  // Window
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  lowerWindowLevel: () => ipcRenderer.invoke("lower-window-level"),
  restoreWindowLevel: () => ipcRenderer.invoke("restore-window-level"),
  
  // Events
  onClipAdded: (callback: () => void) => {
    ipcRenderer.on("clip-added", callback);
    return () => ipcRenderer.removeListener("clip-added", callback);
  },
  onWindowShown: (callback: () => void) => {
    ipcRenderer.on("window-shown", callback);
    return () => ipcRenderer.removeListener("window-shown", callback);
  },
  onNavigateToTask: (callback: (taskId: string) => void) => {
    const handler = (_: any, taskId: string) => callback(taskId);
    ipcRenderer.on("navigate-to-task", handler);
    return () => ipcRenderer.removeListener("navigate-to-task", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
