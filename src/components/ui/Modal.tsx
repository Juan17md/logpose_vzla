"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "md",
}: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard
        setMounted(true);
    }, []);

    // Evitar que el fondo haga scroll cuando el modal está abierto
    useEffect(() => {
        if (!mounted) return;
        
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen, mounted]);

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
    };

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                        aria-hidden="true"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-slate-900 border border-slate-700 shadow-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col`}
                    >
                        {/* Brillo superior decorativo */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

                        {/* Cabecera */}
                        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-800 shrink-0">
                            <h3 className="text-xl font-bold tracking-tight text-white">
                                {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        {/* Cuerpo (con scroll si es muy alto) */}
                        <div className="p-5 md:p-6 text-slate-300 overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}