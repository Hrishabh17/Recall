import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Bell, Clock, Check } from "./Icons";
import { calculateRemindDate, truncate } from "@/lib/utils";
import type { Task } from "@/types";

interface ReminderFormProps {
  content: string;
  task?: Task | null;  // If provided, we're editing
  onSave: (
    content: string, 
    title: string, 
    remindAt: string, 
    recurringInterval?: string | null,
    priority?: "low" | "medium" | "high" | "urgent",
    category?: string
  ) => void;
  onUpdate?: (
    id: string, 
    title: string, 
    remindAt: string, 
    recurringInterval?: string | null,
    priority?: "low" | "medium" | "high" | "urgent",
    category?: string
  ) => void;
  onCancel: () => void;
}

const presetTimes = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "12h", label: "12 hours" },
  { value: "24h", label: "24 hours" },
];

const recurringIntervals = [
  { value: "5m", label: "Every 5 min", type: "simple" },
  { value: "15m", label: "Every 15 min", type: "simple" },
  { value: "30m", label: "Every 30 min", type: "simple" },
  { value: "1h", label: "Every hour", type: "simple" },
  { value: "2h", label: "Every 2 hours", type: "simple" },
  { value: "4h", label: "Every 4 hours", type: "simple" },
  { value: "12h", label: "Every 12 hours", type: "simple" },
  { value: "24h", label: "Every day", type: "simple" },
  { value: "weekly:mon", label: "Every Monday", type: "weekly" },
  { value: "weekly:tue", label: "Every Tuesday", type: "weekly" },
  { value: "weekly:wed", label: "Every Wednesday", type: "weekly" },
  { value: "weekly:thu", label: "Every Thursday", type: "weekly" },
  { value: "weekly:fri", label: "Every Friday", type: "weekly" },
  { value: "weekly:sat", label: "Every Saturday", type: "weekly" },
  { value: "weekly:sun", label: "Every Sunday", type: "weekly" },
  { value: "monthly:1", label: "Monthly (1st)", type: "monthly" },
  { value: "monthly:15", label: "Monthly (15th)", type: "monthly" },
  { value: "monthly:last", label: "Monthly (last day)", type: "monthly" },
];


