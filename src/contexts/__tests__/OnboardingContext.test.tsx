import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingProvider, useOnboarding } from "../OnboardingContext";

function TestConsumer() {
  const {
    pasoActual, totalPasos, perfil, cuentas, metas, deudas, gastosFijos, finalizando,
    siguientePaso, pasoAnterior, irAlPaso,
    guardarPerfil, agregarCuenta, eliminarCuenta,
    agregarMeta, eliminarMeta, agregarDeuda, eliminarDeuda,
    agregarGastoFijo, eliminarGastoFijo, setFinalizando, reiniciarOnboarding,
  } = useOnboarding();

  return (
    <div>
      <p data-testid="paso-actual">{pasoActual}</p>
      <p data-testid="total-pasos">{totalPasos}</p>
      <p data-testid="perfil">{perfil ? "set" : "null"}</p>
      <p data-testid="cuentas-count">{cuentas.length}</p>
      <p data-testid="metas-count">{metas.length}</p>
      <p data-testid="deudas-count">{deudas.length}</p>
      <p data-testid="gastos-count">{gastosFijos.length}</p>
      <p data-testid="finalizando">{finalizando ? "true" : "false"}</p>
      <button data-testid="siguiente" onClick={siguientePaso}>Siguiente</button>
      <button data-testid="anterior" onClick={pasoAnterior}>Anterior</button>
      <button data-testid="ir-al-paso-3" onClick={() => irAlPaso(3)}>Ir al paso 3</button>
      <button data-testid="ir-al-paso-0" onClick={() => irAlPaso(0)}>Ir al paso 0</button>
      <button data-testid="ir-al-paso-99" onClick={() => irAlPaso(99)}>Ir al paso 99</button>
      <button
        data-testid="guardar-perfil"
        onClick={() => guardarPerfil({ monthlySalary: 1000, monthlyBudget: 500, monedaBase: "USD", savingsPhysical: 200, savingsUSDT: 100 })}
      >
        Guardar Perfil
      </button>
      <button
        data-testid="agregar-cuenta"
        onClick={() => agregarCuenta({ nombre: "Banco Test", banco: "test", moneda: "USD", saldoInicial: 1000 })}
      >
        Agregar Cuenta
      </button>
      <button data-testid="eliminar-cuenta" onClick={() => eliminarCuenta(0)}>Eliminar Cuenta</button>
      <button
        data-testid="agregar-meta"
        onClick={() => agregarMeta({ name: "Viaje", targetAmount: 5000, currentAmount: 1000 })}
      >
        Agregar Meta
      </button>
      <button data-testid="eliminar-meta" onClick={() => eliminarMeta(0)}>Eliminar Meta</button>
      <button
        data-testid="agregar-deuda"
        onClick={() => agregarDeuda({ personName: "Juan", type: "por_pagar", amount: 300, currency: "USD" })}
      >
        Agregar Deuda
      </button>
      <button data-testid="eliminar-deuda" onClick={() => eliminarDeuda(0)}>Eliminar Deuda</button>
      <button
        data-testid="agregar-gasto"
        onClick={() => agregarGastoFijo({ title: "Netflix", amount: 15, currency: "USD", category: "entretenimiento", dueDay: 15 })}
      >
        Agregar Gasto Fijo
      </button>
      <button data-testid="eliminar-gasto" onClick={() => eliminarGastoFijo(0)}>Eliminar Gasto Fijo</button>
      <button data-testid="finalizar" onClick={() => setFinalizando(true)}>Finalizar</button>
      <button data-testid="reiniciar" onClick={reiniciarOnboarding}>Reiniciar</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <TestConsumer />
    </OnboardingProvider>
  );
}

