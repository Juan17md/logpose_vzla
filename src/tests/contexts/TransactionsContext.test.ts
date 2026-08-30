import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import React from "react";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockCrearMovimiento, mockActualizarMovimiento, mockEliminarMovimiento, fakeCurrentUser } = vi.hoisted(() => ({
    mockCrearMovimiento: vi.fn(),
    mockActualizarMovimiento: vi.fn(),
    mockEliminarMovimiento: vi.fn(),
    fakeCurrentUser: { uid: "user-tx-test-999" },
}));

vi.mock("@/lib/movimientos", () => ({
    crearMovimiento: mockCrearMovimiento,
    actualizarMovimiento: mockActualizarMovimiento,
    eliminarMovimiento: mockEliminarMovimiento,
}));

vi.mock("@/lib/timezone", () => ({
    createVenezuelaDate: () => new Date("2026-08-29T12:00:00Z"),
}));

let authCallback: ((user: { uid: string } | null) => void) | null = null;
let snapshotCallback: ((snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void) | null = null;
let snapshotErrorCallback: ((error: Error) => void) | null = null;

vi.mock("@/lib/firebase", () => ({
    db: { _type: "fake-db" },
    auth: { currentUser: fakeCurrentUser },
}));

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((_auth, cb) => {
        authCallback = cb;
        return () => {};
    }),
}));

vi.mock("firebase/firestore", () => {
    class FakeTimestamp {
        private date: Date;
        constructor(date: Date) {
            this.date = date;
        }
        toDate() {
            return this.date;
        }
    }

    return {
        collection: vi.fn((_db, ...parts) => parts.join("/")),
        query: vi.fn((col, ..._clauses) => ({ path: col })),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        onSnapshot: vi.fn((_q, onNext, onError) => {
            snapshotCallback = onNext;
            snapshotErrorCallback = onError;
            return () => {};
        }),
        Timestamp: FakeTimestamp,
    };
});

import { TransactionsProvider, useTransactions, Transaction } from "@/contexts/TransactionsContext";

describe("TransactionsContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authCallback = null;
        snapshotCallback = null;
        snapshotErrorCallback = null;
        mockCrearMovimiento.mockResolvedValue({ exito: true, id: "tx-creada-1" });
        mockActualizarMovimiento.mockResolvedValue({ exito: true });
        mockEliminarMovimiento.mockResolvedValue({ exito: true });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(TransactionsProvider, null, children);

    it("lanza un error explicativo si se invoca useTransactions fuera del Provider", () => {
        expect(() => renderHook(() => useTransactions())).toThrow(
            "useTransactions must be used within a TransactionsProvider"
        );
    });

    it("carga y mapea transacciones del usuario autenticado", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });

        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        const fechaMock = new Date("2026-08-20T15:00:00Z");

        await act(async () => {
            snapshotCallback?.({
                docs: [
                    {
                        id: "tx-1",
                        data: () => ({
                            amount: 100,
                            type: "gasto",
                            category: "Comida",
                            description: "Supermercado",
                            date: new Timestamp(fechaMock),
                            currency: "USD",
                            accountId: "cuenta-1",
                        }),
                    },
                ],
            });
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.transactions).toHaveLength(1);
        expect(result.current.transactions[0]).toEqual({
            id: "tx-1",
            amount: 100,
            type: "gasto",
            category: "Comida",
            description: "Supermercado",
            date: fechaMock,
            currency: "USD",
            accountId: "cuenta-1",
        });
    });

    it("delega addTransaction a crearMovimiento y retorna el ID generado", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        const nuevoMovimiento: Omit<Transaction, "id"> = {
            amount: 50,
            type: "ingreso",
            category: "Freelance",
            description: "Diseño Web",
            date: new Date(),
            currency: "USD",
            accountId: "cuenta-1",
        };

        let nuevoId: string | null = null;
        await act(async () => {
            nuevoId = await result.current.addTransaction(nuevoMovimiento);
        });

        expect(nuevoId).toBe("tx-creada-1");
        expect(mockCrearMovimiento).toHaveBeenCalledWith(
            { _type: "fake-db" },
            "user-tx-test-999",
            nuevoMovimiento
        );
    });

    it("retorna null si addTransaction falla en el servicio de movimientos", async () => {
        mockCrearMovimiento.mockResolvedValue({ exito: false, error: "Error de saldo" });
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        let nuevoId: string | null = null;
        await act(async () => {
            nuevoId = await result.current.addTransaction({
                amount: 500,
                type: "gasto",
                category: "Comida",
                description: "Cena",
                date: new Date(),
            });
        });

        expect(nuevoId).toBeNull();
    });

    it("delega updateTransaction a actualizarMovimiento y retorna true en caso de éxito", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        let exito = false;
        await act(async () => {
            exito = await result.current.updateTransaction("tx-1", {
                amount: 120,
                description: "Supermercado corregido",
            });
        });

        expect(exito).toBe(true);
        expect(mockActualizarMovimiento).toHaveBeenCalledWith(
            { _type: "fake-db" },
            "user-tx-test-999",
            "tx-1",
            { amount: 120, description: "Supermercado corregido" }
        );
    });

    it("delega deleteTransaction a eliminarMovimiento", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        let exito = false;
        await act(async () => {
            exito = await result.current.deleteTransaction("tx-1");
        });

        expect(exito).toBe(true);
        expect(mockEliminarMovimiento).toHaveBeenCalledWith(
            { _type: "fake-db" },
            "user-tx-test-999",
            "tx-1"
        );
    });

    it("duplicateTransaction clona el movimiento con la fecha actual venezolana", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        // Poblamos las transacciones
        await act(async () => {
            snapshotCallback?.({
                docs: [
                    {
                        id: "tx-original-1",
                        data: () => ({
                            amount: 85,
                            type: "gasto",
                            category: "Servicios",
                            description: "Internet Fibra",
                            date: new Timestamp(new Date("2026-07-01T10:00:00Z")),
                            currency: "USD",
                            accountId: "cuenta-zelle",
                        }),
                    },
                ],
            });
        });

        let duplicadoExitoso = false;
        await act(async () => {
            duplicadoExitoso = await result.current.duplicateTransaction("tx-original-1");
        });

        expect(duplicadoExitoso).toBe(true);
        expect(mockCrearMovimiento).toHaveBeenCalledWith(
            { _type: "fake-db" },
            "user-tx-test-999",
            {
                amount: 85,
                type: "gasto",
                category: "Servicios",
                description: "Internet Fibra",
                currency: "USD",
                accountId: "cuenta-zelle",
                date: new Date("2026-08-29T12:00:00Z"),
            }
        );
    });

    it("duplicateTransaction retorna false si la transacción origen no existe", async () => {
        const { result } = renderHook(() => useTransactions(), { wrapper });
        await act(async () => {
            authCallback?.(fakeCurrentUser);
        });

        await act(async () => {
            snapshotCallback?.({ docs: [] });
        });

        let duplicadoExitoso = false;
        await act(async () => {
            duplicadoExitoso = await result.current.duplicateTransaction("tx-inexistente");
        });

        expect(duplicadoExitoso).toBe(false);
        expect(mockCrearMovimiento).not.toHaveBeenCalled();
    });
});

