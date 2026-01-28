import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@/types";
import { ArrowLeft, Keyboard, Type, History, Command, Check } from "./Icons";

interface SettingsViewProps {
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
  onCancel: () => void;
}

const shortcutPresets = [
  { value: "CommandOrControl+Shift+V", display: "⌘⇧V" },
  { value: "CommandOrControl+Shift+C", display: "⌘⇧C" },
  { value: "CommandOrControl+Shift+Space", display: "⌘⇧␣" },
  { value: "Alt+Space", display: "⌥␣" },
];

const historyPresets = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
];

const fontSizeOptions = [
  { value: "small", label: "Compact", desc: "More items" },
  { value: "medium", label: "Default", desc: "Balanced" },
  { value: "large", label: "Large", desc: "Readable" },
];

function parseShortcutDisplay(shortcut: string): string {
  return shortcut
    .replace("CommandOrControl", "⌘")
    .replace("Shift", "⇧")
    .replace("Alt", "⌥")
    .replace("Space", "␣")
    .replace(/\+/g, " ");
}

function getKeySymbol(key: string): string {
  const symbols: Record<string, string> = {
    "COMMANDORCONTROL": "⌘",
    "SHIFT": "⇧",
    "ALT": "⌥",
    "CONTROL": "⌃",
    "SPACE": "␣",
    "ARROWUP": "↑",
    "ARROWDOWN": "↓",
    "ARROWLEFT": "←",
    "ARROWRIGHT": "→",
    "ENTER": "↵",
    "ESCAPE": "⎋",
    "TAB": "⇥",
    "BACKSPACE": "⌫",
  };
  return symbols[key.toUpperCase()] || key.toUpperCase();
}