describe("OnboardingContext", () => {
  it("inicializa en paso 1 con datos vacíos", () => {
    renderWithProvider();
    expect(screen.getByTestId("paso-actual")).toHaveTextContent("1");
    expect(screen.getByTestId("total-pasos")).toHaveTextContent("6");
    expect(screen.getByTestId("perfil")).toHaveTextContent("null");
    expect(screen.getByTestId("cuentas-count")).toHaveTextContent("0");
    expect(screen.getByTestId("metas-count")).toHaveTextContent("0");
    expect(screen.getByTestId("deudas-count")).toHaveTextContent("0");
    expect(screen.getByTestId("gastos-count")).toHaveTextContent("0");
    expect(screen.getByTestId("finalizando")).toHaveTextContent("false");
  });

  describe("navegación", () => {
    it("siguientePaso avanza al paso 2", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("siguiente"));
      expect(await screen.findByTestId("paso-actual")).toHaveTextContent("2");
    });

    it("siguientePaso no supera el paso 6", async () => {
      renderWithProvider();
      const btn = screen.getByTestId("siguiente");
      for (let i = 0; i < 10; i++) fireEvent.click(btn);
      expect(await screen.findByTestId("paso-actual")).toHaveTextContent("6");
    });

    it("pasoAnterior retrocede", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("siguiente"));
      fireEvent.click(screen.getByTestId("siguiente"));
      expect(await screen.findByTestId("paso-actual")).toHaveTextContent("3");
      fireEvent.click(screen.getByTestId("anterior"));
      expect(screen.getByTestId("paso-actual")).toHaveTextContent("2");
    });

    it("pasoAnterior no baja de 1", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("anterior"));
      expect(screen.getByTestId("paso-actual")).toHaveTextContent("1");
    });

    it("irAlPaso navega a un paso válido", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("ir-al-paso-3"));
      expect(await screen.findByTestId("paso-actual")).toHaveTextContent("3");
    });

    it("irAlPaso ignora pasos fuera de rango (menor a 1)", () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("ir-al-paso-0"));
      expect(screen.getByTestId("paso-actual")).toHaveTextContent("1");
    });

    it("irAlPaso ignora pasos fuera de rango (mayor a 6)", () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("ir-al-paso-99"));
      expect(screen.getByTestId("paso-actual")).toHaveTextContent("1");
    });
  });

  describe("perfil financiero", () => {
    it("guardarPerfil almacena el perfil", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("guardar-perfil"));
      expect(await screen.findByTestId("perfil")).toHaveTextContent("set");
    });

    it("guardarPerfil reemplaza el perfil anterior", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("guardar-perfil"));
      fireEvent.click(screen.getByTestId("guardar-perfil"));
      expect(await screen.findByTestId("perfil")).toHaveTextContent("set");
    });
  });

  describe("cuentas bancarias", () => {
    it("agregarCuenta añade una cuenta", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-cuenta"));
      expect(await screen.findByTestId("cuentas-count")).toHaveTextContent("1");
    });

    it("agregarCuenta acumula múltiples cuentas", async () => {
      renderWithProvider();
      const btn = screen.getByTestId("agregar-cuenta");
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(await screen.findByTestId("cuentas-count")).toHaveTextContent("3");
    });

    it("eliminarCuenta remueve una cuenta por índice", async () => {
      renderWithProvider();
      const btnAgregar = screen.getByTestId("agregar-cuenta");
      fireEvent.click(btnAgregar);
      fireEvent.click(btnAgregar);
      expect(await screen.findByTestId("cuentas-count")).toHaveTextContent("2");
      fireEvent.click(screen.getByTestId("eliminar-cuenta"));
      expect(screen.getByTestId("cuentas-count")).toHaveTextContent("1");
    });

    it("eliminarCuenta no falla con lista vacía", () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("eliminar-cuenta"));
      expect(screen.getByTestId("cuentas-count")).toHaveTextContent("0");
    });
  });

  describe("metas de ahorro", () => {
    it("agregarMeta añade una meta", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-meta"));
      expect(await screen.findByTestId("metas-count")).toHaveTextContent("1");
    });

    it("eliminarMeta remueve una meta", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-meta"));
      fireEvent.click(screen.getByTestId("agregar-meta"));
      fireEvent.click(screen.getByTestId("eliminar-meta"));
      expect(await screen.findByTestId("metas-count")).toHaveTextContent("1");
    });
  });

  describe("deudas", () => {
    it("agregarDeuda añade una deuda", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-deuda"));
      expect(await screen.findByTestId("deudas-count")).toHaveTextContent("1");
    });

    it("eliminarDeuda remueve una deuda", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-deuda"));
      fireEvent.click(screen.getByTestId("agregar-deuda"));
      fireEvent.click(screen.getByTestId("eliminar-deuda"));
      expect(await screen.findByTestId("deudas-count")).toHaveTextContent("1");
    });
  });

  describe("gastos fijos", () => {
    it("agregarGastoFijo añade un gasto fijo", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-gasto"));
      expect(await screen.findByTestId("gastos-count")).toHaveTextContent("1");
    });

    it("eliminarGastoFijo remueve un gasto fijo", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("agregar-gasto"));
      fireEvent.click(screen.getByTestId("agregar-gasto"));
      fireEvent.click(screen.getByTestId("eliminar-gasto"));
      expect(await screen.findByTestId("gastos-count")).toHaveTextContent("1");
    });
  });

  describe("finalizando", () => {
    it("setFinalizando cambia el estado", async () => {
      renderWithProvider();
      expect(screen.getByTestId("finalizando")).toHaveTextContent("false");
      fireEvent.click(screen.getByTestId("finalizar"));
      expect(await screen.findByTestId("finalizando")).toHaveTextContent("true");
    });
  });

  describe("reiniciarOnboarding", () => {
    it("reinicia todo el estado a valores iniciales", async () => {
      renderWithProvider();
      fireEvent.click(screen.getByTestId("siguiente"));
      fireEvent.click(screen.getByTestId("guardar-perfil"));
      fireEvent.click(screen.getByTestId("agregar-cuenta"));
      fireEvent.click(screen.getByTestId("agregar-meta"));
      fireEvent.click(screen.getByTestId("agregar-deuda"));
      fireEvent.click(screen.getByTestId("agregar-gasto"));
      fireEvent.click(screen.getByTestId("finalizar"));

      expect(await screen.findByTestId("paso-actual")).toHaveTextContent("2");
      expect(screen.getByTestId("perfil")).toHaveTextContent("set");
      expect(screen.getByTestId("cuentas-count")).toHaveTextContent("1");
      expect(screen.getByTestId("finalizando")).toHaveTextContent("true");

      fireEvent.click(screen.getByTestId("reiniciar"));

      expect(screen.getByTestId("paso-actual")).toHaveTextContent("1");
      expect(screen.getByTestId("perfil")).toHaveTextContent("null");
      expect(screen.getByTestId("cuentas-count")).toHaveTextContent("0");
      expect(screen.getByTestId("metas-count")).toHaveTextContent("0");
      expect(screen.getByTestId("deudas-count")).toHaveTextContent("0");
      expect(screen.getByTestId("gastos-count")).toHaveTextContent("0");
      expect(screen.getByTestId("finalizando")).toHaveTextContent("false");
    });
  });
});

describe("useOnboarding", () => {
  it("lanza error si se usa fuera del provider", () => {
    function BrokenComponent() {
      useOnboarding();
      return null;
    }

    expect(() => render(<BrokenComponent />)).toThrow(
      "useOnboarding debe usarse dentro de OnboardingProvider"
    );
  });
});
