/**
 * Search Filter Types
 * 
 * - scriptType: Filter by script type (sql, bash, curl, text)
 */
export interface SearchFilters {
  contentType: null;
  tag: null;
  scriptType: "sql" | "bash" | "curl" | "text" | null;
  dateRange: null;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  availableTags: string[];
}

/**
 * SearchFilters Component
 * 
 * Filter buttons for all script types
 * Highlights selected filter in green
 */
export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const updateFilter = (value: "sql" | "bash" | "curl" | "text" | null) => {
    const newScriptType = filters.scriptType === value ? null : value;
    const newFilters = {
      contentType: null,
      tag: null,
      scriptType: newScriptType,
      dateRange: null,
    };
    onChange(newFilters);
  };

  // Script types for filtering
  const scriptTypes: { value: "sql" | "bash" | "curl" | "text"; label: string }[] = [
    { value: "sql", label: "SQL" },
    { value: "bash", label: "Bash" },
    { value: "curl", label: "cURL" },
    { value: "text", label: "Text" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {scriptTypes.map((type) => {
        const isActive = filters.scriptType === type.value;
        return (
          <button
            key={type.value}
            onClick={() => updateFilter(type.value)}
            className={`
              px-2.5 py-1 rounded-lg text-[10px] font-medium
              transition-all duration-200
              ${
                isActive
                  ? "bg-green-500/20 text-green-300 border border-green-500/40 shadow-lg shadow-green-500/10"
                  : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 border border-white/[0.08] hover:border-white/[0.12]"
              }
            `}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
