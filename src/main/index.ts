import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard,
  nativeTheme,
  screen,
  Notification,
  shell,
} from "electron";
import * as path from "path";
import { Database } from "./database";
import { ClipboardWatcher } from "./clipboard";
import { Settings } from "./settings";

let mainWindow: BrowserWindow | null = null;
let database: Database;
let clipboardWatcher: ClipboardWatcher;
let settings: Settings;
let isContentReady = false;
let isShowingWindow = false; // Track if we're in the process of showing the window
let showWindowTimeout: NodeJS.Timeout | null = null; // Track pending show operations
let isToggling = false; // Prevent blur handler from interfering with toggle
let lastToggleTime = 0; // Track when we last toggled to prevent race conditions

// Only dev mode when NOT packaged (regardless of NODE_ENV)
const isDev = !app.isPackaged;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 560,
    x: Math.floor((screenWidth - 900) / 2),
    y: Math.floor(screenHeight * 0.15),
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    vibrancy: "fullscreen-ui",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  /**
   * Track when content is fully loaded
   * Multiple checks to ensure React is fully rendered before marking as ready
   */
  const markContentReady = () => {
    isContentReady = true;
  };

  // Fast check: DOM ready
  mainWindow.webContents.once("dom-ready", () => {
    // Wait for React to hydrate and render (reduced from 400ms)
    setTimeout(markContentReady, 150);
  });

  // Slower check: Full page load
  mainWindow.webContents.once("did-finish-load", () => {
    // Wait a bit longer for React to fully render (reduced from 500ms)
    setTimeout(markContentReady, 200);
  });

  // Reset ready flag if page fails to load
  mainWindow.webContents.on("did-fail-load", () => {
    isContentReady = false;
    console.error("Failed to load window content");
  });
  
  // Reset content ready flag when window is hidden
  // This ensures content reloads properly on next open
  mainWindow.on("hide", () => {
    isContentReady = false;
    isShowingWindow = false; // Reset showing flag
    // Cancel any pending show operations
    if (showWindowTimeout) {
      clearTimeout(showWindowTimeout);
      showWindowTimeout = null;
    }
  });

  mainWindow.on("blur", () => {
    // Don't hide if we're in the middle of toggling or just toggled (prevents race condition)
    const timeSinceLastToggle = Date.now() - lastToggleTime;
    if (isToggling || timeSinceLastToggle < 200) {
      return;
    }
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  // Don't show window on startup - only show when shortcut is pressed
  mainWindow.once("ready-to-show", () => {
    // Window stays hidden until user presses shortcut
  });
}

function registerShortcut() {
  const shortcut = settings.get("shortcut", "CommandOrControl+Shift+V");
  
  globalShortcut.unregisterAll();
  
  const success = globalShortcut.register(shortcut, () => {
    if (!mainWindow) {
      console.error("Main window not initialized");
      return;
    }

    // Update toggle time and set flag to prevent blur handler from interfering
    lastToggleTime = Date.now();
    isToggling = true;
    
    // Check window visibility state - use multiple checks for reliability
    const isCurrentlyVisible = mainWindow.isVisible() && !mainWindow.isMinimized();
    const shouldHide = isCurrentlyVisible || isShowingWindow;
    
    // Toggle visibility: if visible OR in the process of showing, hide it
    if (shouldHide) {
      // Cancel any pending show operations
      if (showWindowTimeout) {
        clearTimeout(showWindowTimeout);
        showWindowTimeout = null;
      }
      isShowingWindow = false;
      // Force hide the window immediately
      mainWindow.hide();
      // Double-check and hide again if still visible (sometimes needed)
      setTimeout(() => {
        if (mainWindow && mainWindow.isVisible()) {
          mainWindow.hide();
        }
        isToggling = false;
      }, 50);
      return;
    }

    // Show window: position it at the center of the screen
    try {
        // Get the primary display (or display where cursor is)
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const { x: displayX, y: displayY } = primaryDisplay.workArea;
        
        // Window dimensions
        const windowWidth = 900;
        const windowHeight = 560;
        
        // Calculate center position
        const centerX = displayX + Math.floor((screenWidth - windowWidth) / 2);
        const centerY = displayY + Math.floor((screenHeight - windowHeight) / 2);
        
        // Position window at center of screen
        mainWindow.setPosition(centerX, centerY);
        
        // Make window appear on all spaces/desktops
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        
        // Use pop-up-menu level to appear above all apps
        mainWindow.setAlwaysOnTop(true, "pop-up-menu", 1);
        
        // CRITICAL: Only show window when content is FULLY ready
        // This prevents blank screen from appearing
        // Also track that we're showing to prevent duplicate shows
        isShowingWindow = true;
        
        const showWindowWhenReady = () => {
          // Check if user canceled (pressed shortcut again)
          if (!isShowingWindow || !mainWindow) {
            return;
          }
          
          // Check if content is ready
          const contentReady = isContentReady && !mainWindow.webContents.isLoading();
          const pageLoaded = mainWindow.webContents.getURL() && !mainWindow.webContents.isLoading();
          
          if (contentReady) {
            // Content is fully ready - safe to show
            if (isShowingWindow && mainWindow) {
              mainWindow.show();
              mainWindow.moveTop();
              mainWindow.focus();
              mainWindow.webContents.send("window-shown");
              isShowingWindow = false;
            }
          } else if (pageLoaded) {
            // Page loaded but React might not be ready - wait a bit more (reduced from 600ms)
            showWindowTimeout = setTimeout(() => {
              if (isShowingWindow && mainWindow) {
                // Mark as ready and show
                isContentReady = true;
                mainWindow.show();
                mainWindow.moveTop();
                mainWindow.focus();
                mainWindow.webContents.send("window-shown");
                isShowingWindow = false;
                showWindowTimeout = null;
              }
            }, 200); // Reduced wait time for React to render
          } else {
            // Page still loading - wait for it
            const checkReady = () => {
              if (!isShowingWindow || !mainWindow) {
                return; // User canceled
              }
              
              if (mainWindow.webContents.isLoading()) {
                showWindowTimeout = setTimeout(checkReady, 30); // Reduced polling interval from 50ms
              } else {
                // Page loaded, wait for React (reduced from 600ms)
                showWindowTimeout = setTimeout(() => {
                  if (isShowingWindow && mainWindow) {
                    isContentReady = true;
                    mainWindow.show();
                    mainWindow.moveTop();
                    mainWindow.focus();
                    mainWindow.webContents.send("window-shown");
                    isShowingWindow = false;
                    showWindowTimeout = null;
                  }
                }, 200); // Reduced wait time
              }
            };
            checkReady();
          }
        };
        
        // Start checking for content readiness
        showWindowWhenReady();
        
        // Reset toggling flag after window is shown
        setTimeout(() => {
          isToggling = false;
        }, 500);
    } catch (error) {
      console.error("Error showing window:", error);
      isToggling = false;
      isShowingWindow = false;
    }
  });

  if (!success) {
    console.error("Failed to register shortcut:", shortcut);
  }
}

function setupIPC() {
  // Get all items (clips + scripts)
  ipcMain.handle("get-items", async () => {
    const clips = database.getClips();
    const scripts = database.getScripts();
    return { clips, scripts };
  });

  // Get clips only
  ipcMain.handle("get-clips", () => {
    return database.getClips();
  });

  // Get scripts only
  ipcMain.handle("get-scripts", () => {
    return database.getScripts();
  });

  // Add or update a script
  ipcMain.handle("save-script", (_, script) => {
    return database.saveScript(script);
  });

  // Delete a script
  ipcMain.handle("delete-script", (_, id) => {
    return database.deleteScript(id);
  });

  // Delete a clip
  ipcMain.handle("delete-clip", (_, id) => {
    return database.deleteClip(id);
  });

  // Copy to clipboard
  ipcMain.handle("copy-to-clipboard", async (_, text) => {
    try {
      // Pause watcher
      clipboardWatcher.pause();
      
      // Write to clipboard
      clipboard.writeText(text);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Tell watcher to ignore the next clipboard change (which is this copy)
      // and reset tracking so next paste is treated as new
      clipboardWatcher.ignoreNext();
      clipboardWatcher.resetTracking();
      
      // Resume watcher
      clipboardWatcher.resume();
      
      return true;
    } catch (error) {
      console.error("Copy failed:", error);
      clipboardWatcher.resume();
      return false;
    }
  });

  // Temporarily lower window level for native pickers
  ipcMain.handle("lower-window-level", () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true, "normal");
    }
  });

  // Restore high window level
  ipcMain.handle("restore-window-level", () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true, "pop-up-menu", 1);
    }
  });

  // Pin a clip (convert to permanent script)
  ipcMain.handle("pin-clip", (_, clipId, title) => {
    const clip = database.getClipById(clipId);
    if (clip) {
      database.saveScript({
        title: title || clip.content.slice(0, 50),
        content: clip.content,
        type: "text",
        tags: "",
        expiresAt: null,
      });
      database.deleteClip(clipId);
    }
    return true;
  });

  // Settings
  ipcMain.handle("get-settings", () => {
    return {
      shortcut: settings.get("shortcut", "CommandOrControl+Shift+V"),
      maxClips: settings.get("maxClips", 100),
      fontSize: settings.get("fontSize", "small"),
    };
  });

  ipcMain.handle("update-settings", (_, newSettings) => {
    if (newSettings.shortcut) {
      settings.set("shortcut", newSettings.shortcut);
      registerShortcut();
    }
    if (newSettings.maxClips) {
      settings.set("maxClips", newSettings.maxClips);
    }
    if (newSettings.fontSize) {
      settings.set("fontSize", newSettings.fontSize);
    }
    return true;
  });

  // Hide window
  ipcMain.handle("hide-window", () => {
    mainWindow?.hide();
  });

  // Open URL in default browser (not in-app browser)
  ipcMain.handle("open-external-url", (_, url: string) => {
    try {
      if (!url || typeof url !== "string") {
        console.error("Invalid URL provided:", url);
        return false;
      }
      
      // Ensure URL has a protocol
      let finalUrl = url.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }
      
      console.log("Opening URL in browser:", finalUrl);
      shell.openExternal(finalUrl);
      return true;
    } catch (error) {
      console.error("Error opening URL:", error);
      return false;
    }
  });

  // Clear all clips
  ipcMain.handle("clear-clips", () => {
    database.clearClips();
    return true;
  });

  // Tasks
  ipcMain.handle("get-tasks", () => {
    return database.getTasks();
  });

  ipcMain.handle("get-overdue-count", () => {
    return database.getOverdueTaskCount();
  });

  ipcMain.handle("add-task", (_, content: string, title: string, remindAt: string, recurringInterval: string | null = null) => {
    return database.addTask(content, title, remindAt, recurringInterval);
  });

  ipcMain.handle("complete-task", (_, id: string) => {
    database.completeTask(id);
    return true;
  });

  ipcMain.handle("update-task", (_, id: string, title: string, remindAt: string, recurringInterval: string | null = null) => {
    database.updateTask(id, title, remindAt, recurringInterval);
    return true;
  });

  ipcMain.handle("delete-task", (_, id: string) => {
    database.deleteTask(id);
    return true;
  });
}

