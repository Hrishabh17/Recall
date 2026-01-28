import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
}

export function SearchBar({ value, onChange, placeholder = "Search...", resultCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement !== inputRef.current &&
        e.key.length === 1 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const unsub = window.api.onWindowShown(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return unsub;
  }, []);

  return (
    <div className="w-full">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
          <svg 
            className={`w-4 h-4 transition-colors duration-150 ${
              isFocused ? 'text-white/60' : 'text-white/35'
            }`}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full rounded-xl pl-11 pr-20 py-2.5 text-sm text-white placeholder:text-white/30 transition-all duration-150 border ${
            isFocused 
              ? 'border-white/15 bg-white/[0.07]' 
              : 'border-white/[0.06] bg-white/[0.04]'
          }`}
          autoFocus
        />

        {/* Right side content */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value ? (
            <>
              {resultCount !== undefined && (
                <span className="text-[10px] text-white/40">
                  {resultCount}
                </span>
              )}
              <button
                onClick={() => onChange("")}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <svg 
                  className="w-3.5 h-3.5 text-white/40 hover:text-white/60" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-0.5 text-[10px] text-white/25">
              <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[9px]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[9px]">K</kbd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
