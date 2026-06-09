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

    // En móvil: sin animación de transición entre páginas.
    // iOS ya maneja el swipe-back nativo con su propia animación de Safari;
    // agregar una segunda animación encima causa parpadeo y sensación de recarga.
    // Además, sin key={pathname} los componentes no se desmontan/remontan,
    // lo que evita que las animaciones internas del dashboard se re-ejecuten.
    if (esMovil) {
        return <>{children}</>;
    }

    // Desktop: popLayout con fade + desplazamiento vertical suave
    const variants = {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
    };

    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    type: "tween",
                    duration: 0.25,
                    ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
