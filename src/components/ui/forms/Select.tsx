"use client";

import { Fragment, ReactNode } from 'react';
import { Listbox } from '@headlessui/react';
import { FiCheck, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { FieldError } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption<T extends string | number = string> {
    id: T | string;
    name: string;
    value: T;
    group?: string;
    [key: string]: unknown;
}

interface SelectProps<T extends string | number = string> {
    label?: string;
    options: SelectOption<T>[];
    value: T;
    onChange: (value: T) => void;
    error?: FieldError | { message?: string };
    icon?: ReactNode;
    placeholder?: string;
    renderOption?: (option: SelectOption<T>) => ReactNode;
    renderValue?: (option: SelectOption<T>) => ReactNode;
    className?: string;
    showGroups?: boolean;
    disabled?: boolean;
}

export default function Select<T extends string | number = string>({ 
    label, 
    options, 
    value, 
    onChange, 
    error, 
    icon, 
    placeholder = "Seleccionar",
    renderOption,
    renderValue,
    className,
    showGroups = false,
    disabled = false
}: SelectProps<T>) {
    const selectedOption = options.find(opt => opt.value === value) || null;

    // Agrupar opciones si showGroups es true
    const groupedOptions = showGroups 
        ? options.reduce((acc, opt) => {
            const group = opt.group || "Otros";
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
          }, {} as Record<string, SelectOption<T>[]>)
        : { "": options };

    return (
        <div className={cn("w-full relative", className)}>
            {label && (
                <label className="flex text-xs font-black uppercase tracking-widest text-slate-500 mb-2.5 ml-1 items-center gap-2">
                    {icon && <span className="text-amber-500/50">{icon}</span>}
                    {label}
                </label>
            )}
            
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                {({ open }) => (
                    <div className="relative">
                        <Listbox.Button className={cn(
                            "relative w-full cursor-pointer bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-white text-sm font-bold rounded-2xl py-4 pl-5 pr-12 text-left outline-none transition-all duration-300 hover:border-amber-500/30 hover:bg-slate-800/60 shadow-lg",
                            open && "border-amber-500/50 ring-4 ring-amber-500/10 bg-slate-800/80",
                            error && "border-red-500/50 focus:border-red-500/50 ring-red-500/10",
                            disabled && "opacity-50 cursor-not-allowed hover:border-slate-700/50 hover:bg-slate-800/40"
                        )}>
                            <span className={cn(
                                "block truncate transition-all duration-300",
                                !selectedOption ? 'text-slate-500 font-medium' : 'text-white'
                            )}>
                                {selectedOption 
                                    ? (renderValue ? renderValue(selectedOption) : selectedOption.name) 
                                    : placeholder}
                            </span>
                            
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                <motion.div
                                    animate={{ rotate: open ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: "backOut" }}
                                >
                                    <FiChevronDown
                                        className={cn(
                                            "h-5 w-5 transition-colors duration-300",
                                            open ? "text-amber-400" : "text-slate-500"
                                        )}
                                        aria-hidden="true"
                                    />
                                </motion.div>
                            </span>
                        </Listbox.Button>

                        <AnimatePresence>
                            {open && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute z-60 mt-3 w-full"
                                >
                                    <Listbox.Options
                                        static
                                        className="max-h-72 w-full overflow-auto rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 p-2 text-base shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 focus:outline-none sm:text-sm custom-scrollbar"
                                    >
                                        {options.length === 0 ? (
                                            <div className="py-8 px-4 text-center">
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No hay opciones</p>
                                            </div>
                                        ) : (
                                            Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                                                <Fragment key={groupName}>
                                                    {showGroups && groupName && (
                                                        <div className="px-4 py-2 mt-2 first:mt-0">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500/80">
                                                                {groupName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {groupOptions.map((option) => (
                                                        <Listbox.Option
                                                            key={String(option.value)}
                                                            className={({ active, selected }) => cn(
                                                                "relative cursor-pointer select-none py-3.5 pl-12 pr-4 rounded-2xl transition-all duration-200 mb-1 last:mb-0",
                                                                active ? "bg-amber-500/10 text-amber-400" : "text-slate-300",
                                                                selected && "bg-amber-500/20 text-white font-bold"
                                                            )}
                                                            value={option.value}
                                                        >
                                                            {({ selected }) => (
                                                                <>
                                                                    <span className="block truncate">
                                                                        {renderOption ? renderOption(option) : option.name}
                                                                    </span>
                                                                    
                                                                    {selected && (
                                                                        <motion.span 
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            className="absolute inset-y-0 left-0 flex items-center pl-4 text-amber-400"
                                                                        >
                                                                            <FiCheck className="h-5 w-5" aria-hidden="true" />
                                                                        </motion.span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Listbox.Option>
                                                    ))}
                                                </Fragment>
                                            ))
                                        )}
                                    </Listbox.Options>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </Listbox>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2 ml-1 text-red-400 text-[10px] font-black uppercase tracking-tighter"
                >
                    <FiAlertCircle size={14} className="shrink-0" />
                    <span>{error.message}</span>
                </motion.div>
            )}
        </div>
    );
}
