"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { FieldError } from "react-hook-form";
import { FiAlertCircle } from "react-icons/fi";

interface InputProps extends Omit<HTMLMotionProps<"input">, "ref"> {
    label?: string;
    error?: FieldError | undefined;
    icon?: React.ReactNode;
    rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, rightElement, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-slate-500 group-focus-within:text-amber-400 transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                    <motion.input
                        ref={ref}
                        whileFocus={{ scale: 1.005 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "w-full bg-[#0A0E1A]/80 border border-white/[0.06] text-white text-sm font-medium rounded-xl py-3.5 outline-none transition-all duration-300 placeholder:text-slate-600",
                            "hover:border-white/[0.12] hover:bg-[#0A0E1A]",
                            "focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/40 focus:shadow-[0_0_20px_rgba(202,138,4,0.08)]",
                            icon ? "pl-11" : "pl-4",
                            rightElement ? "pr-12" : "pr-4",
                            error && "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
                            className
                        )}
                        {...props}
                    />
                    {rightElement && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 z-20">
                            {rightElement}
                        </div>
                    )}
                </div>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 mt-1.5 ml-0.5 text-red-400 text-xs"
                    >
                        <FiAlertCircle className="shrink-0" />
                        <span>{error.message}</span>
                    </motion.div>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
