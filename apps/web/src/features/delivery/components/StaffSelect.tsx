import React from 'react';

export interface StaffOption {
  id: string;
  fullName: string;
  role: string;
}

interface StaffSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: StaffOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const StaffSelect: React.FC<StaffSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select staff member',
  required,
  disabled,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required={required}
    disabled={disabled}
    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o.id} value={o.id}>
        {o.fullName}
      </option>
    ))}
  </select>
);
