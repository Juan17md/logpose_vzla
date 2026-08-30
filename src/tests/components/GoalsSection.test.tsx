import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockAddDoc, mockDeleteDoc, mockRunTransaction, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
    mockAddDoc: vi.fn(),
    mockDeleteDoc: vi.fn(),
    mockRunTransaction: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
}));

let currentDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
let snapshotListener: ((snapshot: { docs: typeof currentDocs }) => void) | null = null;

vi.mock("@/lib/firebase", () => ({
    db: { _type: "fake-db" },
}));

vi.mock("sonner", () => ({
    toast: {
        success: mockToastSuccess,
        error: mockToastError,
    },
}));

vi.mock("firebase/firestore", () => ({
    collection: vi.fn((_db, ...parts) => parts.join("/")),
    doc: vi.fn((_db, ...parts) => ({ path: parts.join("/"), id: parts[parts.length - 1] })),
    query: vi.fn((col) => ({ path: col })),
    orderBy: vi.fn(),
    serverTimestamp: () => new Date(),
    onSnapshot: vi.fn((_q, cb) => {
        snapshotListener = cb;
        cb({ docs: currentDocs });
        return () => {};
    }),
    addDoc: mockAddDoc,
    deleteDoc: mockDeleteDoc,
    runTransaction: mockRunTransaction,
}));

import GoalsSection from "@/components/savings/GoalsSection";

describe("GoalsSection Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentDocs = [];
        snapshotListener = null;
    });

    it("renderiza el título y botón para agregar meta", () => {
        render(<GoalsSection userId="user-123" />);

        expect(screen.getByText("Metas de Ahorro")).toBeDefined();
        expect(screen.getByText("Nueva Meta")).toBeDefined();
    });

    it("muestra el estado vacío 'Crear primera meta' cuando no hay metas registradas", () => {
        currentDocs = [];
        render(<GoalsSection userId="user-123" />);

        expect(screen.getByText("Crear primera meta")).toBeDefined();
    });

    it("renderiza las metas de ahorro con su cálculo de progreso", () => {
        currentDocs = [
            {
                id: "meta-1",
                data: () => ({
                    name: "Fondo de Emergencia",
                    targetAmount: 1000,
                    currentAmount: 250,
                    color: "#10b981",
                }),
            },
        ];

        render(<GoalsSection userId="user-123" />);

        expect(screen.getByText("Fondo de Emergencia")).toBeDefined();
        expect(screen.getByText("25.0%")).toBeDefined();
        expect(screen.getByText("Agregar Ahorro")).toBeDefined();
    });

    it("permite abrir el modal y crear una nueva meta con decimales normalizados", async () => {
        mockAddDoc.mockResolvedValueOnce({ id: "meta-nueva" });

        render(<GoalsSection userId="user-123" />);

        // Abrir modal de nueva meta
        const btnNuevaMeta = screen.getByText("Nueva Meta");
        fireEvent.click(btnNuevaMeta);

        expect(screen.getByText("Nueva Meta de Ahorro")).toBeDefined();

        // Completar formulario
        const inputNombre = screen.getByPlaceholderText("Ej. Viaje, Auto nuevo...");
        const inputMonto = screen.getByPlaceholderText("0.00");

        fireEvent.change(inputNombre, { target: { value: "Viaje a Margarita" } });
        fireEvent.change(inputMonto, { target: { value: "500,50" } });

        const btnCrear = screen.getByText("Crear Meta");
        fireEvent.click(btnCrear);

        await waitFor(() => {
            expect(mockAddDoc).toHaveBeenCalledWith(
                "users/user-123/saving_goals",
                expect.objectContaining({
                    name: "Viaje a Margarita",
                    targetAmount: 500.5,
                    currentAmount: 0,
                })
            );
            expect(mockToastSuccess).toHaveBeenCalledWith("Meta creada exitosamente");
        });
    });

    it("abre diálogo y elimina la meta al confirmar", async () => {
        mockDeleteDoc.mockResolvedValueOnce(undefined);

        currentDocs = [
            {
                id: "meta-borrar-1",
                data: () => ({
                    name: "Meta Antigua",
                    targetAmount: 200,
                    currentAmount: 50,
                    color: "#10b981",
                }),
            },
        ];

        render(<GoalsSection userId="user-123" />);

        // Click en botón eliminar dentro de la tarjeta
        const botones = screen.getAllByRole("button");
        // El botón de basurero es el que está en la tarjeta
        const btnTrash = botones.find(b => b.className.includes("text-slate-400 hover:text-red-400"));
        expect(btnTrash).toBeDefined();
        fireEvent.click(btnTrash!);

        // Confirmar eliminación en el diálogo
        const btnEliminarConfirm = screen.getByText("Eliminar");
        fireEvent.click(btnEliminarConfirm);

        await waitFor(() => {
            expect(mockDeleteDoc).toHaveBeenCalledWith(
                expect.objectContaining({ path: "users/user-123/saving_goals/meta-borrar-1" })
            );
            expect(mockToastSuccess).toHaveBeenCalledWith("Meta eliminada");
        });
    });

    it("permite agregar progreso atómicamente a una meta mediante runTransaction", async () => {
        mockRunTransaction.mockImplementationOnce(async (_db, callback) => {
            const fakeTx = {
                get: vi.fn().mockResolvedValue({
                    data: () => ({ currentAmount: 100 }),
                }),
                update: vi.fn(),
            };
            await callback(fakeTx);
        });

        currentDocs = [
            {
                id: "meta-ahorro-1",
                data: () => ({
                    name: "Comprar Laptop",
                    targetAmount: 1200,
                    currentAmount: 100,
                    color: "#10b981",
                }),
            },
        ];

        render(<GoalsSection userId="user-123" />);

        // Abrir modal de progreso
        const btnAgregarAhorro = screen.getByText("Agregar Ahorro");
        fireEvent.click(btnAgregarAhorro);

        expect(screen.getByText("Ahorrar para Comprar Laptop")).toBeDefined();

        // Ingresar monto de aporte
        const inputMonto = screen.getByPlaceholderText("0.00");
        fireEvent.change(inputMonto, { target: { value: "150,00" } });

        // Enviar formulario del modal
        const btnSubmitAporte = screen.getAllByText("Agregar Ahorro")[1];
        fireEvent.click(btnSubmitAporte);

        await waitFor(() => {
            expect(mockRunTransaction).toHaveBeenCalled();
            expect(mockToastSuccess).toHaveBeenCalledWith("¡+$150 agregados!");
        });
    });
});

