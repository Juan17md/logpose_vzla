import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center space-x-4 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-xl transition-colors ${currentPage === 1
                        ? "text-slate-600 bg-slate-800/50 cursor-not-allowed"
                        : "text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white shadow-lg"
                    }`}
            >
                <FiChevronLeft size={20} />
            </button>

            <span className="text-slate-400 text-sm font-medium">
                Página <span className="text-white font-bold">{currentPage}</span> de{" "}
                <span className="text-slate-400">{totalPages}</span>
            </span>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-xl transition-colors ${currentPage === totalPages
                        ? "text-slate-600 bg-slate-800/50 cursor-not-allowed"
                        : "text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white shadow-lg"
                    }`}
            >
                <FiChevronRight size={20} />
            </button>
        </div>
    );
}
