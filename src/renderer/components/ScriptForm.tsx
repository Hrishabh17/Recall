import { useState, useEffect, useMemo } from "react";
import type { Script } from "@/types";
import { getExpiryOptions, calculateExpiryDate } from "@/lib/utils";
import { ArrowLeft, Check, FileText, Type, History } from "./Icons";
import { detectContentType, getContentStats } from "@/lib/contentDetection";
import { ContentTypeIcon } from "./ContentTypeIcon";
import { TagInput } from "./TagInput";

interface ScriptFormProps {
  script?: Script | null;
  initialContent?: string;
  availableTags?: string[];
  onSave: (script: Partial<Script>) => void;
  onCancel: () => void;
}

const scriptTypes = [
  { value: "text", label: "Text", color: "#9CA3AF" },
  { value: "sql", label: "SQL", color: "#3B82F6" },
  { value: "bash", label: "Bash", color: "#22C55E" },
  { value: "curl", label: "cURL", color: "#F59E0B" },
];

export function ScriptForm({ script, initialContent, availableTags = [], onSave, onCancel }: ScriptFormProps) {
  const [title, setTitle] = useState(script?.title ?? "");
  const [content, setContent] = useState(script?.content ?? initialContent ?? "");
  const [type, setType] = useState<Script["type"]>(script?.type ?? "text");
  
  // Convert comma-separated tags string to array
  const initialTags = useMemo(() => {
    if (script?.tags) {
      return script.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
    }
    return [];
  }, [script?.tags]);
  
  const [tags, setTags] = useState<string[]>(initialTags);
  const [expiry, setExpiry] = useState<string | null>(null);
  
  // Update tags when script changes
  useEffect(() => {
    if (script?.tags) {
      setTags(script.tags.split(",").map(t => t.trim()).filter(t => t.length > 0));
    } else {
      setTags([]);
    }
  }, [script?.tags]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, content, type, tags, expiry]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    onSave({
      id: script?.id,
      title: title.trim(),
      content: content.trim(),
      type,
      tags: tags.join(", "), // Convert array back to comma-separated string
      expiresAt: calculateExpiryDate(expiry),
    });
  };

  const isEditing = !!script;
  const contentInfo = detectContentType(content);
  const stats = getContentStats(content);
  const canSave = title.trim() && content.trim();

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-white">
              {isEditing ? "Edit Script" : "Save Script"}
            </h1>
            <p className="text-[10px] text-white/40 mt-0.5">
              {isEditing ? "Modify your saved script" : "Save this content for quick access"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            canSave
              ? "bg-vault-accent text-white hover:bg-vault-accent-hover"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          }`}
        >
          <Check className="w-3 h-3" />
          Save
          <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-[9px]">⌘↵</kbd>
        </button>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Form */}
        <div className="w-64 flex flex-col border-r border-white/5 overflow-y-auto">
          {/* Title Field */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Type className="w-3 h-3 text-blue-400" />
              </div>
              <label className="text-[10px] font-medium text-white/60">Title</label>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-vault-accent/50 focus:bg-white/[0.07] transition-all"
              autoFocus
            />
          </div>

          {/* Type Selection */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-purple-500/10">
                <FileText className="w-3 h-3 text-purple-400" />
              </div>
              <label className="text-[10px] font-medium text-white/60">Type</label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {scriptTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value as Script["type"])}
                  className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                    type === t.value
                      ? "text-white ring-1"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                  style={{
                    backgroundColor: type === t.value ? `${t.color}20` : undefined,
                    color: type === t.value ? t.color : undefined,
                    boxShadow: type === t.value ? `inset 0 0 0 1px ${t.color}40` : undefined,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <History className="w-3 h-3 text-amber-400" />
              </div>
              <label className="text-[10px] font-medium text-white/60">Expires</label>
            </div>
            <div className="flex flex-wrap gap-1">
              {getExpiryOptions().map((opt) => (
                <button
                  key={opt.value ?? "never"}
                  onClick={() => setExpiry(opt.value)}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                    expiry === opt.value
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="px-4 py-3">
            <label className="text-[10px] font-medium text-white/60 block mb-2">
              Tags <span className="text-white/30">(optional)</span>
            </label>
            <TagInput
              tags={tags}
              availableTags={availableTags}
              onChange={setTags}
              placeholder="work, database, api..."
            />
          </div>
        </div>

        {/* Right - Content Preview */}
        <div className="flex-1 flex flex-col bg-white/[0.02] overflow-hidden">
          {/* Content Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${contentInfo.color}15` }}
              >
                <ContentTypeIcon 
                  type={contentInfo.type} 
                  className="w-3 h-3"
                  style={{ color: contentInfo.color }}
                />
              </div>
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: `${contentInfo.color}15`, color: contentInfo.color }}
              >
                {contentInfo.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-white/40">
              <span><span className="text-white/60 font-medium">{stats.chars}</span> chars</span>
              <span><span className="text-white/60 font-medium">{stats.words}</span> words</span>
              <span><span className="text-white/60 font-medium">{stats.lines}</span> lines</span>
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1 p-3 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your content here..."
              className="w-full h-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/10 resize-none font-mono leading-relaxed"
              style={{ minHeight: "200px" }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3 text-[9px] text-white/30">
          <span><kbd className="px-1 py-0.5 bg-white/10 rounded mr-0.5">esc</kbd> cancel</span>
          <span><kbd className="px-1 py-0.5 bg-white/10 rounded mr-0.5">⌘↵</kbd> save</span>
        </div>
        <div className="text-[9px] text-white/30">
          {content.length > 0 ? "Auto-detected content type" : "Start typing to detect type"}
        </div>
      </div>
    </div>
  );
}
