import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Search } from "./Icons";
import type { ContentType } from "@/lib/contentDetection";

interface ContentTypeSelectorProps {
  selectedTypes: string[];
  onTypeSelect: (types: string[]) => void;
  openDropdown?: "tag" | "type" | null;
  onDropdownToggle?: (type: "tag" | "type" | null) => void;
}

/**
 * ContentTypeSelector Component
 * 
 * A dropdown selector for filtering by content types with:
 * - Search/filter content types
 * - Multiple selection support
 * - Clean UI matching TagSelector
 */
export function ContentTypeSelector({ selectedTypes, onTypeSelect, openDropdown, onDropdownToggle }: ContentTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with parent-controlled dropdown state
  useEffect(() => {
    if (openDropdown !== "type" && isOpen) {
      setIsOpen(false);
      setSearchQuery("");
    } else if (openDropdown === "type" && !isOpen) {
      setIsOpen(true);
    }
  }, [openDropdown, isOpen]);

  // All available content types
  const allContentTypes: { value: ContentType; label: string; color: string }[] = [
    { value: "sql", label: "SQL", color: "#60A5FA" },
    { value: "json", label: "JSON", color: "#34D399" },
    { value: "url", label: "URL", color: "#A78BFA" },
    { value: "bash", label: "Shell", color: "#F472B6" },
    { value: "code", label: "Code", color: "#FBBF24" },
    { value: "email", label: "Email", color: "#FB923C" },
    { value: "path", label: "Path", color: "#2DD4BF" },
    { value: "text", label: "Text", color: "#94A3B8" },
  ];

  // Filter types based on search query
  const filteredTypes = allContentTypes.filter(type =>
    type.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Track previous selectedTypes length to detect when cleared
  const prevSelectedTypesLengthRef = useRef(selectedTypes.length);

  // Close dropdown when selections are cleared (window closed/reset)
  useEffect(() => {
    const prevLength = prevSelectedTypesLengthRef.current;
    const currentLength = selectedTypes.length;
    
    // Only close if we had selections before and now we don't (cleared/reset)
    if (prevLength > 0 && currentLength === 0 && isOpen) {
      if (onDropdownToggle) {
        onDropdownToggle(null);
      } else {
        setIsOpen(false);
      }
      setSearchQuery("");
    }
    
    prevSelectedTypesLengthRef.current = currentLength;
  }, [selectedTypes.length, isOpen, onDropdownToggle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (onDropdownToggle) {
          onDropdownToggle(null);
        } else {
          setIsOpen(false);
        }
        setSearchQuery("");
      }
    };

    if (isOpen) {
      // Use a small delay to prevent immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      // Focus search input when opened
      setTimeout(() => inputRef.current?.focus(), 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onDropdownToggle]);

  const handleTypeSelect = (type: string) => {
    const isSelected = selectedTypes.includes(type);
    if (isSelected) {
      // Remove type from selection
      onTypeSelect(selectedTypes.filter(t => t !== type));
    } else {
      // Add type to selection
      onTypeSelect([...selectedTypes, type]);
    }
    // Keep dropdown open for multiple selections
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onDropdownToggle) {
            onDropdownToggle(isOpen ? null : "type");
          } else {
            setIsOpen(!isOpen);
          }
        }}
        onMouseDown={(e) => {
          // Prevent event from bubbling to parent handlers
          e.stopPropagation();
        }}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium
          transition-all duration-200 border cursor-pointer min-w-[130px] max-w-[180px] flex-shrink-0
          ${
            selectedTypes.length > 0
              ? "bg-green-500/20 text-green-300 border-green-500/40 shadow-lg shadow-green-500/10"
              : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 border-white/[0.08] hover:border-white/[0.12]"
          }
        `}
      >
        <Search className="w-3 h-3 flex-shrink-0" />
        <span className="truncate flex-1 min-w-0">
          {selectedTypes.length === 0 
            ? "Filter by type" 
            : selectedTypes.length === 1 
            ? allContentTypes.find(t => t.value === selectedTypes[0])?.label || selectedTypes[0]
            : `${selectedTypes.length} types`}
        </span>
        {selectedTypes.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTypeSelect([]);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="hover:bg-white/10 rounded p-0.5 transition-colors flex-shrink-0"
            aria-label="Clear type filters"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ml-auto ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 top-full left-0 mt-1 min-w-[140px] max-w-[200px] bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-lg shadow-xl overflow-hidden"
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onKeyUp={(e) => {
                  e.stopPropagation();
                }}
                onKeyPress={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                }}
                placeholder="Search types..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          {/* Type List */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredTypes.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-white/40">
                {searchQuery ? "No types found" : "No types available"}
              </div>
            ) : (
              filteredTypes.map((type) => {
                const isSelected = selectedTypes.includes(type.value);
                return (
                  <div
                    key={type.value}
                    className={`
                      flex items-center justify-between px-3 py-2 hover:bg-white/10 transition-colors cursor-pointer
                      ${isSelected ? "bg-green-500/10" : ""}
                    `}
                    onClick={() => handleTypeSelect(type.value)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Checkbox indicator */}
                      <div className={`
                        w-3 h-3 rounded border-2 flex items-center justify-center transition-all
                        ${isSelected 
                          ? "bg-green-500/20 border-green-500/60" 
                          : "border-white/20"
                        }
                      `}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        )}
                      </div>
                      {/* Type label with color indicator */}
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-[10px] font-medium text-white/80">
                          {type.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
