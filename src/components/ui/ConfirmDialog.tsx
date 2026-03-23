"use client";

import Modal from "./Modal";
import { FiAlertTriangle } from "react-icons/fi";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    isLoading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "warning",
    isLoading = false,
}: ConfirmDialogProps) {
    const config = {
        danger: {
            icon: <FiAlertTriangle className="text-4xl text-red-500 mb-4 mx-auto" />,
            buttonBg: "bg-red-600 hover:bg-red-500",
            buttonShadow: "shadow-red-900/20",
        },
        warning: {
            icon: <FiAlertTriangle className="text-4xl text-amber-500 mb-4 mx-auto" />,
            buttonBg: "bg-amber-600 hover:bg-amber-500",
            buttonShadow: "shadow-amber-900/20",
        },
        info: {
            icon: null,
            buttonBg: "bg-violet-600 hover:bg-violet-500",
            buttonShadow: "shadow-violet-900/20",
        },
    };

    const currentConfig = config[type];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-center">
                {currentConfig.icon}
                <p className="text-slate-300 mb-8">{message}</p>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-3 font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-6 py-3 font-semibold text-white ${currentConfig.buttonBg} rounded-xl shadow-lg ${currentConfig.buttonShadow} transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
