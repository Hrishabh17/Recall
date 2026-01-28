/**
 * Search Filter Types
 * 
 * - scriptType: Filter by script type (sql, bash, curl, text)
 */
export interface SearchFilters {
  contentType: null;
  tags: string[]; // Changed to array for multiple tag selection
  scriptTypes: string[]; // Changed to array for multiple script type selection
  dateRange: null;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  availableTags: string[];
  onTagDelete?: (tag: string) => void;
  openDropdown?: "tag" | "type" | null;
  onDropdownToggle?: (type: "tag" | "type" | null) => void;
}

import { ContentTypeSelector } from "./ContentTypeSelector";

/**
 * SearchFilters Component
 * 
 * Searchable multi-select dropdown for content type filtering
 */
export function SearchFilters({ filters, onChange, openDropdown, onDropdownToggle }: SearchFiltersProps) {
  const updateMultipleTypes = (types: string[]) => {
    onChange({
      ...filters,
      scriptTypes: types,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Searchable Multi-Select for All Content Types */}
      <ContentTypeSelector
        selectedTypes={filters.scriptTypes || []}
        onTypeSelect={updateMultipleTypes}
        openDropdown={openDropdown}
        onDropdownToggle={onDropdownToggle}
      />
    </div>
  );
}
