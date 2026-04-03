"use client";

import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { MonedaSoportada, MONEDAS_SOPORTADAS } from "@/lib/bankAccounts";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
    value: MonedaSoportada;
    onChange: (value: MonedaSoportada) => void;
    compact?: boolean;
}

export default function CurrencySelector({ value, onChange, compact = false }: CurrencySelectorProps) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/80 transition-all focus:outline-none focus:ring-1 focus:ring-amber-500/30",
                    compact ? "h-5" : "h-6"
                )}>
                    <span className="text-[10px] font-black text-amber-500 tracking-tighter">{value}</span>
                    <FiChevronDown className="text-slate-500" size={10} />
                </Menu.Button>
            </div>
            
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-1 w-24 origin-top-right divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-700/50 shadow-2xl focus:outline-none z-50">
                    <div className="p-1">
                        {MONEDAS_SOPORTADAS.map((moneda) => (
                            <Menu.Item key={moneda.id}>
                                {({ active }) => (
                                    <button
                                        onClick={() => onChange(moneda.id)}
                                        className={cn(
                                            "group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase transition-colors",
                                            active ? "bg-amber-500/10 text-amber-400" : "text-slate-400",
                                            value === moneda.id && "bg-amber-500/20 text-white"
                                        )}
                                    >
                                        {moneda.id}
                                        {value === moneda.id && <FiCheck className="text-amber-500" size={10} />}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
