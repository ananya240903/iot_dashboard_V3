import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function SearchableMultiSelect({
    label,
    options,
    selectedOptions,
    onChange,
    placeholder = 'Search...',
    minWidth = '200px'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        if (selectedOptions.includes(option)) {
            onChange(selectedOptions.filter((item) => item !== option));
        } else {
            onChange([...selectedOptions, option]);
        }
    };

    const handleClearAll = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    // Filter by search query
    const filteredOptions = useMemo(() => {
        return options.filter((option) =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    // Group selected and unselected
    const matchingSelected = useMemo(() => {
        return filteredOptions.filter(opt => selectedOptions.includes(opt));
    }, [filteredOptions, selectedOptions]);

    const matchingUnselected = useMemo(() => {
        return filteredOptions.filter(opt => !selectedOptions.includes(opt));
    }, [filteredOptions, selectedOptions]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearchTerm('');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all font-semibold text-sm text-slate-700 justify-between"
                style={{ minWidth }}
            >
                <span className="truncate">
                    {selectedOptions.length === 0
                        ? label
                        : selectedOptions.length === 1
                        ? selectedOptions[0]
                        : `${selectedOptions.length} ${label.toLowerCase() === 'all severities' ? 'severities' : label.toLowerCase()} selected`}
                </span>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-200">
                            <Search size={14} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full font-medium"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 flex flex-col">
                        {matchingSelected.length > 0 && (
                            <div className="mb-2">
                                <div className="flex items-center justify-between px-2 py-1 mb-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Selected ({matchingSelected.length})
                                    </span>
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                                {matchingSelected.map((option) => (
                                    <div
                                        key={option}
                                        onClick={() => toggleOption(option)}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-semibold mb-1 bg-indigo-50 text-indigo-700"
                                    >
                                        <span className="break-words">{option}</span>
                                        <Check size={16} className="text-indigo-600 shrink-0 ml-2" />
                                    </div>
                                ))}
                                {matchingUnselected.length > 0 && (
                                    <div className="h-px bg-slate-100 my-2 mx-1"></div>
                                )}
                            </div>
                        )}

                        {matchingUnselected.map((option) => (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-semibold mb-1 last:mb-0 text-slate-700 hover:bg-slate-100"
                            >
                                <span className="break-words">{option}</span>
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-slate-500 font-medium">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
