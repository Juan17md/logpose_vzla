"use client";

import React from "react";
import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field";
import { cn } from "@/lib/utils";
import { FieldError } from "react-hook-form";
import { FiAlertCircle } from "react-icons/fi";
interface CustomCurrencyInputProps extends CurrencyInputProps {
    label?: string;
    error?: FieldError | undefined;
}

const CustomCurrencyInput = ({ className, label, error, ...props }: CustomCurrencyInputProps) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <CurrencyInput
                    decimalSeparator=","
                    groupSeparator="."
                    intlConfig={{ locale: "es-VE" }}
                    inputMode="decimal"
                    className={cn(
                        "w-full bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 text-white text-lg font-black rounded-2xl py-4 h-[54px] pl-5 pr-5 outline-none transition-colors duration-300 placeholder:text-slate-600 hover:border-amber-500/30 hover:bg-[#0A0E1A] shadow-lg focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 focus:bg-[#0A0E1A]",
                        error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <div
                    className="flex items-center gap-1 mt-1 ml-1 text-red-400 text-xs"
                >
                    <FiAlertCircle />
                    <span>{error.message}</span>
                </div>
            )}
        </div>
    );
};

export default CustomCurrencyInput;
