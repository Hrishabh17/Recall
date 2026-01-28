import { useState, useCallback, useEffect } from "react";
import type { View, ListItem, Script, Task } from "@/types";
import { useItems } from "@/hooks/useItems";
import { useSettings } from "@/hooks/useSettings";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { PreviewPane } from "@/components/PreviewPane";
import { ScriptForm } from "@/components/ScriptForm";
import { ReminderForm } from "@/components/ReminderForm";
import { SettingsView } from "@/components/SettingsView";
import { Toast, useToast } from "@/components/Toast";
import { Plus, Sliders } from "@/components/Icons";

const fontSizeClasses = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

export default function App() {
  const {
    items,
    clips,
    scripts,
    tasks,
    loading,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    deleteItem,
    saveScript,
    addTask,
    updateTask,
    completeTask,
    clearClips,
  } = useItems();

  const { settings, updateSettings } = useSettings();
  const { toast, showToast, hideToast } = useToast();

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [clipToPin, setClipToPin] = useState<ListItem | null>(null);
  const [itemToRemind, setItemToRemind] = useState<ListItem | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);

  const fontClass = fontSizeClasses[settings.fontSize] || "text-xs";

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length, filter, searchQuery]);

  // Global escape key handler - always works
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        window.api.hideWindow();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Reset to All tab when window opens
  useEffect(() => {
    const unsubscribe = window.api.onWindowShown(async () => {
      setFilter("all");
      setView("list");
      setSelectedIndex(0);
      setSearchQuery("");
      
      // Load overdue count
      const count = await window.api.getOverdueCount();
      setOverdueCount(count);
    });

    return unsubscribe;
  }, [setFilter, setSearchQuery]);

  // Load overdue count on mount and periodically
  useEffect(() => {
    const loadOverdueCount = async () => {
      const count = await window.api.getOverdueCount();
      setOverdueCount(count);
    };
    
    // Load immediately
    loadOverdueCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadOverdueCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Track pending task navigation
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Listen for notification clicks to navigate to specific task
  useEffect(() => {
    const unsubscribe = window.api.onNavigateToTask((taskId: string) => {
      // Switch to tasks filter and list view
      setFilter("tasks");
      setView("list");
      setPendingTaskId(taskId);
    });

    return unsubscribe;
  }, [setFilter]);

  // Handle pending task navigation after filter change
  useEffect(() => {
    if (pendingTaskId && filter === "tasks") {
      const taskIndex = items.findIndex(
        (item) => item.type === "task" && item.id === pendingTaskId
      );
      if (taskIndex >= 0) {
        setSelectedIndex(taskIndex);
      }
      setPendingTaskId(null);
    }
  }, [pendingTaskId, filter, items]);

  // Keyboard navigation for list view
  useEffect(() => {
    if (view !== "list") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) {
            handleCopy(items[selectedIndex]);
          }
          break;
        case "n":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleNewScript();
          }
          break;
        case ",":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setView("settings");
          }
          break;
        case "k":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Focus is auto-handled by SearchBar
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, items, selectedIndex]);

  const selectedItem = items[selectedIndex] || null;

  const handleCopy = useCallback(async (item: ListItem) => {
    await window.api.copyToClipboard(item.content);
    showToast("copy", "Copied to clipboard");
  }, [showToast]);

  const handlePin = useCallback((item: ListItem) => {
    if (item.type === "clip") {
      setClipToPin(item);
      setView("script-form");
    }
  }, []);

  const handleEdit = useCallback((item: ListItem) => {
    if (item.type === "script") {
      setEditingScript(item.data as Script);
      setClipToPin(null);
      setView("script-form");
    }
  }, []);

  const handleRemind = useCallback((item: ListItem) => {
    setItemToRemind(item);
    setTaskToEdit(null);
    setView("remind-form");
  }, []);

  const handleEditTask = useCallback((item: ListItem) => {
    if (item.type === "task") {
      setTaskToEdit(item.data as Task);
      setItemToRemind(item);
      setView("remind-form");
    }
  }, []);

  const handleSaveReminder = useCallback(async (content: string, title: string, remindAt: string, recurringInterval?: string | null) => {
    await addTask(content, title, remindAt, recurringInterval);
    setView("list");
    setItemToRemind(null);
    setTaskToEdit(null);
    showToast("save", "Reminder set!");
    
    // Refresh overdue count
    const count = await window.api.getOverdueCount();
    setOverdueCount(count);
  }, [addTask, showToast]);

  const handleUpdateReminder = useCallback(async (id: string, title: string, remindAt: string, recurringInterval?: string | null) => {
    await updateTask(id, title, remindAt, recurringInterval);
    setView("list");
    setItemToRemind(null);
    setTaskToEdit(null);
    showToast("save", "Reminder updated!");
    
    // Refresh overdue count
    const count = await window.api.getOverdueCount();
    setOverdueCount(count);
  }, [updateTask, showToast]);

  const handleCancelReminder = useCallback(() => {
    setView("list");
    setItemToRemind(null);
    setTaskToEdit(null);
  }, []);

  const handleCompleteTask = useCallback(async (item: ListItem) => {
    await completeTask(item.id);
    showToast("save", "Task completed!");
    
    // Refresh overdue count
    const count = await window.api.getOverdueCount();
    setOverdueCount(count);
  }, [completeTask, showToast]);

  const handleDelete = useCallback((item: ListItem) => {
    deleteItem(item);
    showToast("delete", "Item deleted");
  }, [deleteItem, showToast]);

  const handleNewScript = useCallback(() => {
    setEditingScript(null);
    setClipToPin(null);
    setView("script-form");
  }, []);

  const handleSaveScript = useCallback(async (script: Partial<Script>) => {
    await saveScript(script);
    setView("list");
    setEditingScript(null);
    setClipToPin(null);
    showToast("save", "Script saved");
  }, [saveScript, showToast]);

  const handleCancelForm = useCallback(() => {
    setView("list");
    setEditingScript(null);
    setClipToPin(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearClips();
    showToast("delete", "History cleared");
  }, [clearClips, showToast]);

  const glassStyle = "glass";

  if (view === "remind-form" && itemToRemind) {
    return (
      <div className={`h-screen flex flex-col ${glassStyle} rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl ${fontClass}`}>
        <ReminderForm
          content={itemToRemind.content}
          task={taskToEdit}
          onSave={handleSaveReminder}
          onUpdate={handleUpdateReminder}
          onCancel={handleCancelReminder}
        />
      </div>
    );
  }

  if (view === "script-form") {
    return (
      <div className={`h-screen flex flex-col ${glassStyle} rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl ${fontClass}`}>
        <ScriptForm
          script={editingScript}
          initialContent={clipToPin?.content}
          onSave={handleSaveScript}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className={`h-screen flex flex-col ${glassStyle} rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl ${fontClass}`}>
        <SettingsView
          settings={settings}
          onSave={updateSettings}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${glassStyle} rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl animate-scale-in ${fontClass}`}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search clipboard & scripts..."
        resultCount={searchQuery ? items.length : undefined}
      />

      {/* Filter + Actions Bar */}
      <div className="flex items-center justify-between px-4 pb-2">
        <FilterBar
          filter={filter}
          onChange={setFilter}
          clipCount={clips.length}
          scriptCount={scripts.length}
          taskCount={tasks.length}
          overdueCount={overdueCount}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewScript}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="New Script (⌘N)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("settings")}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Settings (⌘,)"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content - Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - List */}
        <div className="w-72 flex flex-col border-r border-white/[0.04]">
          <ItemList
            items={items}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            loading={loading}
            fontSize={settings.fontSize}
          />
        </div>

        {/* Right Pane - Preview */}
        <PreviewPane
          item={selectedItem}
          onCopy={handleCopy}
          onPin={handlePin}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onRemind={handleRemind}
          onComplete={handleCompleteTask}
          onEditTask={handleEditTask}
          fontSize={settings.fontSize}
          filter={filter}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-4 text-[9px]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded text-white/50 font-medium">↑↓</kbd>
            <span className="text-white/40">navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded text-white/50 font-medium">↵</kbd>
            <span className="text-white/40">copy</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded text-white/50 font-medium">esc</kbd>
            <span className="text-white/40">close</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] text-white/40">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
          <button
            onClick={handleClearHistory}
            className="text-[9px] text-white/40 hover:text-red-400 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          visible={!!toast}
          onHide={hideToast}
        />
      )}
    </div>
  );
}