export function SettingsView({ settings, onSave, onCancel }: SettingsViewProps) {
  const [shortcut, setShortcut] = useState(settings.shortcut);
  const [maxClips, setMaxClips] = useState(settings.maxClips);
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<Set<string>>(new Set());

  // Sync local state when settings prop changes
  useEffect(() => {
    setShortcut(settings.shortcut);
    setMaxClips(settings.maxClips);
    setFontSize(settings.fontSize);
    setHasChanges(false);
  }, [settings.shortcut, settings.maxClips, settings.fontSize]);

  const handleChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave({ shortcut, maxClips, fontSize });
    onCancel();
  };

  const startRecording = () => {
    setIsRecording(true);
    setCurrentKeys(new Set());
  };

  const stopRecording = () => {
    setIsRecording(false);
    setCurrentKeys(new Set());
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    const newKeys = new Set(currentKeys);
    
    if (e.metaKey || e.ctrlKey) newKeys.add("CommandOrControl");
    if (e.shiftKey) newKeys.add("Shift");
    if (e.altKey) newKeys.add("Alt");
    
    const key = e.key.toUpperCase();
    if (!["META", "CONTROL", "SHIFT", "ALT"].includes(key)) {
      newKeys.add(key === " " ? "Space" : key);
      
      // Complete the recording when we have modifier(s) + a regular key
      if (newKeys.size >= 2) {
        const parts: string[] = [];
        if (newKeys.has("CommandOrControl")) parts.push("CommandOrControl");
        if (newKeys.has("Alt")) parts.push("Alt");
        if (newKeys.has("Shift")) parts.push("Shift");
        
        // Add the non-modifier key
        newKeys.forEach(k => {
          if (!["CommandOrControl", "Alt", "Shift"].includes(k)) {
            parts.push(k);
          }
        });
        
        const newShortcut = parts.join("+");
        handleChange(setShortcut)(newShortcut);
        stopRecording();
        return;
      }
    }
    
    setCurrentKeys(newKeys);
  }, [isRecording, currentKeys]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;
    
    // If user releases all keys without completing, reset
    const newKeys = new Set<string>();
    if (e.metaKey || e.ctrlKey) newKeys.add("CommandOrControl");
    if (e.shiftKey) newKeys.add("Shift");
    if (e.altKey) newKeys.add("Alt");
    
    setCurrentKeys(newKeys);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [isRecording, handleKeyDown, handleKeyUp]);

  // Click outside to cancel recording
  useEffect(() => {
    if (!isRecording) return;
    const handleClick = () => stopRecording();
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
    };
  }, [isRecording]);

  const isPresetShortcut = shortcutPresets.some(p => p.value === shortcut);
  const displayKeys = Array.from(currentKeys).map(getKeySymbol);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <h1 className="text-sm font-medium text-white">Settings</h1>
            <p className="text-[10px] text-white/40">Customize your experience</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            hasChanges
              ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
              : "bg-white/[0.05] text-white/30 cursor-not-allowed"
          }`}
        >
          <Check className="w-3 h-3" />
          Save
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Global Shortcut */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Command className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Global Shortcut</h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                Open ScriptVault from anywhere
              </p>
              
              {/* Current shortcut display */}
              <div className="mt-3 mb-3 flex items-center gap-2">
                <span className="text-[10px] text-white/40">Current:</span>
                <div className="flex items-center gap-1">
                  {parseShortcutDisplay(shortcut).split(" ").map((key, i) => (
                    <kbd key={i} className="px-2 py-1 bg-white/[0.08] rounded-md text-xs text-white/80 font-medium">
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
              
              {/* Preset shortcuts */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {shortcutPresets.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      handleChange(setShortcut)(opt.value);
                      stopRecording();
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      shortcut === opt.value
                        ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                    }`}
                  >
                    {opt.display}
                  </button>
                ))}
              </div>

              {/* Custom shortcut recorder */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-[11px] font-medium transition-all border-2 border-dashed ${
                  isRecording
                    ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {isRecording ? (
                  displayKeys.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {displayKeys.map((key, i) => (
                        <kbd key={i} className="px-2 py-1 bg-purple-500/20 rounded-md text-xs text-purple-200 font-medium animate-pulse">
                          {key}
                        </kbd>
                      ))}
                      <span className="ml-2 text-white/40">+ key</span>
                    </div>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      Press your shortcut combination...
                    </>
                  )
                ) : (
                  <>
                    <Keyboard className="w-3.5 h-3.5" />
                    Record custom shortcut
                  </>
                )}
              </button>
              {isRecording && (
                <p className="text-[9px] text-white/30 mt-2 text-center">
                  Press modifier keys (⌘, ⌥, ⇧) + a letter or number. Click anywhere to cancel.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* History Limit */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <History className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">History Limit</h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                Maximum items to store
              </p>
              <div className="flex gap-1.5 mt-3">
                {historyPresets.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange(setMaxClips)(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                      maxClips === opt.value
                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Display Size */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Type className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Display Size</h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                Adjust text size
              </p>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {fontSizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange(setFontSize)(opt.value as Settings["fontSize"])}
                    className={`flex flex-col items-center py-2.5 rounded-lg text-center transition-all ${
                      fontSize === opt.value
                        ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                    }`}
                  >
                    <span className="text-[11px] font-medium">{opt.label}</span>
                    <span className="text-[9px] opacity-60 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Keyboard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-medium text-white">Shortcuts</h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                Quick actions
              </p>
              <div className="mt-3 space-y-1">
                {[
                  { keys: ["↑", "↓"], action: "Navigate" },
                  { keys: ["↵"], action: "Copy" },
                  { keys: ["⌘", "N"], action: "New script" },
                  { keys: ["⌘", ","], action: "Settings" },
                  { keys: ["Esc"], action: "Close" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-white/60">{item.action}</span>
                    <div className="flex items-center gap-0.5">
                      {item.keys.map((key, j) => (
                        <kbd key={j} className="min-w-[20px] px-1.5 py-0.5 bg-white/[0.08] rounded text-[9px] text-white/70 text-center font-medium">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[9px] text-white/30">
          <span>ScriptVault v0.1.0</span>
          <span>Made with ♥</span>
        </div>
      </div>
    </div>
  );
}
