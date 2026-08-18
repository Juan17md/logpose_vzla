"use client";

import { useEffect, useMemo, useState } from "react";

const CLAVE_CIERRE_INSTALACION_IOS = "pwa_ios_install_dismissed_v1";
const CLAVE_CIERRE_ACTUALIZACION = "pwa_update_dismissed_v1";

function esIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function estaEnModoStandalone() {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const standaloneNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(standaloneMedia || standaloneNavigator);
}

export default function AvisosPWA() {
  const [mostrarInstalacionIos, setMostrarInstalacionIos] = useState(() => {
    if (typeof window === "undefined") return false;
    const fueCerrado = localStorage.getItem(CLAVE_CIERRE_INSTALACION_IOS) === "1";
    return esIos() && !estaEnModoStandalone() && !fueCerrado;
  });
  const [mostrarActualizacion, setMostrarActualizacion] = useState(false);
  const [registroSW, setRegistroSW] = useState<ServiceWorkerRegistration | null>(null);

  const puedeActualizar = useMemo(() => Boolean(registroSW?.waiting), [registroSW]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let desmontado = false;

    const gestionarRegistro = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (desmontado || !registration) return;

        setRegistroSW(registration);

        const fueCerrado = localStorage.getItem(CLAVE_CIERRE_ACTUALIZACION) === "1";
        if (registration.waiting && !fueCerrado) {
          setMostrarActualizacion(true);
        }

        registration.addEventListener("updatefound", () => {
          const workerInstalando = registration.installing;
          if (!workerInstalando) return;

          workerInstalando.addEventListener("statechange", () => {
            if (workerInstalando.state === "installed" && navigator.serviceWorker.controller) {
              const cerrado = localStorage.getItem(CLAVE_CIERRE_ACTUALIZACION) === "1";
              setRegistroSW(registration);
              if (!cerrado) setMostrarActualizacion(true);
            }
          });
        });
      } catch {
        // Evita romper la UI si la API de SW no responde en algún navegador.
      }
    };

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void gestionarRegistro();

    return () => {
      desmontado = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const cerrarAvisoInstalacion = () => {
    localStorage.setItem(CLAVE_CIERRE_INSTALACION_IOS, "1");
    setMostrarInstalacionIos(false);
  };

  const cerrarAvisoActualizacion = () => {
    localStorage.setItem(CLAVE_CIERRE_ACTUALIZACION, "1");
    setMostrarActualizacion(false);
  };

  const aplicarActualizacion = () => {
    registroSW?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <>
      {mostrarInstalacionIos && (
        <div className="fixed inset-x-4 bottom-safe-fab z-[70] md:inset-x-auto md:right-8 md:w-[360px]">
          <div className="rounded-2xl border border-amber-400/40 bg-slate-900/95 p-4 shadow-lg backdrop-blur-xl">
            <p className="text-sm font-semibold text-amber-300">Instala LogPose en tu iPhone</p>
            <p className="mt-2 text-sm text-slate-200">
              Pulsa <strong>Compartir</strong> en Safari y luego <strong>Añadir a pantalla de inicio</strong>.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cerrarAvisoInstalacion}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarActualizacion && puedeActualizar && (
        <div className="fixed inset-x-4 bottom-safe-fab z-[71] md:inset-x-auto md:right-8 md:w-[360px]">
          <div className="rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 shadow-lg backdrop-blur-xl">
            <p className="text-sm font-semibold text-emerald-300">Nueva version disponible</p>
            <p className="mt-2 text-sm text-slate-200">
              Hay mejoras listas. Actualiza para aplicar la version mas reciente.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cerrarAvisoActualizacion}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Luego
              </button>
              <button
                type="button"
                onClick={aplicarActualizacion}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
