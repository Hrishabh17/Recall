import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X } from "./Icons";

interface TagInputProps {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/**
 * TagInput Component
 * 
 * A modern tag input with:
 * - Chip-based display
 * - Autocomplete suggestions
 * - Easy tag removal
 * - Keyboard navigation
 */
export function TagInput({ tags, availableTags, onChange, placeholder = "Add tags..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedTagIndex, setSelectedTagIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already added tags
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return availableTags
      .filter(tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) && 
        !tags.includes(tag)
      )
      .slice(0, 8);
  }, [inputValue, availableTags, tags]);

  // Get all available tags for display when input is empty
  const allAvailableTags = useMemo(() => {
    return availableTags
      .filter(tag => !tags.includes(tag))
      .slice(0, 8);
  }, [availableTags, tags]);

  // Show suggestions when input has focus
  useEffect(() => {
    if (inputRef.current === document.activeElement) {
      if (inputValue.length > 0) {
        setShowSuggestions(suggestions.length > 0);
      } else {
        setShowSuggestions(allAvailableTags.length > 0);
      }
    }
    setSelectedSuggestionIndex(-1);
  }, [inputValue, suggestions.length, allAvailableTags.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
      setSelectedTagIndex(null);
    } else if (e.key === "Delete" && selectedTagIndex !== null && tags[selectedTagIndex]) {
      // Delete selected tag with Delete key
      e.preventDefault();
      removeTag(tags[selectedTagIndex]);
      setSelectedTagIndex(null);
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && inputValue === "" && tags.length > 0) {
      // Navigate between tags with arrow keys
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        setSelectedTagIndex(prev => prev === null ? tags.length - 1 : prev > 0 ? prev - 1 : prev);
      } else {
        setSelectedTagIndex(prev => prev === null ? 0 : prev < tags.length - 1 ? prev + 1 : null);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showSuggestions) {
        const maxIndex = inputValue.length > 0 
          ? suggestions.length - 1 
          : allAvailableTags.length - 1;
        setSelectedSuggestionIndex(prev => 
          prev < maxIndex ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
      setSelectedTagIndex(null);
    } else if (e.key === "Tab" || e.key === "Enter") {
      if (selectedSuggestionIndex >= 0) {
        e.preventDefault();
        const tagToAdd = inputValue.length > 0 
          ? suggestions[selectedSuggestionIndex]
          : allAvailableTags[selectedSuggestionIndex];
        if (tagToAdd) {
          addTag(tagToAdd);
        }
      }
    }
  };

  const addTag = useCallback((tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInputValue("");
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  }, [tags, onChange]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
    setSelectedTagIndex(null);
    inputRef.current?.focus();
  }, [tags, onChange]);

  // Clear selected tag when input gets focus or value changes
  useEffect(() => {
    if (inputValue.length > 0) {
      setSelectedTagIndex(null);
    }
  }, [inputValue]);

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
  };

  // Generate color for tag based on hash (consistent colors)
  const getTagColor = (tag: string) => {
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
    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="relative">
      {/* Input Field with Inline Tags */}
      <div className="relative">
        {/* Container that looks like an input but contains tags and input */}
        <div 
          className="w-full min-h-[36px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-1.5 focus-within:border-vault-accent/50 focus-within:bg-white/[0.07] transition-all"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Tag Chips - Inline with input */}
          {tags.map((tag, index) => {
            const color = getTagColor(tag);
            const isSelected = selectedTagIndex === index;
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                  isSelected 
                    ? `${color.bg} ${color.text} ${color.border} ring-2 ring-white/30` 
                    : `${color.bg} ${color.text} ${color.border} hover:opacity-80`
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTagIndex(index);
                  inputRef.current?.focus();
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                title={`Click to select, double-click to delete, or press Delete key`}
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className={`hover:bg-white/20 rounded p-0.5 transition-colors ml-0.5 ${
                    isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Remove ${tag}`}
                  title="Click X to delete"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}

          {/* Input Field - Inline */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              // Show suggestions when focused
              if (inputValue.length > 0) {
                setShowSuggestions(suggestions.length > 0);
              } else {
                setShowSuggestions(allAvailableTags.length > 0);
              }
            }}
            onBlur={() => {
              // Delay to allow suggestion clicks
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={tags.length === 0 ? placeholder : "Add tag..."}
            className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-[10px] text-white placeholder:text-white/30"
            style={{ minWidth: "120px" }}
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || (inputValue.length === 0 && allAvailableTags.length > 0)) && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-[200px] overflow-y-auto"
          >
            {inputValue.length > 0 ? (
              // Show filtered suggestions when typing
              suggestions.map((tag, index) => {
                const color = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSuggestionClick(tag)}
                    className={`w-full text-left px-3 py-2 text-[10px] hover:bg-white/10 transition-colors flex items-center gap-2 ${
                      index === selectedSuggestionIndex ? "bg-white/10" : ""
                    }`}
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                      {tag}
                    </span>
                    <span className="text-white/40 text-[9px]">Press Enter or click to add</span>
                  </button>
                );
              })
            ) : (
              // Show all available tags when input is empty
              <>
                <div className="px-3 py-1.5 text-[9px] text-white/40 border-b border-white/5">
                  Available tags (click to add):
                </div>
                {allAvailableTags.map((tag, index) => {
                  const color = getTagColor(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSuggestionClick(tag)}
                      className={`w-full text-left px-3 py-2 text-[10px] hover:bg-white/10 transition-colors ${
                        index === selectedSuggestionIndex ? "bg-white/10" : ""
                      }`}
                    >
                      <span className={`inline-flex items-center px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                        {tag}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Helper Text - Always visible with instructions */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-white/30">
        <span>
          Type and press <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">Enter</kbd> to add
        </span>
        {tags.length > 0 && (
          <>
            <span className="text-white/20">•</span>
            <span>
              <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">←→</kbd> to select, <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">Delete</kbd> or <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">Backspace</kbd> to remove
            </span>
            <span className="text-white/20">•</span>
            <span>
              Double-click tag or click <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">X</kbd> to delete
            </span>
          </>
        )}
        {availableTags.length > 0 && tags.length === 0 && (
          <>
            <span className="text-white/20">•</span>
            <span>
              Click suggestions or use <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px]">↑↓</kbd> to navigate
            </span>
          </>
        )}
      </div>
    </div>
  );
}