export function ReminderForm({ content, task, onSave, onUpdate, onCancel }: ReminderFormProps) {
  const isEditing = !!task;
  
  const [title, setTitle] = useState(
    task?.title || truncate(content.split("\n")[0], 50)
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    task ? "custom" : null
  );
  const [customDate, setCustomDate] = useState(() => {
    if (task) {
      return new Date(task.remindAt).toISOString().split("T")[0];
    }
    return "";
  });
  const [customTime, setCustomTime] = useState(() => {
    if (task) {
      return new Date(task.remindAt).toTimeString().slice(0, 5);
    }
    return "";
  });
  const [isRecurring, setIsRecurring] = useState(() => {
    return task ? !!task.recurringInterval : false;
  });
  const [recurringInterval, setRecurringInterval] = useState<string | null>(() => {
    return task?.recurringInterval || null;
  });
  const [recurringType, setRecurringType] = useState<"simple" | "weekly" | "monthly" | "cron">("simple");
  const [cronExpression, setCronExpression] = useState(() => {
    // Check if task has a cron expression
    if (task?.recurringInterval && task.recurringInterval.startsWith("cron:")) {
      return task.recurringInterval.substring(5);
    }
    return "";
  });

  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!title.trim()) return;
    
    let remindAt: string;
    if (selectedTime === "custom") {
      if (!customDate || !customTime) return;
      remindAt = new Date(`${customDate}T${customTime}`).toISOString();
    } else if (selectedTime) {
      remindAt = calculateRemindDate(selectedTime);
    } else {
      return;
    }
    
    let recurring: string | null = null;
    if (isRecurring) {
      if (recurringType === "cron" && cronExpression.trim()) {
        recurring = `cron:${cronExpression.trim()}`;
      } else {
        recurring = recurringInterval;
      }
    }
    
    if (isEditing && onUpdate && task) {
      onUpdate(task.id, title.trim(), remindAt, recurring, "medium", "");
    } else {
      onSave(content, title.trim(), remindAt, recurring, "medium", "");
    }
  };

  const canSave = title.trim() && (
    (selectedTime && selectedTime !== "custom") || 
    (selectedTime === "custom" && customDate && customTime)
  ) && (
    !isRecurring || 
    (recurringType !== "cron" && recurringInterval) ||
    (recurringType === "cron" && cronExpression.trim())
  );

  // Get min date/time for custom picker
  const now = new Date();
  const minDate = now.toISOString().split("T")[0];

  const filteredRecurringIntervals = recurringIntervals.filter(i => {
    if (recurringType === "simple") return i.type === "simple";
    if (recurringType === "weekly") return i.type === "weekly";
    if (recurringType === "monthly") return i.type === "monthly";
    if (recurringType === "cron") return false; // Don't show preset intervals for cron
    return true;
  });

  // Initialize recurring interval from task if it's a cron expression
  useEffect(() => {
    if (task?.recurringInterval) {
      if (task.recurringInterval.startsWith("cron:")) {
        setRecurringType("cron");
        setCronExpression(task.recurringInterval.substring(5));
        setRecurringInterval(task.recurringInterval);
      } else {
        setRecurringType("simple");
        // Check if it's weekly or monthly
        if (task.recurringInterval.startsWith("weekly:")) {
          setRecurringType("weekly");
        } else if (task.recurringInterval.startsWith("monthly:")) {
          setRecurringType("monthly");
        }
        setRecurringInterval(task.recurringInterval);
      }
    }
  }, [task]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
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
            <h1 className="text-sm font-medium text-white">
              {isEditing ? "Edit Reminder" : "Set Reminder"}
            </h1>
            <p className="text-[10px] text-white/40">
              {isEditing ? "Update reminder settings" : "Get notified when it's due"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            canSave
              ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              : "bg-white/[0.05] text-white/30 cursor-not-allowed"
          }`}
        >
          <Check className="w-3 h-3" />
          {isEditing ? "Update" : "Set Reminder"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Title */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <label className="text-[11px] font-semibold text-white/80 tracking-wide">Reminder Title</label>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should we remind you about?"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20 transition-all"
            autoFocus
          />
        </div>

        {/* Content Preview */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] backdrop-blur-sm">
          <label className="text-[11px] font-semibold text-white/80 tracking-wide block mb-3">Content Preview</label>
          <div className="bg-white/[0.04] rounded-xl p-4 max-h-28 overflow-auto border border-white/[0.06]">
            <pre className="text-[11px] text-white/70 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {content.length > 300 ? content.slice(0, 300) + "..." : content}
            </pre>
          </div>
        </div>

        {/* Time Selection */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <label className="text-[11px] font-semibold text-white/80 tracking-wide">
              {isEditing ? "New reminder time" : "Remind me in"}
            </label>
          </div>
          
          {/* Preset times */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {presetTimes.map((time) => (
              <button
                key={time.value}
                onClick={() => setSelectedTime(time.value)}
                className={`py-2.5 rounded-xl text-[11px] font-semibold transition-all border-2 ${
                  selectedTime === time.value
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                    : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                }`}
              >
                {time.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedTime("custom")}
              className={`py-2.5 rounded-xl text-[11px] font-semibold transition-all border-2 ${
                selectedTime === "custom"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40 ring-2 ring-purple-500/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                  : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom date/time picker */}
          {selectedTime === "custom" && (
            <div className="flex gap-3 pt-3 border-t border-white/[0.08]">
              <div
                className="flex-1 relative cursor-pointer"
                onClick={() => {
                  window.api.restoreWindowLevel();
                  setTimeout(() => {
                    window.api.lowerWindowLevel();
                    setTimeout(() => {
                      dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
                    }, 50);
                  }, 50);
                }}
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  onFocus={() => window.api.lowerWindowLevel()}
                  onBlur={() => setTimeout(() => window.api.restoreWindowLevel(), 200)}
                  min={minDate}
                  className="w-full bg-white/[0.06] border-2 border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-500/20 cursor-pointer hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                />
              </div>
              <div
                className="flex-1 relative cursor-pointer"
                onClick={() => {
                  window.api.restoreWindowLevel();
                  setTimeout(() => {
                    window.api.lowerWindowLevel();
                    setTimeout(() => {
                      timeInputRef.current?.showPicker?.() || timeInputRef.current?.click();
                    }, 50);
                  }, 50);
                }}
              >
                <input
                  ref={timeInputRef}
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  onFocus={() => window.api.lowerWindowLevel()}
                  onBlur={() => setTimeout(() => window.api.restoreWindowLevel(), 200)}
                  className="w-full bg-white/[0.06] border-2 border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-500/20 cursor-pointer hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Recurring Reminder */}
        <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <Bell className="w-4 h-4 text-green-400" />
              </div>
              <label className="text-[11px] font-semibold text-white/80 tracking-wide">
                Recurring Reminder
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRecurring(!isRecurring);
                if (isRecurring) {
                  setRecurringInterval(null);
                  setCronExpression("");
                } else if (!recurringInterval) {
                  setRecurringInterval("1h");
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                isRecurring ? "bg-green-500/40 shadow-lg shadow-green-500/20" : "bg-white/[0.15]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                  isRecurring ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          
          {isRecurring && (
            <>
              {/* Recurring Type Selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button
                  onClick={() => {
                    setRecurringType("simple");
                    setCronExpression("");
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    recurringType === "simple"
                      ? "bg-white/[0.12] text-white border-white/[0.2] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => {
                    setRecurringType("weekly");
                    setCronExpression("");
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    recurringType === "weekly"
                      ? "bg-white/[0.12] text-white border-white/[0.2] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => {
                    setRecurringType("monthly");
                    setCronExpression("");
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    recurringType === "monthly"
                      ? "bg-white/[0.12] text-white border-white/[0.2] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => {
                    setRecurringType("cron");
                    if (!cronExpression) {
                      setCronExpression("0 9 * * *"); // Default: Every day at 9 AM
                    }
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    recurringType === "cron"
                      ? "bg-white/[0.12] text-white border-white/[0.2] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                  }`}
                >
                  Cron
                </button>
              </div>

              {/* Recurring Interval Options */}
              {recurringType !== "cron" && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {filteredRecurringIntervals.map((interval) => (
                    <button
                      key={interval.value}
                      type="button"
                      onClick={() => setRecurringInterval(interval.value)}
                      className={`py-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                        recurringInterval === interval.value
                          ? "bg-green-500/20 text-green-300 border-green-500/40 ring-2 ring-green-500/20 ring-offset-2 ring-offset-transparent scale-[1.02]"
                          : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.12] hover:scale-[1.01]"
                      }`}
                    >
                      {interval.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Cron Expression Input */}
              {recurringType === "cron" && (
                <div className="mb-3">
                  <label className="text-[11px] font-semibold text-white/80 tracking-wide block mb-3">
                    Cron Expression (minute hour day month dayOfWeek)
                  </label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => {
                      setCronExpression(e.target.value);
                      if (e.target.value.trim()) {
                        setRecurringInterval(`cron:${e.target.value.trim()}`);
                      } else {
                        setRecurringInterval(null);
                      }
                    }}
                    placeholder="0 9 * * *"
                    className="w-full bg-white/[0.06] border-2 border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/40 focus:bg-white/[0.08] focus:ring-2 focus:ring-green-500/20 font-mono transition-all"
                  />
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-medium text-white/60">
                      Examples:
                    </p>
                    <div className="text-[10px] text-white/50 space-y-1.5 font-mono">
                      <div className="flex items-center gap-2">
                        <code className="bg-white/[0.08] border border-white/[0.12] px-2 py-1 rounded-lg">0 9 * * *</code>
                        <span className="text-white/40">Every day at 9 AM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="bg-white/[0.08] border border-white/[0.12] px-2 py-1 rounded-lg">*/15 * * * *</code>
                        <span className="text-white/40">Every 15 minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="bg-white/[0.08] border border-white/[0.12] px-2 py-1 rounded-lg">0 0 * * 1</code>
                        <span className="text-white/40">Every Monday at midnight</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="bg-white/[0.08] border border-white/[0.12] px-2 py-1 rounded-lg">0 12 1 * *</code>
                        <span className="text-white/40">1st of month at noon</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isRecurring && recurringInterval && recurringType !== "cron" && (
                <p className="text-[10px] text-white/50 mt-3 px-3 py-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  Reminder will repeat <span className="font-semibold text-white/70">{recurringIntervals.find(i => i.value === recurringInterval)?.label.toLowerCase()}</span> until task is marked as completed
                </p>
              )}
              {isRecurring && recurringType === "cron" && cronExpression && (
                <p className="text-[10px] text-white/50 mt-3 px-3 py-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  Reminder will repeat according to <span className="font-mono font-semibold text-white/70">{cronExpression}</span> until task is marked as completed
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-4 border-t border-white/[0.08] bg-gradient-to-r from-white/[0.02] to-transparent">
        <p className="text-[10px] text-white/40 text-center font-medium">
          You'll receive a system notification when the reminder is due
        </p>
      </div>
    </div>
  );
}
