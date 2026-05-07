"use client";

import React from "react";
import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field";
import { cn } from "@/lib/utils";
import { FieldError } from "react-hook-form";
import { FiAlertCircle } from "react-icons/fi";
import { motion } from "framer-motion";

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
                    className={cn(
                        "w-full bg-slate-800/50 border border-slate-700/50 text-white text-lg font-semibold rounded-2xl py-4 pl-4 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 hover:border-slate-600 hover:bg-slate-800",
                        error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-1 ml-1 text-red-400 text-xs"
                >
                    <FiAlertCircle />
                    <span>{error.message}</span>
                </motion.div>
            )}
        </div>
    );
};

export default CustomCurrencyInput;
