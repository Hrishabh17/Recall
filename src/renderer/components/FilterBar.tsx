interface FilterBarProps {
  filter: "all" | "clips" | "scripts" | "tasks";
  onChange: (filter: "all" | "clips" | "scripts" | "tasks") => void;
  clipCount: number;
  scriptCount: number;
  taskCount: number;
  overdueCount: number;
}

export function FilterBar({ filter, onChange, clipCount, scriptCount, taskCount, overdueCount }: FilterBarProps) {
  const filters = [
    { key: "all" as const, label: "All", count: clipCount + scriptCount, hasOverdue: false },
    { key: "clips" as const, label: "History", count: clipCount, hasOverdue: false },
    { key: "scripts" as const, label: "Saved", count: scriptCount, hasOverdue: false },
    { key: "tasks" as const, label: "Tasks", count: taskCount, hasOverdue: true },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1 bg-white/[0.04] rounded-lg">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`relative px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
            filter === f.key
              ? "text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          {filter === f.key && (
            <div className="absolute inset-0 bg-white/[0.1] rounded-md" />
          )}
          <span className="relative flex items-center gap-1.5">
            {f.label}
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
              filter === f.key 
                ? "bg-white/15 text-white/80" 
                : "bg-white/[0.06] text-white/40"
            }`}>
              {f.count}
            </span>
            {f.hasOverdue && overdueCount > 0 && (
              <span className="relative flex items-center justify-center w-2 h-2">
                <span className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></span>
                <span className="relative w-2 h-2 bg-red-500 rounded-full"></span>
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
