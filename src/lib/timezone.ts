/**
 * Utility functions para manejar fechas y horas en la zona horaria de Venezuela
 * Venezuela Time Zone: UTC-4 (VET)
 * Estado Lara, Venezuela: UTC-4
 */

/**
 * Obtiene la fecha y hora actual en la zona horaria de Venezuela (UTC-4)
 * @returns Date object con la hora local de Venezuela
 */
export function getVenezuelaDate(): Date {
    // Crear fecha actual
    const now = new Date();

    // Obtener timestamp UTC
    const utcTime = now.getTime();

    // Venezuela está en UTC-4 (4 horas detrás de UTC)
    const venezuelaOffset = -4 * 60 * 60 * 1000; // -4 horas en milisegundos

    // Calcular la hora de Venezuela
    const venezuelaTime = new Date(utcTime + venezuelaOffset);

    return venezuelaTime;
}

/**
 * Convierte una fecha cualquiera a la zona horaria de Venezuela
 * @param date Fecha a convertir
 * @returns Date object ajustado a la zona horaria de Venezuela
 */
export function toVenezuelaTime(date: Date): Date {
    const utcTime = date.getTime();
    const venezuelaOffset = -4 * 60 * 60 * 1000;
    return new Date(utcTime + venezuelaOffset);
}

/**
 * Formatea una fecha en la zona horaria de Venezuela
 * @param date Fecha a formatear
 * @returns String con la fecha formateada
 */
export function formatVenezuelaDate(date: Date): string {
    const venezuelaDate = toVenezuelaTime(date);

    // Formatear en formato local de Venezuela
    return venezuelaDate.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * Obtiene la hora actual de Venezuela en formato legible
 * @returns String con la hora actual de Venezuela
 */
export function getCurrentVenezuelaTime(): string {
    const now = new Date();

    return now.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * Crea un objeto Date que representa la fecha/hora actual de Venezuela
 * Esta función ajusta correctamente la zona horaria
 */
export function createVenezuelaDate(): Date {
    // Usar la API de Intl para obtener la fecha actual en Venezuela
    const venezuelaTimeString = getCurrentVenezuelaTime();

    // Parsear y retornar como Date
    // Formato: DD/MM/YYYY, HH:mm:ss
    const [datePart, timePart] = venezuelaTimeString.split(', ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    // Crear fecha ajustada (month - 1 porque Date usa índice 0)
    return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
    );
}
