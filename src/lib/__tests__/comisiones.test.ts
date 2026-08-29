import { describe, it, expect } from "vitest";
import { calcularComision } from "../comisiones";

describe("calcularComision (Comisiones Bancarias Venezuela)", () => {
    const tasaCambio = 50.00; // Tasa simplificada de Bs. 50.00 por 1 USD para facilitar las aserciones

    describe("Pago Móvil P2P (0.30%)", () => {
        it("aplica comisión mínima de Bs. 14.00 en bolívares ante montos pequeños (ej. 100 Bs)", () => {
            // 100 * 0.3% = 0.30 Bs (Menor que 14.00 Bs, debe aplicar 14.00 Bs)
            const res = calcularComision(100, "VES", "p2p", tasaCambio);
            expect(res.vesAmount).toBe(14.00);
            expect(res.usdAmount).toBe(0.28); // 14.00 Bs / 50.00
        });

        it("aplica porcentaje de 0.30% en bolívares si es mayor al mínimo (ej. 5000 Bs)", () => {
            // 5000 * 0.3% = 15.00 Bs (Mayor que 14.00 Bs, debe aplicar 15.00 Bs)
            const res = calcularComision(5000, "VES", "p2p", tasaCambio);
            expect(res.vesAmount).toBe(15.00);
            expect(res.usdAmount).toBe(0.30); // 15.00 Bs / 50.00
        });

        it("aplica comisión mínima convertida a USD cuando la transacción es en dólares (ej. $1 USD)", () => {
            // $1 * 50 = 50 Bs. 50 * 0.3% = 0.15 Bs. Debe aplicar mínimo de 14.00 Bs (~$0.28)
            const res = calcularComision(1, "USD", "p2p", tasaCambio);
            expect(res.vesAmount).toBe(14.00);
            expect(res.usdAmount).toBe(0.28);
        });

        it("aplica porcentaje de 0.30% convertido a USD cuando el monto es alto (ej. $500 USD)", () => {
            // $500 * 0.3% = $1.50 USD. En Bs: $1.50 * 50 = 75 Bs. (Mayor que 14.00 Bs)
            const res = calcularComision(500, "USD", "p2p", tasaCambio);
            expect(res.usdAmount).toBe(1.50);
            expect(res.vesAmount).toBe(75.00);
        });
    });

    describe("Pago Móvil P2C (1.50%)", () => {
        it("aplica comisión mínima de Bs. 14.00 ante montos pequeños (ej. 50 Bs)", () => {
            // 50 * 1.5% = 0.75 Bs (Menor que 14.00 Bs, debe aplicar 14.00 Bs)
            const res = calcularComision(50, "VES", "p2c", tasaCambio);
            expect(res.vesAmount).toBe(14.00);
            expect(res.usdAmount).toBe(0.28);
        });

        it("aplica porcentaje de 1.50% si supera el mínimo (ej. 1000 Bs)", () => {
            // 1000 * 1.5% = 15.00 Bs (Mayor que 14.00 Bs, debe aplicar 15.00 Bs)
            const res = calcularComision(1000, "VES", "p2c", tasaCambio);
            expect(res.vesAmount).toBe(15.00);
            expect(res.usdAmount).toBe(0.30); // 15.00 Bs / 50.00
        });
    });

    describe("C2P Vuelto - Comercio a Persona (2.00%)", () => {
        it("aplica comisión mínima de Bs. 14.00 ante montos pequeños (ej. 50 Bs)", () => {
            // 50 * 2.0% = 1.00 Bs (Menor que 14.00 Bs, debe aplicar 14.00 Bs)
            const res = calcularComision(50, "VES", "c2p_vuelto", tasaCambio);
            expect(res.vesAmount).toBe(14.00);
            expect(res.usdAmount).toBe(0.28);
        });

        it("aplica porcentaje de 2.00% si supera el mínimo (ej. 1000 Bs)", () => {
            // 1000 * 2.0% = 20.00 Bs (Mayor que 14.00 Bs, debe aplicar 20.00 Bs)
            const res = calcularComision(1000, "VES", "c2p_vuelto", tasaCambio);
            expect(res.vesAmount).toBe(20.00);
            expect(res.usdAmount).toBe(0.40); // 20.00 Bs / 50.00
        });
    });

    describe("Casos Especiales y Bordes", () => {
        it("retorna 0 para el tipo 'custom'", () => {
            const res = calcularComision(100, "VES", "custom", tasaCambio);
            expect(res.vesAmount).toBe(0);
            expect(res.usdAmount).toBe(0);
        });

        it("retorna 0 para montos menores o iguales a cero", () => {
            const res = calcularComision(0, "VES", "p2p", tasaCambio);
            expect(res.vesAmount).toBe(0);
            expect(res.usdAmount).toBe(0);
        });
    });
});
