/**
 * Utilidades de zona horaria para Venezuela (UTC-4 / America/Caracas).
 *
 * Firestore almacena timestamps en UTC de forma nativa.
 * La estrategia correcta es guardar `new Date()` (timestamp UTC absoluto)
 * y delegar la conversión de zona horaria a la capa de presentación
 * mediante `toLocaleString("es-VE", { timeZone: "America/Caracas" })`.
 */

export function createVenezuelaDate(): Date {
    return new Date();
}
