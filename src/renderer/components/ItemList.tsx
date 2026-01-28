import { useEffect, useRef } from "react";
import type { ListItem } from "@/types";
import { detectContentType } from "@/lib/contentDetection";
import { ContentTypeIcon } from "./ContentTypeIcon";

interface ItemListProps {
  items: ListItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  loading?: boolean;
  fontSize?: "small" | "medium" | "large";
}

const sizeClasses = {
  small: { item: "py-2", icon: "w-6 h-6", iconInner: "w-3 h-3", title: "text-[11px]", sub: "text-[9px]" },
  medium: { item: "py-2.5", icon: "w-7 h-7", iconInner: "w-3.5 h-3.5", title: "text-xs", sub: "text-[10px]" },
  large: { item: "py-3", icon: "w-8 h-8", iconInner: "w-4 h-4", title: "text-sm", sub: "text-xs" },
};

export function ItemList({ 
  items, 
  selectedIndex, 
  onSelectIndex, 
  loading, 
  fontSize = "small",
}: ItemListProps) {
  const sizes = sizeClasses[fontSize];
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-[10px] text-white/40">Loading...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="9" y="2" width="6" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
        </div>
        <p className="text-xs font-medium text-white/50">No items yet</p>
        <p className="text-[10px] text-white/30 mt-1">Copy something to start</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto py-1 px-1.5">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const contentInfo = detectContentType(item.content);

        return (
          <div
            key={item.id}
            onClick={() => onSelectIndex(index)}
            className={`group flex items-center gap-2.5 px-2.5 ${sizes.item} mb-0.5 rounded-lg cursor-pointer transition-all duration-100 ${
              isSelected
                ? "bg-white/[0.1] text-white"
                : "hover:bg-white/[0.05] text-white/80"
            }`}
          >
            {/* Content Type Icon */}
            <div 
              className={`flex-shrink-0 ${sizes.icon} rounded-md flex items-center justify-center`}
              style={{ 
                backgroundColor: isSelected ? `${contentInfo.color}20` : `${contentInfo.color}12`,
              }}
            >
              <ContentTypeIcon 
                type={contentInfo.type} 
                className={sizes.iconInner}
                style={{ color: contentInfo.color }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`${sizes.title} truncate font-medium ${isSelected ? "text-white" : "text-white/90"}`}>
                {item.title}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span 
                  className={`${sizes.sub} px-1 py-0.5 rounded font-medium`}
                  style={{ 
                    backgroundColor: `${contentInfo.color}15`,
                    color: contentInfo.color,
                  }}
                >
                  {contentInfo.label}
                </span>
                <span className={`${sizes.sub} ${isSelected ? "text-white/50" : "text-white/40"}`}>
                  {item.subtitle}
                </span>
              </div>
            </div>

            {/* Overdue indicator for tasks */}
            {item.type === "task" && item.isOverdue && (
              <div className="flex-shrink-0 relative">
                <span className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></span>
                <span className="relative block w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
