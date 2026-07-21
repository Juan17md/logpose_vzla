import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditTransactionProvider, useEditTransaction } from "../EditTransactionContext";

function TestConsumer() {
  const { transactionToEdit, startEditing, clearEditing } = useEditTransaction();
  return (
    <div>
      <p data-testid="state">
        {transactionToEdit ? transactionToEdit.description : "null"}
      </p>
      <button
        data-testid="start-editing"
        onClick={() =>
          startEditing({
            id: "123",
            amount: 100,
            type: "gasto",
            category: "comida",
            description: "Test transaction",
            date: new Date("2026-07-21"),
          })
        }
      >
        Start Editing
      </button>
      <button data-testid="clear-editing" onClick={clearEditing}>
        Clear Editing
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <EditTransactionProvider>
      <TestConsumer />
    </EditTransactionProvider>
  );
}

describe("EditTransactionContext", () => {
  it("inicializa con transactionToEdit en null", () => {
    renderWithProvider();
    expect(screen.getByTestId("state")).toHaveTextContent("null");
  });

  it("startEditing establece la transacción a editar", async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId("start-editing"));
    expect(await screen.findByText("Test transaction")).toBeInTheDocument();
  });

  it("clearEditing limpia la transacción a editar", async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId("start-editing"));
    expect(await screen.findByText("Test transaction")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("clear-editing"));
    expect(screen.getByTestId("state")).toHaveTextContent("null");
  });

  it("clearEditing en estado null no causa error", () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId("clear-editing"));
    expect(screen.getByTestId("state")).toHaveTextContent("null");
  });

  it("startEditing reemplaza la transacción anterior", async () => {
    renderWithProvider();

    const btn = screen.getByTestId("start-editing");
    fireEvent.click(btn);
    expect(await screen.findByText("Test transaction")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.getByTestId("state")).toHaveTextContent("Test transaction");
  });
});

describe("useEditTransaction", () => {
  it("lanza error si se usa fuera del provider", () => {
    function BrokenComponent() {
      useEditTransaction();
      return null;
    }

    expect(() => render(<BrokenComponent />)).toThrow(
      "useEditTransaction must be used within an EditTransactionProvider"
    );
  });
});
