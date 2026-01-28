import type { ListItem, Script, Task } from "@/types";
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
  onSnooze?: (item: ListItem, minutes: number) => void;
  onTagClick?: (tag: string) => void;
  fontSize?: "small" | "medium" | "large";
  filter?: "all" | "clips" | "scripts" | "tasks";
}

const contentSizes = {
  small: "text-[11px]",
  medium: "text-xs", 
  large: "text-sm",
};

export function PreviewPane({ item, onCopy, onPin, onDelete, onEdit, onRemind, onComplete, onEditTask, onSnooze, onTagClick, fontSize = "small", filter = "all" }: PreviewPaneProps) {
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

  const handleOpenUrl = useCallback(async () => {
    if (!item) {
      console.warn("No item to open URL from");
      return;
    }
    
    let url = item.content.trim();
    console.log("Original content:", url);
    
    // Extract URL from content (might be a curl command or just a URL)
    let extractedUrl: string | null = null;
    
    // Check if it's a direct URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      extractedUrl = url;
    } else if (url.toLowerCase().startsWith("curl")) {
      // Extract URL from curl command
      // Match patterns like: curl "https://..." or curl https://... or curl -X GET "https://..."
      const patterns = [
        /curl\s+.*?["']?(https?:\/\/[^\s"']+)/i,
        /(https?:\/\/[^\s"']+)/i, // Fallback: any URL in the content
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          extractedUrl = match[1] || match[0];
          break;
        }
      }
    } else {
      // Try to find any URL in the content
      const urlMatch = url.match(/(https?:\/\/[^\s"']+)/i);
      if (urlMatch) {
        extractedUrl = urlMatch[1] || urlMatch[0];
      }
    }
    
    if (!extractedUrl) {
      console.warn("Could not extract URL from content:", url);
      return;
    }
    
    // Clean up URL (remove quotes, trailing characters)
    extractedUrl = extractedUrl.replace(/["']/g, "").trim();
    
    // Remove trailing characters that might be part of the command
    extractedUrl = extractedUrl.replace(/[;|&<>'"`\s]+$/, "");
    
    console.log("Extracted URL:", extractedUrl);
    
    // Open in default browser (not in-app browser)
    try {
      const result = await window.api.openExternalUrl(extractedUrl);
      console.log("Open URL result:", result);
      if (!result) {
        console.error("Failed to open URL - returned false");
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
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
  
  // Check if this is an image clip
  const clipData = isClip ? (item.data as any) : null;
  const isImageClip = clipData?.type === "image" && clipData?.imageData;
  
  const contentInfo = isImageClip 
    ? { type: "image" as const, label: "Image", color: "#8B5CF6", icon: "image" }
    : detectContentType(item.content);
  const stats = getContentStats(item.content);
  const displayContent = formattedContent || item.content;
  const canFormat = contentInfo.type === "json";
  
  // Show Open button for URLs or curl commands
  const content = item.content.trim();
  const hasUrl = /https?:\/\//i.test(content);
  const isCurl = content.toLowerCase().startsWith("curl");
  const canOpen = contentInfo.type === "url" || hasUrl || isCurl;
  
  // Debug logging
  if (canOpen) {
    console.log("Open button should be visible. Content:", content.substring(0, 50));
  }

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
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${contentInfo.color}15`, color: contentInfo.color }}
            >
              {contentInfo.label}
            </span>
            {isScript && (item.data as Script).tags && (item.data as Script).tags.trim() && (
              <>
                {(item.data as Script).tags.split(",").map((tag: string) => {
                  const trimmedTag = tag.trim();
                  if (!trimmedTag) return null;
                  
                  // Generate consistent color for tag
                  const colors = [
                    { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
                    { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
                    { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/30" },
                    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
                    { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
                    { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/30" },
                    { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30" },
                    { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/30" },
                  ];
                  let hash = 0;
                  for (let i = 0; i < trimmedTag.length; i++) {
                    hash = trimmedTag.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const color = colors[Math.abs(hash) % colors.length];
                  
                  return (
                    <button
                      key={trimmedTag}
                      onClick={() => onTagClick?.(trimmedTag)}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors hover:opacity-80 ${color.bg} ${color.text} ${color.border}`}
                      title={`Filter by ${trimmedTag}`}
                    >
                      #{trimmedTag}
                    </button>
                  );
                })}
              </>
            )}
            {!isScript && <span className="text-[10px] text-white/40">{item.subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Content Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.05]">
        {!isImageClip && (
          <>
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <span className="text-white/60 font-medium">{stats.chars}</span> chars
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <span className="text-white/60 font-medium">{stats.words}</span> words
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <span className="text-white/60 font-medium">{stats.lines}</span> lines
            </div>
          </>
        )}
        {isImageClip && (
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="text-white/60 font-medium">{clipData.content}</span>
          </div>
        )}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Open button clicked");
              handleOpenUrl();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            title={`Open ${item.content.trim().match(/(https?:\/\/[^\s"']+)/i)?.[0] || "URL"}`}
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isImageClip && clipData.imageData ? (
          <div className="flex items-center justify-center h-full">
            <img 
              src={clipData.imageData} 
              alt="Clipboard image"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ maxHeight: "400px" }}
            />
          </div>
        ) : (
          <pre 
            className={`${contentSize} whitespace-pre-wrap break-words font-mono leading-relaxed text-white/80`}
          >
            {displayContent}
          </pre>
        )}
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
