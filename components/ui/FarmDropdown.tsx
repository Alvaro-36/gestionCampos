"use client";

import { useEffect, useRef, useState } from 'react';
import { Farm } from '@/lib/domain/farm';

interface FarmDropdownProps {
  farms: Farm[];
  selectedFarmId: string | null;
  onChange: (farmId: string) => void;
}

export default function FarmDropdown({ farms, selectedFarmId, onChange }: FarmDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-between bg-[#f3f4ed] border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-title-sm text-on-surface hover:bg-surface-container transition-all cursor-pointer shadow-sm gap-2 select-none"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
          <span>
            {selectedFarm?.name || "Seleccionar Finca"}
          </span>
        </div>
        <span className={`material-symbols-outlined text-[18px] text-outline transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Options */}
      <div 
        className={`absolute top-full mt-1 left-0 w-full sm:w-64 bg-surface border border-outline-variant rounded-xl shadow-lg z-30 overflow-hidden transition-all duration-200 origin-top-left ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <ul className="py-1.5 m-0 list-none max-h-60 overflow-y-auto pl-0">
          {farms.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  if (f.id) {
                    onChange(f.id);
                  }
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-body-sm font-body-sm hover:bg-primary-container/20 hover:text-primary transition-colors cursor-pointer border-none bg-transparent ${
                  f.id === selectedFarmId ? 'bg-primary-container/30 text-primary font-semibold' : 'text-on-surface'
                }`}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
