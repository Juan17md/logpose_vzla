// ============================================================
// 💸 MOVIMIENTOS — Servicio de dominio "movimiento + saldo"
// ============================================================
// Única implementación del impacto de una transacción sobre el
// saldo de las cuentas (bank_accounts). Consolida la lógica que
// antes estaba duplicada en TransactionsContext, TransactionForm,
// Chatbot y el ajuste manual del dashboard.
//
// Reglas de negocio centralizadas aquí:
//  - Todo movimiento con `accountId` actualiza `bank_accounts.saldo`
//    en la MISMA transacción atómica (runTransaction) que crea el doc.
//  - La conversión a la moneda de la cuenta pasa SIEMPRE por
//    `convertirMontoParaCuenta` (BS ↔ VES ↔ USD ↔ EUR ↔ USDT).
//  - Las transferencias mueven saldo origen → destino (con comisión
//    y tasa manual opcionales).
//  - Borrar / editar revierte el impacto anterior antes de aplicar.

import type { Firestore } from "firebase/firestore";
import {
  collection,
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { convertirMontoParaCuenta } from "@/lib/bankAccounts";

// ─── Tipos ────────────────────────────────────────────────────

export type TipoMovimiento = "ingreso" | "gasto" | "transferencia";

export interface MovimientoData {
  amount: number;
  type: TipoMovimiento;
  category: string;
  subcategory?: string;
  description?: string;
  date?: Date;
  currency?: "USD" | "VES";
  originalAmount?: number;
  exchangeRate?: number;
  accountId?: string;
  targetAccountId?: string;
  period?: string;
}

export interface ComisionMovimiento {
  /** Monto de la comisión en la moneda de la transacción. */
  amount: number;
  currency: "USD" | "VES";
  originalAmount?: number;
  exchangeRate?: number;
  accountId?: string;
  description?: string;
}

export interface OpcionesMovimiento {
  /** Tasas en bolívares para conversión entre monedas no-BS. */
  tasasEnBs?: Record<string, number>;
  /** Si es true, la cuenta origen no puede quedar con saldo negativo. */
  validarSaldoOrigen?: boolean;
  /** Tasa manual de transferencia cuando origen y destino difieren en moneda. */
  tasaCambioDestino?: number;
  /** Comisiones a descontar del saldo de origen y a registrar como movimientos. */
  comisiones?: ComisionMovimiento[];
  /**
   * Ajuste manual de saldo (dashboard): setea el saldo al valor exacto en lugar
   * de sumar un delta. `monedaMovimiento` es la moneda del registro contable
   * (BS → VES, resto → USD), ya que las rules de transactions solo aceptan USD/VES.
   */
  ajusteSaldo?: {
    nuevoSaldo: number;
    monedaMovimiento: "USD" | "VES";
  };
}

export type ResultadoMovimiento =
  | { exito: true; id: string }
  | { exito: false; error: string };

// ─── Conversión pura (compartida por todos los caminos) ──────

function convertirParaCuenta(
  datos: MovimientoData,
  monedaCuenta: string,
  tasasEnBs?: Record<string, number>
): number {
  return convertirMontoParaCuenta(
    datos.amount,
    datos.currency || "USD",
    monedaCuenta as Parameters<typeof convertirMontoParaCuenta>[2],
    datos.exchangeRate,
    datos.originalAmount,
    tasasEnBs
  );
}

/** Delta de saldo para la cuenta ORIGEN (ingreso suma; gasto/transferencia resta). */
function deltaCuentaOrigen(
  datos: MovimientoData,
  monedaCuenta: string,
  tasasEnBs?: Record<string, number>
): number {
  const monto = convertirParaCuenta(datos, monedaCuenta, tasasEnBs);
  return datos.type === "ingreso" ? monto : -monto;
}

/** Delta de saldo para la cuenta DESTINO de una transferencia (siempre suma). */
function deltaCuentaDestino(
  datos: MovimientoData,
  monedaOrigen: string,
  monedaDestino: string,
  tasasEnBs: Record<string, number> | undefined,
  tasaCambioDestino?: number
): number {
  const montoOrigen = convertirParaCuenta(datos, monedaOrigen, tasasEnBs);
  if (monedaOrigen !== monedaDestino && tasaCambioDestino && tasaCambioDestino > 0) {
    return montoOrigen * tasaCambioDestino;
  }
  return convertirParaCuenta(datos, monedaDestino, tasasEnBs);
}

function limpiarUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

function redondearMonto(monto: number): number {
  return Math.round(monto * 100) / 100;
}

// ─── Operaciones atómicas ─────────────────────────────────────

/**
 * Crea un movimiento y aplica su impacto sobre el saldo de la cuenta
 * (y destino en transferencias) en una única transacción atómica.
 * Devuelve el ID generado o un error descriptivo.
 */
export async function crearMovimiento(
  db: Firestore,
  userId: string,
  datos: MovimientoData,
  opciones: OpcionesMovimiento = {}
): Promise<ResultadoMovimiento> {
  try {
    let nuevoId = "";

    await runTransaction(db, async (transaction) => {
      const { accountId, type } = datos;
      const monto = redondearMonto(datos.amount);

      if (accountId) {
        const cuentaRef = doc(db, "users", userId, "bank_accounts", accountId);
        const cuentaDoc = await transaction.get(cuentaRef);
        if (cuentaDoc.exists()) {
          const saldoActual = (cuentaDoc.data().saldo as number) || 0;
          const monedaCuenta = (cuentaDoc.data().moneda as string) || "USD";

          const totalComisiones =
            (opciones.comisiones || []).reduce((suma, c) => {
              const cEnCuenta = convertirParaCuenta(
                {
                  ...datos,
                  amount: c.amount,
                  originalAmount: c.originalAmount,
                  exchangeRate: c.exchangeRate,
                },
                monedaCuenta,
                opciones.tasasEnBs
              );
              return suma + Math.abs(cEnCuenta);
            }, 0);

          let nuevoSaldo: number;
          if (opciones.ajusteSaldo) {
            nuevoSaldo = opciones.ajusteSaldo.nuevoSaldo;
          } else {
            const delta = deltaCuentaOrigen(datos, monedaCuenta, opciones.tasasEnBs);
            nuevoSaldo = saldoActual + delta - totalComisiones;
          }

          if (opciones.validarSaldoOrigen && nuevoSaldo < 0) {
            throw new Error("Saldo insuficiente");
          }

          transaction.update(cuentaRef, {
            saldo: nuevoSaldo,
            actualizadoEn: serverTimestamp(),
          });
        }
      }

      if (type === "transferencia" && datos.targetAccountId && accountId) {
        const cuentaOrigenRef = doc(db, "users", userId, "bank_accounts", accountId);
        const cuentaDestinoRef = doc(db, "users", userId, "bank_accounts", datos.targetAccountId);

        const [cuentaOrigenDoc, cuentaDestinoDoc] = await Promise.all([
          transaction.get(cuentaOrigenRef),
          transaction.get(cuentaDestinoRef),
        ]);

        if (cuentaOrigenDoc.exists() && cuentaDestinoDoc.exists()) {
          const monedaOrigen = (cuentaOrigenDoc.data().moneda as string) || "USD";
          const monedaDestino = (cuentaDestinoDoc.data().moneda as string) || "USD";
          const saldoDestino = (cuentaDestinoDoc.data().saldo as number) || 0;

          const montoDestino = redondearMonto(
            deltaCuentaDestino(
              datos,
              monedaOrigen,
              monedaDestino,
              opciones.tasasEnBs,
              opciones.tasaCambioDestino
            )
          );

          transaction.update(cuentaDestinoRef, {
            saldo: saldoDestino + montoDestino,
            actualizadoEn: serverTimestamp(),
          });
        }
      }

      const newTransRef = doc(collection(db, "transactions"));
      nuevoId = newTransRef.id;
      transaction.set(
        newTransRef,
        limpiarUndefined({
          ...datos,
          amount: monto,
          userId,
          createdAt: serverTimestamp(),
        })
      );

      for (const comision of opciones.comisiones || []) {
        const comisionRef = doc(collection(db, "transactions"));
        transaction.set(
          comisionRef,
          limpiarUndefined({
            userId,
            amount: comision.amount,
            type: "gasto" as const,
            category: "Comisiones",
            subcategory: "",
            description: comision.description || "",
            date: datos.date,
            currency: comision.currency,
            originalAmount: comision.originalAmount,
            exchangeRate: comision.exchangeRate,
            accountId: comision.accountId,
            period: "mensual",
            createdAt: serverTimestamp(),
          })
        );
      }
    });

    return { exito: true, id: nuevoId };
  } catch (error) {
    return {
      exito: false,
      error: (error as Error).message || "Error al registrar el movimiento",
    };
  }
}

/**
 * Elimina un movimiento y revierte su impacto sobre los saldos.
 */
export async function eliminarMovimiento(
  db: Firestore,
  userId: string,
  transaccionId: string
): Promise<ResultadoMovimiento> {
  try {
    await runTransaction(db, async (transaction) => {
      const transRef = doc(db, "transactions", transaccionId);
      const transDoc = await transaction.get(transRef);
      if (!transDoc.exists()) throw new Error("La transacción no existe");

      const transData = transDoc.data() as MovimientoData;
      const { accountId, type } = transData;

      if (accountId) {
        const cuentaRef = doc(db, "users", userId, "bank_accounts", accountId);
        const cuentaDoc = await transaction.get(cuentaRef);
        if (cuentaDoc.exists()) {
          const saldoActual = (cuentaDoc.data().saldo as number) || 0;
          const monedaCuenta = (cuentaDoc.data().moneda as string) || "USD";
          // Reversa: la cuenta tenía aplicado -delta; sumamos delta para deshacer.
          const delta = -deltaCuentaOrigen(transData, monedaCuenta);
          transaction.update(cuentaRef, {
            saldo: saldoActual + delta,
            actualizadoEn: serverTimestamp(),
          });
        }
      }

      if (type === "transferencia" && transData.targetAccountId && accountId) {
        const targetRef = doc(db, "users", userId, "bank_accounts", transData.targetAccountId);
        const targetDoc = await transaction.get(targetRef);
        if (targetDoc.exists()) {
          const saldoActual = (targetDoc.data().saldo as number) || 0;
          const monedaDestino = (targetDoc.data().moneda as string) || "USD";
          const montoDestino = convertirParaCuenta(transData, monedaDestino);
          transaction.update(targetRef, {
            saldo: saldoActual - montoDestino,
            actualizadoEn: serverTimestamp(),
          });
        }
      }

      transaction.delete(transRef);
    });

    return { exito: true, id: transaccionId };
  } catch (error) {
    return {
      exito: false,
      error: (error as Error).message || "Error al eliminar el movimiento",
    };
  }
}

/**
 * Actualiza un movimiento: revierte el impacto anterior (cuentas viejas)
 * y aplica el nuevo (cuentas nuevas), cubriendo cambios de cuenta,
 * tipo, monto, moneda y destino en una única transacción atómica.
 */
export async function actualizarMovimiento(
  db: Firestore,
  userId: string,
  transaccionId: string,
  updates: Partial<MovimientoData>,
  opciones: OpcionesMovimiento = {}
): Promise<ResultadoMovimiento> {
  try {
    await runTransaction(db, async (transaction) => {
      const transRef = doc(db, "transactions", transaccionId);
      const transDoc = await transaction.get(transRef);
      if (!transDoc.exists()) throw new Error("Transacción no encontrada");

      const oldData = transDoc.data() as MovimientoData;
      const cleanUpdates = limpiarUndefined(
        updates as unknown as Record<string, unknown>
      ) as unknown as Partial<MovimientoData>;
      const newData = { ...oldData, ...cleanUpdates };

      const necesitaRecalcular =
        oldData.accountId !== cleanUpdates.accountId ||
        oldData.targetAccountId !== cleanUpdates.targetAccountId ||
        oldData.amount !== cleanUpdates.amount ||
        oldData.type !== cleanUpdates.type ||
        oldData.currency !== cleanUpdates.currency ||
        oldData.exchangeRate !== cleanUpdates.exchangeRate ||
        oldData.originalAmount !== cleanUpdates.originalAmount;

      if (necesitaRecalcular) {
        // 1. Revertir impacto anterior
        if (oldData.accountId) {
          const oldCuentaRef = doc(db, "users", userId, "bank_accounts", oldData.accountId);
          const oldCuentaDoc = await transaction.get(oldCuentaRef);
          if (oldCuentaDoc.exists()) {
            const saldoActual = (oldCuentaDoc.data().saldo as number) || 0;
            const monedaCuenta = (oldCuentaDoc.data().moneda as string) || "USD";
            const delta = -deltaCuentaOrigen(oldData, monedaCuenta, opciones.tasasEnBs);
            transaction.update(oldCuentaRef, {
              saldo: saldoActual + delta,
              actualizadoEn: serverTimestamp(),
            });
          }
        }
        if (oldData.type === "transferencia" && oldData.targetAccountId && oldData.accountId) {
          const oldTargetRef = doc(db, "users", userId, "bank_accounts", oldData.targetAccountId);
          const oldTargetDoc = await transaction.get(oldTargetRef);
          if (oldTargetDoc.exists()) {
            const saldoActual = (oldTargetDoc.data().saldo as number) || 0;
            const monedaDestino = (oldTargetDoc.data().moneda as string) || "USD";
            const montoDestino = convertirParaCuenta(oldData, monedaDestino, opciones.tasasEnBs);
            transaction.update(oldTargetRef, {
              saldo: saldoActual - montoDestino,
              actualizadoEn: serverTimestamp(),
            });
          }
        }

        // 2. Aplicar nuevo impacto
        if (newData.accountId) {
          const newCuentaRef = doc(db, "users", userId, "bank_accounts", newData.accountId);
          const newCuentaDoc = await transaction.get(newCuentaRef);
          if (newCuentaDoc.exists()) {
            const saldoActual = (newCuentaDoc.data().saldo as number) || 0;
            const monedaCuenta = (newCuentaDoc.data().moneda as string) || "USD";
            const delta = deltaCuentaOrigen(newData, monedaCuenta, opciones.tasasEnBs);
            const nuevoSaldo = saldoActual + delta;
            if (opciones.validarSaldoOrigen && nuevoSaldo < 0) {
              throw new Error("Saldo insuficiente");
            }
            transaction.update(newCuentaRef, {
              saldo: nuevoSaldo,
              actualizadoEn: serverTimestamp(),
            });
          }
        }
        if (newData.type === "transferencia" && newData.targetAccountId && newData.accountId) {
          const newTargetRef = doc(db, "users", userId, "bank_accounts", newData.targetAccountId);
          const newTargetDoc = await transaction.get(newTargetRef);
          if (newTargetDoc.exists()) {
            const saldoActual = (newTargetDoc.data().saldo as number) || 0;
            const monedaDestino = (newTargetDoc.data().moneda as string) || "USD";
            const montoDestino = redondearMonto(convertirParaCuenta(newData, monedaDestino, opciones.tasasEnBs));
            transaction.update(newTargetRef, {
              saldo: saldoActual + montoDestino,
              actualizadoEn: serverTimestamp(),
            });
          }
        }
      }

      const updatesFinales = { ...cleanUpdates } as Record<string, unknown>;
      if (newData.type !== "transferencia") {
        // Si el movimiento dejó de ser transferencia, el destino anterior
        // no debe persistir en el documento (evita residuos contables).
        updatesFinales.targetAccountId = deleteField();
      }

      transaction.update(transRef, updatesFinales);
    });

    return { exito: true, id: transaccionId };
  } catch (error) {
    return {
      exito: false,
      error: (error as Error).message || "Error al actualizar el movimiento",
    };
  }
}