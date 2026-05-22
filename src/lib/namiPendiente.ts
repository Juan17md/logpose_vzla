export type CampoCuentaPendiente = "accountId" | "targetAccountId";

export function aplicarCuentaAPendiente(
    pendiente: Record<string, unknown>,
    cuentaId: string
): Record<string, unknown> {
    const copia = { ...pendiente };
    if (copia.campoFaltante === "targetAccountId") {
        copia.targetAccountId = cuentaId;
    } else {
        copia.accountId = cuentaId;
    }
    delete copia.campoFaltante;
    return copia;
}

export function filtrarCuentasParaBotones<T extends { id: string; nombre: string; banco: string }>(
    cuentas: T[],
    pendiente?: Record<string, unknown> | null
): T[] {
    if (pendiente?.campoFaltante === "targetAccountId" && pendiente.accountId) {
        return cuentas.filter((c) => c.id !== pendiente.accountId);
    }
    return cuentas;
}

export function esMensajeCorrectivo(
    mensaje: string,
    montoPendiente?: number,
    cuentas?: Array<{ nombre: string; banco: string }>
): boolean {
    const t = mensaje.toLowerCase().trim();

    // 1. Palabras clave de corrección o negación
    const palabrasCorrectivas = [
        "no", "eran", "era", "sino", "cambia", "corrige", "modifica",
        "error", "equivocado", "rectifica", "en verdad", "en realidad",
        "cancela", "cancele", "borra", "elimina", "corregir", "me equivoque",
        "me equivoqué", "realidad", "verdad", "disculpa", "perdon", "perdón",
        "pero"
    ];

    if (palabrasCorrectivas.some((p) => new RegExp(`\\b${p}\\b`, "i").test(t))) {
        return true;
    }

    // 2. Buscar si hay algún número en el mensaje que sugiera un monto diferente
    const regexNumeros = /\b\d+(?:[.,]\d+)?\b/g;
    let match: RegExpExecArray | null;
    while ((match = regexNumeros.exec(t)) !== null) {
        const matchStr = match[0];
        const valor = parseFloat(matchStr.replace(",", "."));
        if (Number.isFinite(valor) && montoPendiente !== undefined && valor !== montoPendiente) {
            // Verificar si este número es parte del nombre o banco de alguna cuenta en la base
            const esNumeroDeCuenta = cuentas?.some(c =>
                c.nombre.toLowerCase().includes(matchStr) ||
                c.banco.toLowerCase().includes(matchStr)
            );
            if (!esNumeroDeCuenta) {
                return true;
            }
        }
    }

    return false;
}

