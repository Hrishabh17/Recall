import type { ListItem } from "@/types";
import { detectContentType, getContentStats, formatJson } from "@/lib/contentDetection";
import { ContentTypeIcon } from "./ContentTypeIcon";
import { Copy, Check, Save, Trash2, ExternalLink, Wand, Edit, Bell, CheckCircle } from "./Icons";
import { useState, useCallback } from "react";

interface PreviewPaneProps {
  item: ListItem | null;
  onCopy: (item: ListItem) => void;
  onPin?: (item: ListItem) => void;
  onDelete?: (item: ListItem) => void;
  onEdit?: (item: ListItem) => void;
  onRemind?: (item: ListItem) => void;
  onComplete?: (item: ListItem) => void;
  onEditTask?: (item: ListItem) => void;
  fontSize?: "small" | "medium" | "large";
  filter?: "all" | "clips" | "scripts" | "tasks";
}

const contentSizes = {
  small: "text-[11px]",
  medium: "text-xs", 
  large: "text-sm",
};

export function PreviewPane({ item, onCopy, onPin, onDelete, onEdit, onRemind, onComplete, onEditTask, fontSize = "small", filter = "all" }: PreviewPaneProps) {
  const contentSize = contentSizes[fontSize];
  const [copied, setCopied] = useState(false);
  const [formattedContent, setFormattedContent] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    if (!item) return;
    onCopy(item);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [item, onCopy]);

  const handleFormat = useCallback(() => {
    if (!item) return;
    if (formattedContent) {
      setFormattedContent(null);
    } else {
      setFormattedContent(formatJson(item.content));
    }
  }, [item, formattedContent]);

  const handleOpenUrl = useCallback(() => {
    if (!item) return;
    const url = item.content.trim();
    if (url.startsWith("http")) {
      window.open(url, "_blank");
    }
  }, [item]);

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white/[0.02] rounded-xl m-2 ml-0 border border-white/[0.05]">
        <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <p className="text-xs font-medium text-white/40">Select an item</p>
        <p className="text-[10px] text-white/25 mt-1">Preview appears here</p>
      </div>
    );
  }

  const isClip = item.type === "clip";
  const isScript = item.type === "script";
  const isTask = item.type === "task";
  const contentInfo = detectContentType(item.content);
  const stats = getContentStats(item.content);
  const displayContent = formattedContent || item.content;
  const canFormat = contentInfo.type === "json";
  const canOpen = contentInfo.type === "url";

  return (
    <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl m-2 ml-0 overflow-hidden border border-white/[0.05]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${contentInfo.color}15` }}
        >
          <ContentTypeIcon 
            type={contentInfo.type} 
            className="w-4 h-4"
            style={{ color: contentInfo.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">
            {isClip ? "Clipboard Item" : (item.data as any).title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${contentInfo.color}15`, color: contentInfo.color }}
            >
              {contentInfo.label}
            </span>
            <span className="text-[10px] text-white/40">{item.subtitle}</span>
          </div>
        </div>
      </div>

      {/* Content Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <span className="text-white/60 font-medium">{stats.chars}</span> chars
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <span className="text-white/60 font-medium">{stats.words}</span> words
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <span className="text-white/60 font-medium">{stats.lines}</span> lines
        </div>
        <div className="flex-1" />
        
        {canFormat && (
          <button
            onClick={handleFormat}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              formattedContent 
                ? "bg-purple-500/15 text-purple-300" 
                : "text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
            }`}
          >
            <Wand className="w-3 h-3" />
            {formattedContent ? "Raw" : "Format"}
          </button>
        )}
        {canOpen && (
          <button
            onClick={handleOpenUrl}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre 
          className={`${contentSize} whitespace-pre-wrap break-words font-mono leading-relaxed text-white/80`}
        >
          {displayContent}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.05]">
        {/* Copy button - always show for clips and scripts */}
        {!isTask && (
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-xs transition-all ${
              copied
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/[0.08] hover:bg-white/[0.12] text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
                <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded text-[9px]">↵</kbd>
              </>
            )}
          </button>
        )}
        
        {/* Complete button for tasks */}
        {isTask && onComplete && (
          <button
            onClick={() => onComplete(item)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Complete
          </button>
        )}

        {/* Edit button for tasks */}
        {isTask && onEditTask && (
          <button
            onClick={() => onEditTask(item)}
            className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-amber-500/15 text-white/50 hover:text-amber-400 transition-colors"
            title="Edit reminder"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}

        {/* Save button for clips */}
        {isClip && onPin && (
          <button
            onClick={() => onPin(item)}
            className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white/80 transition-colors"
            title="Save permanently"
          >
            <Save className="w-4 h-4" />
          </button>
        )}

        {/* Remind button for clips */}
        {isClip && onRemind && (
          <button
            onClick={() => onRemind(item)}
            className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-amber-500/15 text-white/50 hover:text-amber-400 transition-colors"
            title="Set reminder"
          >
            <Bell className="w-4 h-4" />
          </button>
        )}
        
        {/* Edit button for scripts */}
        {isScript && onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-blue-500/15 text-white/50 hover:text-blue-400 transition-colors"
            title="Edit script"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}

        {/* Copy button for tasks (secondary) */}
        {isTask && (
          <button
            onClick={handleCopy}
            className={`p-2.5 rounded-lg transition-colors ${
              copied
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white/80"
            }`}
            title="Copy content"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
        
        {/* Delete button - show for clips, scripts in Saved tab, and tasks */}
        {onDelete && (isClip || filter === "scripts" || isTask) && (
          <button
            onClick={() => onDelete(item)}
            className="p-2.5 rounded-lg bg-white/[0.05] hover:bg-red-500/15 text-white/50 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
