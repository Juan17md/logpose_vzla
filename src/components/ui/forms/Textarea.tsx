"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FieldError } from "react-hook-form";
import { FiAlertCircle } from "react-icons/fi";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: FieldError | undefined;
    icon?: React.ReactNode;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400/80 mb-2.5 ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute top-4 left-4 pointer-events-none z-10 text-slate-500 group-focus-within:text-amber-400 transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                    <textarea
                        ref={ref}
                        className={cn(
                            "w-full bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 text-white text-sm font-medium rounded-2xl py-3.5 outline-none transition-all duration-300 placeholder:text-slate-600 resize-none",
                            "hover:border-amber-500/30 hover:bg-[#0A0E1A]",
                            "focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 focus:bg-[#0A0E1A] focus:shadow-[0_0_20px_rgba(202,138,4,0.08)]",
                            icon ? "pl-11" : "pl-5",
                            "pr-5",
                            error && "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <div className="flex items-center gap-1.5 mt-1.5 ml-0.5 text-red-400 text-xs">
                        <FiAlertCircle className="shrink-0" />
                        <span>{error.message}</span>
                    </div>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

export default Textarea;
