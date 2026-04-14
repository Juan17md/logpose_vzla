"use client";

import { useEffect, useState } from "react";
import { Quote, getRandomQuote } from "@/lib/quotes";
import { motion, AnimatePresence } from "framer-motion";
import { FiAnchor } from "react-icons/fi";
import { QuoteCategory } from "@/lib/quotes";

interface OnePieceQuoteProps {
    className?: string;
    category?: QuoteCategory;
}

export default function OnePieceQuote({ className, category }: OnePieceQuoteProps) {
    const [quote, setQuote] = useState<Quote | null>(null);

    useEffect(() => {
        setQuote(getRandomQuote(category));
    }, [category]);

    if (!quote) return null;

    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={quote.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="relative p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-md overflow-hidden group"
                >
                    {/* Elemento decorativo de fondo */}
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <FiAnchor size={40} className="text-amber-500 rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <p className="text-xs font-bold text-amber-500/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
                            Inspiración Pirata
                        </p>
                        <blockquote className="text-sm text-slate-200 font-medium italic mb-2 leading-relaxed">
                            "{quote.text}"
                        </blockquote>
                        <div className="flex justify-between items-end mb-3">
                            <footer className="text-[10px] text-slate-500 font-bold">
                                — {quote.author}
                            </footer>
                            {quote.context && (
                                <span className="text-[9px] text-slate-600 italic">
                                    {quote.context}
                                </span>
                            )}
                        </div>

                        {quote.financialLesson && (
                            <div className="pt-2 border-t border-amber-500/10">
                                <p className="text-[10px] text-amber-500/60 leading-tight">
                                    <span className="font-black">LOG:</span> {quote.financialLesson}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
