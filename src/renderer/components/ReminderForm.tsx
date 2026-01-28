import { useState, useRef } from "react";
import { ArrowLeft, Bell, Clock, Check } from "./Icons";
import { calculateRemindDate, truncate } from "@/lib/utils";
import type { Task } from "@/types";

interface ReminderFormProps {
  content: string;
  task?: Task | null;  // If provided, we're editing
  onSave: (content: string, title: string, remindAt: string, recurringInterval?: string | null) => void;
  onUpdate?: (id: string, title: string, remindAt: string, recurringInterval?: string | null) => void;
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
  { value: "5m", label: "Every 5 min" },
  { value: "15m", label: "Every 15 min" },
  { value: "30m", label: "Every 30 min" },
  { value: "1h", label: "Every hour" },
  { value: "2h", label: "Every 2 hours" },
  { value: "4h", label: "Every 4 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Every day" },
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
    
    const recurring = isRecurring ? recurringInterval : null;
    
    if (isEditing && onUpdate && task) {
      onUpdate(task.id, title.trim(), remindAt, recurring);
    } else {
      onSave(content, title.trim(), remindAt, recurring);
    }
  };

  const canSave = title.trim() && (
    (selectedTime && selectedTime !== "custom") || 
    (selectedTime === "custom" && customDate && customTime)
  );

  // Get min date/time for custom picker
  const now = new Date();
  const minDate = now.toISOString().split("T")[0];

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
              {isEditing ? "Update reminder time" : "Get notified when it's due"}
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
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Title */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <Bell className="w-3 h-3 text-amber-400" />
            </div>
            <label className="text-[10px] font-medium text-white/60">Reminder Title</label>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should we remind you about?"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/15"
            autoFocus
          />
        </div>

        {/* Content Preview */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <label className="text-[10px] font-medium text-white/60 block mb-2">Content</label>
          <div className="bg-white/[0.03] rounded-lg p-3 max-h-24 overflow-auto">
            <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap break-words">
              {content.length > 300 ? content.slice(0, 300) + "..." : content}
            </pre>
          </div>
        </div>

        {/* Time Selection */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Clock className="w-3 h-3 text-blue-400" />
            </div>
            <label className="text-[10px] font-medium text-white/60">
              {isEditing ? "New reminder time" : "Remind me in"}
            </label>
          </div>
          
          {/* Preset times */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {presetTimes.map((time) => (
              <button
                key={time.value}
                onClick={() => setSelectedTime(time.value)}
                className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                  selectedTime === time.value
                    ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                    : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08]"
                }`}
              >
                {time.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedTime("custom")}
              className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                selectedTime === "custom"
                  ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
                  : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08]"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom date/time picker */}
          {selectedTime === "custom" && (
            <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <div
                className="flex-1 relative cursor-pointer"
                onClick={() => {
                  // Restore window level first (in case time picker was open), then lower and open date picker
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
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/15 cursor-pointer hover:bg-white/[0.08] hover:border-white/12 transition-colors"
                />
              </div>
              <div
                className="flex-1 relative cursor-pointer"
                onClick={() => {
                  // Restore window level first (in case date picker was open), then lower and open time picker
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
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/15 cursor-pointer hover:bg-white/[0.08] hover:border-white/12 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Recurring Reminder */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <Bell className="w-3 h-3 text-green-400" />
              </div>
              <label className="text-[10px] font-medium text-white/60">
                Recurring Reminder
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRecurring(!isRecurring);
                if (isRecurring) {
                  setRecurringInterval(null);
                } else if (!recurringInterval) {
                  setRecurringInterval("1h");
                }
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isRecurring ? "bg-green-500/30" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isRecurring ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          
          {isRecurring && (
            <div className="grid grid-cols-4 gap-1.5">
              {recurringIntervals.map((interval) => (
                <button
                  key={interval.value}
                  type="button"
                  onClick={() => setRecurringInterval(interval.value)}
                  className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                    recurringInterval === interval.value
                      ? "bg-green-500/20 text-green-300 ring-1 ring-green-500/30"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08]"
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          )}
          
          {isRecurring && (
            <p className="text-[9px] text-white/40 mt-2">
              Reminder will repeat every {recurringIntervals.find(i => i.value === recurringInterval)?.label.toLowerCase()} until task is marked as completed
            </p>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-[9px] text-white/30 text-center">
          You'll receive a system notification when the reminder is due
        </p>
      </div>
    </div>
  );
}
