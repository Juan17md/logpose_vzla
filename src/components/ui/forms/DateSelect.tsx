"use client";

import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import { FiCalendar, FiAlertCircle, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { FieldError } from "react-hook-form";
import { forwardRef } from "react";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

interface DateSelectProps {
    label?: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
    error?: FieldError | { message?: string };
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    minDate?: Date;
    maxDate?: Date;
    /** Si se puede limpiar la fecha con una X */
    clearable?: boolean;
}

// Input personalizado que reemplaza el input nativo de react-datepicker
const CustomInput = forwardRef<
    HTMLButtonElement,
    {
        value?: string;
        onClick?: () => void;
        placeholder?: string;
        disabled?: boolean;
        hasValue: boolean;
        onClear: () => void;
        clearable: boolean;
        hasError: boolean;
    }
>(({ value, onClick, placeholder, disabled, hasValue, onClear, clearable, hasError }, ref) => (
    <button
        type="button"
        onClick={onClick}
        ref={ref}
        disabled={disabled}
        className={`
            w-full cursor-pointer bg-slate-950/40 border text-left rounded-xl py-3 pl-4 pr-10
            text-sm transition-all duration-200 outline-none relative flex items-center gap-3
            ${hasValue ? "text-white" : "text-slate-500"}
            ${hasError
                ? "border-red-500/40 focus:border-red-500/60 ring-1 ring-red-500/10"
                : "border-white/5 hover:border-amber-500/30 focus:border-amber-500/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed hover:border-white/5" : ""}
        `}
    >
        <FiCalendar
            size={15}
            className={`shrink-0 transition-colors duration-200 ${
                hasValue ? "text-amber-400/70" : "text-slate-600"
            }`}
        />
        <span className="flex-1 truncate font-medium">
            {value || placeholder || "Seleccionar fecha"}
        </span>

        <AnimatePresence>
            {clearable && hasValue && !disabled && (
                <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                               text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                    <FiX size={12} />
                </motion.span>
            )}
        </AnimatePresence>

        {(!clearable || !hasValue) && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <FiCalendar size={14} className="text-slate-600" />
            </span>
        )}
    </button>
));
CustomInput.displayName = "DateSelectCustomInput";

export default function DateSelect({
    label,
    value,
    onChange,
    error,
    placeholder,
    required = false,
    disabled = false,
    className = "",
    minDate,
    maxDate,
    clearable = true,
}: DateSelectProps) {
    return (
        <div className={`w-full relative ${className}`}>
            {label && (
                <label className="flex text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1 items-center gap-1.5">
                    {label}
                    {required && <span className="text-red-400">*</span>}
                </label>
            )}

            {/* Estilos globales para el popover de react-datepicker */}
            <style>{`
                .logpose-datepicker-popper {
                    z-index: 9999 !important;
                }
                .logpose-datepicker-popper .react-datepicker {
                    background: rgb(2 6 23 / 0.97) !important;
                    border: 1px solid rgb(255 255 255 / 0.08) !important;
                    border-radius: 1rem !important;
                    font-family: inherit !important;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.7), 0 0 0 1px rgb(255 255 255 / 0.05) !important;
                    padding: 4px !important;
                    backdrop-filter: blur(24px) !important;
                }
                .logpose-datepicker-popper .react-datepicker__header {
                    background: transparent !important;
                    border-bottom: 1px solid rgb(255 255 255 / 0.06) !important;
                    padding: 12px 8px 10px !important;
                    border-radius: 0.75rem 0.75rem 0 0 !important;
                }
                .logpose-datepicker-popper .react-datepicker__current-month {
                    color: #ffffff !important;
                    font-size: 0.85rem !important;
                    font-weight: 700 !important;
                    text-transform: capitalize !important;
                    letter-spacing: 0.01em !important;
                }
                .logpose-datepicker-popper .react-datepicker__day-name {
                    color: rgb(100 116 139) !important;
                    font-size: 0.65rem !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    width: 2.2rem !important;
                    line-height: 2rem !important;
                }
                .logpose-datepicker-popper .react-datepicker__day {
                    color: rgb(203 213 225) !important;
                    font-size: 0.78rem !important;
                    font-weight: 500 !important;
                    width: 2.2rem !important;
                    line-height: 2.2rem !important;
                    border-radius: 0.5rem !important;
                    margin: 2px !important;
                    transition: background 0.15s, color 0.15s !important;
                }
                .logpose-datepicker-popper .react-datepicker__day:hover {
                    background: rgb(251 191 36 / 0.15) !important;
                    color: rgb(251 191 36) !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--selected {
                    background: rgb(251 191 36 / 0.25) !important;
                    color: rgb(251 191 36) !important;
                    font-weight: 700 !important;
                    box-shadow: 0 0 0 1px rgb(251 191 36 / 0.4) !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--today {
                    background: rgb(255 255 255 / 0.05) !important;
                    color: white !important;
                    font-weight: 700 !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--today.react-datepicker__day--selected {
                    background: rgb(251 191 36 / 0.25) !important;
                    color: rgb(251 191 36) !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--outside-month {
                    color: rgb(51 65 85) !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--disabled {
                    color: rgb(51 65 85) !important;
                    cursor: not-allowed !important;
                }
                .logpose-datepicker-popper .react-datepicker__day--disabled:hover {
                    background: transparent !important;
                    color: rgb(51 65 85) !important;
                }
                .logpose-datepicker-popper .react-datepicker__navigation-icon::before {
                    border-color: rgb(100 116 139) !important;
                    border-width: 2px 2px 0 0 !important;
                }
                .logpose-datepicker-popper .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
                    border-color: rgb(251 191 36) !important;
                }
                .logpose-datepicker-popper .react-datepicker__month {
                    margin: 8px 4px 4px !important;
                }
                .logpose-datepicker-popper .react-datepicker__triangle {
                    display: none !important;
                }
                .logpose-datepicker-popper .react-datepicker__navigation {
                    top: 12px !important;
                }
            `}</style>

            <DatePicker
                selected={value}
                onChange={onChange}
                locale="es"
                dateFormat="dd/MM/yyyy"
                placeholderText={placeholder || "dd/mm/aaaa"}
                disabled={disabled}
                minDate={minDate}
                maxDate={maxDate}
                popperClassName="logpose-datepicker-popper"
                popperPlacement="bottom-start"
                customInput={
                    <CustomInput
                        hasValue={!!value}
                        onClear={() => onChange(null)}
                        clearable={clearable}
                        hasError={!!error}
                    />
                }
            />

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 mt-1.5 ml-1 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                    >
                        <FiAlertCircle size={12} className="shrink-0" />
                        <span>{error.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
