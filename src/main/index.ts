import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard,
  nativeImage,
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
    // Emit window-hidden event for renderer to reset state
    // mainWindow is guaranteed to be non-null here since we're inside createWindow()
    const window = mainWindow;
    if (window) {
      window.webContents.send("window-hidden");
    }
  });

  // Re-register shortcut when window is shown (handles cases where shortcut was lost)
  mainWindow.on("show", () => {
    verifyShortcut();
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
  
  // Check if shortcut is already registered
  if (globalShortcut.isRegistered(shortcut)) {
    return; // Already registered, don't re-register
  }
  
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
  } else {
    console.log("Global shortcut registered:", shortcut);
  }
}

// Verify and re-register shortcut if needed
function verifyShortcut() {
  const shortcut = settings.get("shortcut", "CommandOrControl+Shift+V");
  
  if (!globalShortcut.isRegistered(shortcut)) {
    console.log("Shortcut was unregistered, re-registering...");
    registerShortcut();
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
    database.deleteScript(id);
  });

  // Remove tag from all scripts (permanently delete tag)
  ipcMain.handle("remove-tag-from-all", (_, tag: string) => {
    const count = database.removeTagFromAllScripts(tag);
    return { success: true, updatedScripts: count };
  });

  // Delete a clip
  ipcMain.handle("delete-clip", (_, id) => {
    return database.deleteClip(id);
  });

  // Copy to clipboard (text or image)
  ipcMain.handle("copy-to-clipboard", async (_, data: string | { type: "image"; imageData: string }) => {
    try {
      // Pause watcher
      clipboardWatcher.pause();
      
      // Check if it's an image or text
      if (typeof data === "object" && data.type === "image" && data.imageData) {
        // Copy image to clipboard
        const image = nativeImage.createFromDataURL(data.imageData);
        clipboard.writeImage(image);
        // Update watcher's last image hash
        clipboardWatcher.updateLastImage(data.imageData);
      } else {
        // Copy text to clipboard
        const text = typeof data === "string" ? data : "";
        clipboard.writeText(text);
        clipboardWatcher.updateLastContent(text);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Tell watcher to ignore the next clipboard change (which is this copy)
      // and reset tracking so next paste is treated as new
      clipboardWatcher.ignoreNext();
      
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

  ipcMain.handle("add-task", (
    _, 
    content: string, 
    title: string, 
    remindAt: string, 
    recurringInterval: string | null = null,
    priority: "low" | "medium" | "high" | "urgent" = "medium",
    category: string = ""
  ) => {
    return database.addTask(content, title, remindAt, recurringInterval, priority, category);
  });

  ipcMain.handle("complete-task", (_, id: string) => {
    database.completeTask(id);
    return true;
  });

  ipcMain.handle("update-task", (
    _, 
    id: string, 
    title: string, 
    remindAt: string, 
    recurringInterval: string | null = null,
    priority: "low" | "medium" | "high" | "urgent" = "medium",
    category: string = ""
  ) => {
    database.updateTask(id, title, remindAt, recurringInterval, priority, category);
    return true;
  });
  
  ipcMain.handle("snooze-task", (_, id: string, snoozedUntil: string) => {
    database.snoozeTask(id, snoozedUntil);
    return true;
  });
  
  ipcMain.handle("clear-snooze", (_, id: string) => {
    database.clearSnooze(id);
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
  
  // Handle simple intervals: 5m, 1h, 2d, etc.
  const simpleMatch = interval.match(/^(\d+)([hmd])$/);
  if (simpleMatch) {
    const amount = parseInt(simpleMatch[1]);
    const unit = simpleMatch[2];
    
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
  
  // Handle weekly patterns: weekly:mon, weekly:tue, etc.
  const weeklyMatch = interval.match(/^weekly:([a-z]{3})$/);
  if (weeklyMatch) {
    const dayAbbr = weeklyMatch[1].toLowerCase();
    const dayMap: { [key: string]: number } = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };
    const targetDay = dayMap[dayAbbr];
    if (targetDay !== undefined) {
      const currentDay = baseDate.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Next week if same day
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      return baseDate.toISOString();
    }
  }
  
  // Handle monthly patterns: monthly:15, monthly:last
  const monthlyMatch = interval.match(/^monthly:(\d+|last)$/);
  if (monthlyMatch) {
    const dayOrLast = monthlyMatch[1];
    baseDate.setMonth(baseDate.getMonth() + 1);
    if (dayOrLast === "last") {
      // Set to last day of month
      baseDate.setDate(0); // Go to last day of previous month, then add 1 month
      baseDate.setMonth(baseDate.getMonth() + 1);
    } else {
      const day = parseInt(dayOrLast);
      const lastDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
      baseDate.setDate(Math.min(day, lastDayOfMonth));
    }
    return baseDate.toISOString();
  }
  
  // Handle cron expressions: cron:0 9 * * *
  const cronMatch = interval.match(/^cron:(.+)$/);
  if (cronMatch) {
    const cronExpr = cronMatch[1].trim();
    return calculateNextCronTime(baseDate, cronExpr);
  }
  
  // Default: return current date if pattern not recognized
  return baseDate.toISOString();
}

/**
 * Calculate next execution time from a cron expression
 * Format: minute hour day month dayOfWeek
 * Supports: *, numbers, ranges, lists, step values
 */
function calculateNextCronTime(baseDate: Date, cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    // Invalid cron expression, return base date + 1 hour
    baseDate.setHours(baseDate.getHours() + 1);
    return baseDate.toISOString();
  }

  const [minute, hour, day, month, dayOfWeek] = parts;
  let nextDate = new Date(baseDate);
  nextDate.setSeconds(0, 0); // Reset seconds and milliseconds
  
  // Start from 1 minute in the future to avoid immediate execution
  nextDate.setMinutes(nextDate.getMinutes() + 1);
  
  // Try to find next match within the next year
  const maxIterations = 365 * 24 * 60; // Max iterations to prevent infinite loops
  let iterations = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Check month
    if (!matchesCronField(month, nextDate.getMonth() + 1, 1, 12)) {
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(1);
      nextDate.setHours(0);
      nextDate.setMinutes(0);
      continue;
    }
    
    // Check day of month
    if (!matchesCronField(day, nextDate.getDate(), 1, 31)) {
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(0);
      nextDate.setMinutes(0);
      continue;
    }
    
    // Check day of week (0 = Sunday, 6 = Saturday)
    if (!matchesCronField(dayOfWeek, nextDate.getDay(), 0, 6)) {
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(0);
      nextDate.setMinutes(0);
      continue;
    }
    
    // Check hour
    if (!matchesCronField(hour, nextDate.getHours(), 0, 23)) {
      nextDate.setHours(nextDate.getHours() + 1);
      nextDate.setMinutes(0);
      continue;
    }
    
    // Check minute
    if (!matchesCronField(minute, nextDate.getMinutes(), 0, 59)) {
      nextDate.setMinutes(nextDate.getMinutes() + 1);
      continue;
    }
    
    // All fields match!
    return nextDate.toISOString();
  }
  
  // Fallback: return base date + 1 hour if no match found
  baseDate.setHours(baseDate.getHours() + 1);
  return baseDate.toISOString();
}

/**
 * Check if a value matches a cron field pattern
 * Supports: *, numbers, ranges (1-5), lists (1,3,5), step values (asterisk/5, 1-10/2)
 */
function matchesCronField(field: string, value: number, min: number, max: number): boolean {
  // Wildcard matches everything
  if (field === "*") return true;
  
  // Single number
  const singleMatch = field.match(/^\d+$/);
  if (singleMatch) {
    return parseInt(field) === value;
  }
  
  // Range: 1-5
  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return value >= start && value <= end;
  }
  
  // Step value: */5 or 0-59/5
  const stepMatch = field.match(/^(\*|\d+-\d+)\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[2]);
    if (stepMatch[1] === "*") {
      // */5 means every 5th value
      return value % step === 0;
    } else {
      // 0-59/5 means every 5th value in range 0-59
      const rangePart = stepMatch[1];
      const rangeMatch2 = rangePart.match(/^(\d+)-(\d+)$/);
      if (rangeMatch2) {
        const start = parseInt(rangeMatch2[1]);
        const end = parseInt(rangeMatch2[2]);
        if (value >= start && value <= end) {
          return (value - start) % step === 0;
        }
      }
    }
  }
  
  // List: 1,3,5
  if (field.includes(",")) {
    const values = field.split(",").map(v => parseInt(v.trim()));
    return values.includes(value);
  }
  
  // No match
  return false;
}

app.whenReady().then(() => {
  // Initialize components
  settings = new Settings();
  database = new Database();
  clipboardWatcher = new ClipboardWatcher((clipContent) => {
    if (clipContent.type === "image" && clipContent.imageData) {
      database.addClip(
        clipContent.content,
        settings.get("maxClips", 100),
        "image",
        clipContent.imageData
      );
    } else {
      database.addClip(
        clipContent.content,
        settings.get("maxClips", 100),
        "text"
      );
    }
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

  // Verify shortcut is still registered every 30 seconds
  // This ensures it stays active even after system sleep or inactivity
  setInterval(verifyShortcut, 30000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    // Re-register shortcut when app is activated (e.g., after system sleep)
    verifyShortcut();
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