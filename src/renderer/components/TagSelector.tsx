import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Search } from "./Icons";

interface TagSelectorProps {
  selectedTags: string[];
  availableTags: string[];
  onTagSelect: (tags: string[]) => void;
  onTagDelete?: (tag: string) => void;
  openDropdown?: "tag" | "type" | null;
  onDropdownToggle?: (type: "tag" | "type" | null) => void;
}

/**
 * TagSelector Component
 * 
 * A dropdown selector for filtering by tags with:
 * - Search/filter tags
 * - Multiple selection support
 * - Tag management (delete)
 * - Clean UI
 */
export function TagSelector({ selectedTags, availableTags, onTagSelect, onTagDelete, openDropdown, onDropdownToggle }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with parent-controlled dropdown state
  useEffect(() => {
    if (openDropdown !== "tag" && isOpen) {
      setIsOpen(false);
      setSearchQuery("");
    } else if (openDropdown === "tag" && !isOpen) {
      setIsOpen(true);
    }
  }, [openDropdown, isOpen]);

  // Filter tags based on search query
  const filteredTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Track previous selectedTags length to detect when cleared
  const prevSelectedTagsLengthRef = useRef(selectedTags.length);

  // Close dropdown when selections are cleared (window closed/reset)
  useEffect(() => {
    const prevLength = prevSelectedTagsLengthRef.current;
    const currentLength = selectedTags.length;
    
    // Only close if we had selections before and now we don't (cleared/reset)
    if (prevLength > 0 && currentLength === 0 && isOpen) {
      if (onDropdownToggle) {
        onDropdownToggle(null);
      } else {
        setIsOpen(false);
      }
      setSearchQuery("");
    }
    
    prevSelectedTagsLengthRef.current = currentLength;
  }, [selectedTags.length, isOpen, onDropdownToggle]);

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
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when opened
      setTimeout(() => inputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onDropdownToggle]);

  // Generate color for tag based on hash (consistent colors)
  const getTagColor = (tag: string): string => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const handleTagSelect = (tag: string) => {
    const isSelected = selectedTags.includes(tag);
    if (isSelected) {
      // Remove tag from selection
      onTagSelect(selectedTags.filter(t => t !== tag));
    } else {
      // Add tag to selection
      onTagSelect([...selectedTags, tag]);
    }
    // Keep dropdown open for multiple selections
  };

  const handleTagDelete = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTagDelete) {
      await onTagDelete(tag);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onDropdownToggle) {
            onDropdownToggle(isOpen ? null : "tag");
          } else {
            setIsOpen(!isOpen);
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium
          transition-all duration-200 border min-w-[150px] max-w-[200px] flex-shrink-0
          ${
            selectedTags.length > 0
              ? "bg-green-500/20 text-green-300 border-green-500/40 shadow-lg shadow-green-500/10"
              : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 border-white/[0.08] hover:border-white/[0.12]"
          }
        `}
      >
        <Search className="w-3 h-3 flex-shrink-0" />
        <span className="truncate flex-1 min-w-0">
          {selectedTags.length === 0 
            ? "Search by tag" 
            : selectedTags.length === 1 
            ? `#${selectedTags[0]}` 
            : `${selectedTags.length} tags`}
        </span>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTagSelect([]);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="hover:bg-white/10 rounded p-0.5 transition-colors flex-shrink-0"
            aria-label="Clear tag filters"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ml-auto ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 top-full left-0 mt-1 w-64 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-lg shadow-xl overflow-hidden"
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
                placeholder="Search tags..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          {/* Tag List */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-white/40">
                {searchQuery ? "No tags found" : "No tags available"}
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const tagColor = getTagColor(tag);
                return (
                  <div
                    key={tag}
                    className={`
                      flex items-center justify-between px-3 py-2 hover:bg-white/10 transition-colors
                      ${isSelected ? "bg-green-500/10" : ""}
                    `}
                    onClick={() => handleTagSelect(tag)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Checkbox indicator */}
                      <div className={`
                        w-3 h-3 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${isSelected 
                          ? "bg-green-500/20 border-green-500/60" 
                          : "border-white/20"
                        }
                      `}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        )}
                      </div>
                      {/* Tag label with color indicator */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tagColor }}
                        />
                        <span className="text-[10px] font-medium text-white/80 truncate">
                          #{tag}
                        </span>
                      </div>
                    </div>
                    {/* Delete button */}
                    {onTagDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleTagDelete(tag, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="ml-2 hover:bg-red-500/20 rounded p-1 transition-colors flex-shrink-0"
                        aria-label={`Delete tag ${tag}`}
                      >
                        <X className="w-2.5 h-2.5 text-red-400" />
                      </button>
                    )}
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
