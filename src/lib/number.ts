export function parseNumeroFlexible(valor: string | number | null | undefined): number {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
    if (valor == null) return NaN;

    const texto = String(valor).trim();
    if (!texto) return NaN;

    // Soporta formatos: 1234.56, 1234,56, 1.234,56
    const normalizado = texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto;

    const numero = Number.parseFloat(normalizado);
    return Number.isFinite(numero) ? numero : NaN;
}
