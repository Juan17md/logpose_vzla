import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockPush, mockDeleteTransaction, mockDuplicateTransaction, mockStartEditing, mockToastSuccess } = vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockDeleteTransaction: vi.fn(),
    mockDuplicateTransaction: vi.fn(),
    mockStartEditing: vi.fn(),
    mockToastSuccess: vi.fn(),
}));

let mockTransactions: import("@/contexts/TransactionsContext").Transaction[] = [];
let mockLoading = false;

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => "/dashboard",
}));

vi.mock("@/hooks/useTransactions", () => ({
    useTransactions: () => ({
        transactions: mockTransactions,
        loading: mockLoading,
        deleteTransaction: mockDeleteTransaction,
        duplicateTransaction: mockDuplicateTransaction,
    }),
}));

vi.mock("@/contexts/BankAccountsContext", () => ({
    useBankAccounts: () => ({
        obtenerCuenta: (id: string) => {
            if (id === "cta-ves") return { moneda: "BS", nombre: "Banesco" };
            return { moneda: "USD", nombre: "Zelle" };
        },
    }),
}));

vi.mock("@/contexts/EditTransactionContext", () => ({
    useEditTransaction: () => ({
        startEditing: mockStartEditing,
    }),
}));

vi.mock("sonner", () => ({
    toast: {
        success: mockToastSuccess,
        error: vi.fn(),
    },
}));

import RecentTransactions from "@/components/ui/RecentTransactions";

describe("RecentTransactions Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransactions = [];
        mockLoading = false;
        mockDeleteTransaction.mockResolvedValue(true);
        mockDuplicateTransaction.mockResolvedValue(true);
    });

    it("muestra el mensaje de estado vacío cuando no existen transacciones", () => {
        render(<RecentTransactions />);

        expect(screen.getByText("Historial Reciente")).toBeDefined();
        expect(screen.getByText("No se encontraron movimientos.")).toBeDefined();
    });

    it("renderiza la lista de transacciones y formatea correctamente monedas", () => {
        mockTransactions = [
            {
                id: "tx-1",
                type: "ingreso",
                category: "Salario",
                description: "Nómina quincenal",
                date: new Date("2026-08-20T12:00:00Z"),
                amount: 500,
                currency: "USD",
                accountId: "cta-usd",
            },
            {
                id: "tx-2",
                type: "gasto",
                category: "Comida",
                subcategory: "Restaurante",
                description: "Almuerzo",
                date: new Date("2026-08-21T14:00:00Z"),
                amount: 15,
                currency: "VES",
                originalAmount: 750,
                accountId: "cta-ves",
            },
        ];

        render(<RecentTransactions />);

        expect(screen.getAllByText("Salario").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Nómina quincenal").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Comida").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Restaurante/).length).toBeGreaterThanOrEqual(1);
    });

    it("filtra transacciones en tiempo real al escribir en el campo de búsqueda", () => {
        mockTransactions = [
            {
                id: "tx-1",
                type: "ingreso",
                category: "Freelance",
                description: "Proyecto React",
                date: new Date(),
                amount: 300,
                currency: "USD",
            },
            {
                id: "tx-2",
                type: "gasto",
                category: "Transporte",
                description: "Gasolina",
                date: new Date(),
                amount: 20,
                currency: "USD",
            },
        ];

        render(<RecentTransactions />);

        const inputBusqueda = screen.getByPlaceholderText("Buscar...");
        fireEvent.change(inputBusqueda, { target: { value: "React" } });

        expect(screen.getAllByText("Freelance").length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText("Transporte")).toBeNull();
    });

    it("inicia el modo edición y redirige a /dashboard/movimientos", () => {
        const transaccion: import("@/contexts/TransactionsContext").Transaction = {
            id: "tx-edit",
            type: "gasto",
            category: "Servicios",
            description: "Electricidad",
            date: new Date(),
            amount: 40,
            currency: "USD",
        };
        mockTransactions = [transaccion];

        render(<RecentTransactions />);

        const btnEditar = screen.getAllByTitle("Editar")[0];
        fireEvent.click(btnEditar);

        expect(mockStartEditing).toHaveBeenCalledWith(transaccion);
        expect(mockPush).toHaveBeenCalledWith("/dashboard/movimientos");
    });

    it("abre diálogo de confirmación y duplica el movimiento", async () => {
        mockTransactions = [
            {
                id: "tx-dup",
                type: "gasto",
                category: "Comida",
                description: "Café",
                date: new Date(),
                amount: 3,
                currency: "USD",
            },
        ];

        render(<RecentTransactions />);

        const btnDuplicar = screen.getAllByTitle("Duplicar hoy")[0];
        fireEvent.click(btnDuplicar);

        expect(screen.getByText("¿Duplicar Movimiento?")).toBeDefined();

        const btnConfirmar = screen.getByText("Sí, duplicar");
        fireEvent.click(btnConfirmar);

        await waitFor(() => {
            expect(mockDuplicateTransaction).toHaveBeenCalledWith("tx-dup");
            expect(mockToastSuccess).toHaveBeenCalledWith("Movimiento registrado hoy");
        });
    });

    it("abre diálogo de confirmación y elimina el movimiento", async () => {
        mockTransactions = [
            {
                id: "tx-del",
                type: "gasto",
                category: "Ocio",
                description: "Cine",
                date: new Date(),
                amount: 10,
                currency: "USD",
            },
        ];

        render(<RecentTransactions />);

        const btnEliminar = screen.getAllByTitle("Eliminar")[0];
        fireEvent.click(btnEliminar);

        expect(screen.getByText("¿Borrar Movimiento?")).toBeDefined();

        const btnConfirmar = screen.getByText("Sí, borrar");
        fireEvent.click(btnConfirmar);

        await waitFor(() => {
            expect(mockDeleteTransaction).toHaveBeenCalledWith("tx-del");
            expect(mockToastSuccess).toHaveBeenCalledWith("Registro eliminado");
        });
    });
});

