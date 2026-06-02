"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

interface PageTransitionProps {
    children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();
    const [esMovil, setEsMovil] = useState(false);

    useEffect(() => {
        const checkEsMovil = () => {
            setEsMovil(window.innerWidth < 768);
        };
        checkEsMovil();
        window.addEventListener("resize", checkEsMovil);
        return () => window.removeEventListener("resize", checkEsMovil);
    }, []);

    // En móviles deslizamiento lateral tipo iOS; en desktop desvanecimiento vertical suave.
    const variants = {
        initial: {
            opacity: 0,
            x: esMovil ? 24 : 0,
            y: esMovil ? 0 : 8,
        },
        animate: {
            opacity: 1,
            x: 0,
            y: 0,
        },
        exit: {
            opacity: 0,
            x: esMovil ? -24 : 0,
            y: esMovil ? 0 : -8,
        }
    };

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 32,
                }}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
