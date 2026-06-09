"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

interface PageTransitionProps {
    children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();
    const [esMovil, setEsMovil] = useState(false);
    const direccionNavegacion = useRef<"adelante" | "atras">("adelante");

    useEffect(() => {
        const checkEsMovil = () => {
            setEsMovil(window.innerWidth < 768);
        };
        checkEsMovil();
        window.addEventListener("resize", checkEsMovil);
        return () => window.removeEventListener("resize", checkEsMovil);
    }, []);

    // Detecta la dirección de navegación comparando profundidad de rutas
    useEffect(() => {
        const segmentos = pathname.split("/").filter(Boolean);
        direccionNavegacion.current = segmentos.length > 2 ? "adelante" : "atras";
    }, [pathname]);

    // popLayout: la salida se superpone a la entrada sin parpadeo (ideal para iOS swipe-back)
    // En móvil: fade rápido sin desplazamiento para evitar conflicto con el gesto nativo
    // En desktop: fade + desplazamiento vertical suave con popLayout superpuesto
    const variants = {
        initial: {
            opacity: 0,
            x: esMovil ? (direccionNavegacion.current === "adelante" ? 20 : -20) : 0,
            y: esMovil ? 0 : 12,
        },
        animate: {
            opacity: 1,
            x: 0,
            y: 0,
        },
        exit: {
            opacity: 0,
            x: esMovil ? (direccionNavegacion.current === "adelante" ? -20 : 20) : 0,
            y: esMovil ? 0 : -8,
        }
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
                    duration: esMovil ? 0.15 : 0.25,
                    ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
