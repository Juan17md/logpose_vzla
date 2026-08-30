import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";

// ─── Mocks ───────────────────────────────────────────────────────────────────

let authCallback: ((user: { uid: string } | null) => void) | null = null;
let snapshotCallback: ((snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void) | null = null;
let snapshotErrorCallback: ((error: Error) => void) | null = null;
const unsubscribeSnapshotMock = vi.fn();
const unsubscribeAuthMock = vi.fn();

vi.mock("@/lib/firebase", () => ({
    db: { _type: "fake-firestore" },
    auth: { currentUser: null },
}));

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((_auth, cb) => {
        authCallback = cb;
        return unsubscribeAuthMock;
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
        orderBy: vi.fn((field, direction) => ({ field, direction })),
        onSnapshot: vi.fn((_q, onNext, onError) => {
            snapshotCallback = onNext;
            snapshotErrorCallback = onError;
            return unsubscribeSnapshotMock;
        }),
        Timestamp: FakeTimestamp,
    };
});

import { useSavingsTransactions } from "@/hooks/useSavingsTransactions";

describe("useSavingsTransactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authCallback = null;
        snapshotCallback = null;
        snapshotErrorCallback = null;
    });

    it("inicializa con lista vacía y loading en true antes de resolver auth", () => {
        const { result } = renderHook(() => useSavingsTransactions());
        expect(result.current.savingsTransactions).toEqual([]);
        expect(result.current.loadingSavings).toBe(true);
    });

    it("establece loading en false y lista vacía si el usuario no está autenticado", async () => {
        const { result } = renderHook(() => useSavingsTransactions());

        await act(async () => {
            authCallback?.(null);
        });

        expect(result.current.savingsTransactions).toEqual([]);
        expect(result.current.loadingSavings).toBe(false);
    });

    it("se suscribe y mapea transacciones de ahorro cuando el usuario está autenticado", async () => {
        const { result } = renderHook(() => useSavingsTransactions());

        await act(async () => {
            authCallback?.({ uid: "usuario-ahorros-123" });
        });

        const fechaPrueba = new Date("2026-08-15T10:00:00Z");

        await act(async () => {
            snapshotCallback?.({
                docs: [
                    {
                        id: "tx-ahorro-1",
                        data: () => ({
                            amount: 150,
                            type: "deposit",
                            method: "usdt",
                            description: "Aporte mensual",
                            date: new Timestamp(fechaPrueba),
                        }),
                    },
                    {
                        id: "tx-ahorro-2",
                        data: () => ({
                            amount: 50,
                            type: "withdrawal",
                            method: "physical",
                            description: "Retiro emergencia",
                            date: "2026-08-10T15:30:00Z",
                        }),
                    },
                ],
            });
        });

        expect(result.current.loadingSavings).toBe(false);
        expect(result.current.savingsTransactions).toHaveLength(2);

        const primera = result.current.savingsTransactions[0];
        expect(primera.id).toBe("tx-ahorro-1");
        expect(primera.amount).toBe(150);
        expect(primera.type).toBe("deposit");
        expect(primera.method).toBe("usdt");
        expect(primera.date).toEqual(fechaPrueba);

        const segunda = result.current.savingsTransactions[1];
        expect(segunda.id).toBe("tx-ahorro-2");
        expect(segunda.amount).toBe(50);
        expect(segunda.type).toBe("withdrawal");
        expect(segunda.method).toBe("physical");
        expect(segunda.date.toISOString()).toBe("2026-08-10T15:30:00.000Z");
    });

    it("maneja errores de consulta en Firestore desactivando loading", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { result } = renderHook(() => useSavingsTransactions());

        await act(async () => {
            authCallback?.({ uid: "usuario-error" });
        });

        await act(async () => {
            snapshotErrorCallback?.(new Error("Error de permisos en Firestore"));
        });

        expect(result.current.loadingSavings).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith("Error fetching savings transactions:", expect.any(Error));
        consoleSpy.mockRestore();
    });

    it("limpia el listener de snapshot y auth al desmontar el componente", async () => {
        const { unmount } = renderHook(() => useSavingsTransactions());

        await act(async () => {
            authCallback?.({ uid: "usuario-cleanup" });
        });

        unmount();

        expect(unsubscribeAuthMock).toHaveBeenCalled();
        expect(unsubscribeSnapshotMock).toHaveBeenCalled();
    });
});