function checkDueTasks() {
  const dueTasks = database.getDueTasks();
  for (const task of dueTasks) {
    // Show notification
    const notification = new Notification({
      title: "📋 Reminder: " + task.title,
      body: task.content.length > 100 ? task.content.slice(0, 100) + "..." : task.content,
      silent: false,
    });
    
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("navigate-to-task", task.id);
      }
    });
    
    notification.show();
    
    // If recurring interval is set, calculate next reminder time
    if (task.recurringInterval) {
      const nextRemindAt = calculateNextReminder(task.remindAt, task.recurringInterval);
      database.updateTaskRemindAt(task.id, nextRemindAt);
      // Don't mark as notified - it will be notified again at the next interval
    } else {
      // One-time reminder - mark as notified
      database.markTaskNotified(task.id);
    }
  }
}

function calculateNextReminder(currentRemindAt: string, interval: string): string {
  const baseDate = new Date(currentRemindAt);
  const match = interval.match(/^(\d+)([hmd])$/);
  if (!match) return baseDate.toISOString();
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "m":
      baseDate.setMinutes(baseDate.getMinutes() + amount);
      break;
    case "h":
      baseDate.setHours(baseDate.getHours() + amount);
      break;
    case "d":
      baseDate.setDate(baseDate.getDate() + amount);
      break;
  }
  
  return baseDate.toISOString();
}

app.whenReady().then(() => {
  // Initialize components
  settings = new Settings();
  database = new Database();
  clipboardWatcher = new ClipboardWatcher((content) => {
    database.addClip(content, settings.get("maxClips", 100));
    mainWindow?.webContents.send("clip-added");
  });

  // Clean expired scripts on startup
  database.cleanExpiredScripts();

  nativeTheme.themeSource = "dark";
  
  // Set login item (auto-start on system boot)
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
    });
  }
  
  createWindow();
  setupIPC();
  registerShortcut();
  clipboardWatcher.start();
  
  // Check for due tasks every 30 seconds
  setInterval(checkDueTasks, 30000);
  // Also check immediately
  setTimeout(checkDueTasks, 2000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Don't quit on macOS when all windows are closed - keep running in background
  // This allows the global shortcut to continue working
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  clipboardWatcher?.stop();
  database?.close();
});