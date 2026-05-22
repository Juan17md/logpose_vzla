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
