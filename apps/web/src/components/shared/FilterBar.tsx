import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input.js';
import { Button } from '../ui/button.js';

export interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search records...',
  className,
}) => {
  return (
    <div className={`relative flex items-center ${className || ''}`}>
      <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || 'Search'}
        className="pl-9 pr-8 text-xs h-11 sm:h-9 bg-white"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export interface FilterBarProps {
  searchQuery?: string;
  searchValue?: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  filterOptions?: Array<{ label: string; value: string }>;
  selectedFilter?: string;
  onFilterChange?: (val: string) => void;
  children?: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterOptions,
  selectedFilter,
  onFilterChange,
  children,
  onReset,
  className,
}) => {
  const query = searchValue !== undefined ? searchValue : searchQuery || '';

  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm ${className || ''}`}
    >
      <div className="flex-1 max-w-sm">
        <SearchInput value={query} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions && onFilterChange && (
          <select
            aria-label="Filter list"
            value={selectedFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="h-11 sm:h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {children}
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-slate-500 h-9"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
