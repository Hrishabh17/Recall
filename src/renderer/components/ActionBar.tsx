import { Plus, Settings, Trash2 } from "./Icons";

interface ActionBarProps {
  onNewScript: () => void;
  onSettings: () => void;
  onClearClips: () => void;
}

export function ActionBar({ onNewScript, onSettings, onClearClips }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-vault-border bg-vault-surface/30">
      <div className="flex items-center gap-2">
        <button
          onClick={onNewScript}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-vault-muted hover:text-white bg-vault-surface hover:bg-vault-surface-hover rounded-lg transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Script
        </button>
        <button
          onClick={onClearClips}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-vault-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-xs text-vault-muted">
          <kbd className="px-1.5 py-0.5 bg-vault-surface rounded text-[10px]">↑↓</kbd>
          <span className="mx-1.5">navigate</span>
          <kbd className="px-1.5 py-0.5 bg-vault-surface rounded text-[10px]">↵</kbd>
          <span className="mx-1.5">copy</span>
          <kbd className="px-1.5 py-0.5 bg-vault-surface rounded text-[10px]">esc</kbd>
          <span className="ml-1.5">close</span>
        </div>
        <button
          onClick={onSettings}
          className="p-2 text-vault-muted hover:text-white hover:bg-vault-hover rounded-lg transition-all duration-150"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
