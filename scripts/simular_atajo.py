#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
simular_atajo.py — Simulador del Atajo de iOS para LogPose VZLA

Replica EXACTAMENTE la petición que envía la app Atajos (Shortcuts) de iOS
al endpoint POST /api/shortcuts/transaction, pidiendo todos los datos por
terminal y validando localmente contra el mismo esquema Zod del servidor.

Campos soportados:
  - tipo: ingreso | gasto | transferencia
  - cuenta origen (accountId)
  - cuenta destino (targetAccountId, solo transferencias)
  - monto, moneda (USD/VES), comisión opcional
  - categoría (menú según tipo; transferencia usa "Transferencias" automática)
  - subcategoría opcional y descripción opcional

Uso:
  python3 scripts/simular_atajo.py              # interactivo contra dev
  python3 scripts/simular_atajo.py --dry-run    # valida y muestra JSON sin enviar
  python3 scripts/simular_atajo.py --entorno prod
  python3 scripts/simular_atajo.py --entorno local   # http://localhost:3000

Token (en orden de prioridad):
  1. Variable de entorno SHORTCUTS_API_TOKEN
  2. Campo SHORTCUTS_API_TOKEN en .env.local del proyecto
  3. Entrada oculta por terminal (getpass)

Sin dependencias externas: solo biblioteca estándar.
"""

import argparse
import getpass
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ─── Configuración ──────────────────────────────────────────────────────────

URL_DEV = "https://logpose-vzla-dev.vercel.app"
URL_PROD = "https://logpose-vzla.vercel.app"
URL_LOCAL = "http://localhost:3000"
RUTA = "/api/shortcuts/transaction"
TIMEOUT_SEGUNDOS = 30
VENTANA_HORARIA = timezone(timedelta(hours=-4))  # Venezuela (VET)

CATEGORIAS_INGRESO = ["Salario", "Freelance"]
CATEGORIAS_GASTO = [
    "Comida", "Hogar", "Transporte", "Servicios", "Salud", "Educación",
    "Entretenimiento", "Mascotas", "Regalos", "Ropa", "Seguros", "Belleza",
    "Deudas", "Inversiones", "Otra",
]
MONTO_MAXIMO = 999_999_999

COMISIONES_REFERENCIA = (
    "  Referencia LogPose (sobre el monto):\n"
    "    Pago Móvil P2P ....... 0.30 %\n"
    "    Pago Móvil P2C ....... 1.50 %\n"
    "    Transferencia Interbancaria ... 0.30 %\n"
    "  (déjalo vacío si no aplica comisión)"
)

# ─── Presentación ───────────────────────────────────────────────────────────


class C:
    """Colores ANSI (se desactivan si la salida no es una TTY)."""
    SI = sys.stdout.isatty()
    VERDE = "\033[92m" if SI else ""
    ROJO = "\033[91m" if SI else ""
    AMBAR = "\033[93m" if SI else ""
    AZUL = "\033[96m" if SI else ""
    GRIS = "\033[90m" if SI else ""
    NEGRITA = "\033[1m" if SI else ""
    FIN = "\033[0m" if SI else ""


def titulo(texto: str) -> None:
    print(f"\n{C.NEGRITA}{C.AZUL}━━ {texto}{C.FIN}")


def error_salir(mensaje: str) -> None:
    print(f"{C.ROJO}✗ {mensaje}{C.FIN}")
    sys.exit(1)


def ok(mensaje: str) -> None:
    print(f"{C.VERDE}✓ {mensaje}{C.FIN}")


def advertencia(mensaje: str) -> None:
    print(f"{C.AMBAR}⚠ {mensaje}{C.FIN}")


# ─── Entrada validada por terminal ──────────────────────────────────────────


def pedir_opcion(mensaje: str, opciones: list[str], defecto: str | None = None) -> str:
    print(f"{mensaje}")
    for i, opcion in enumerate(opciones, start=1):
        marca = f" {C.GRIS}(defecto){C.FIN}" if opcion == defecto else ""
        print(f"  {i}) {opcion}{marca}")
    while True:
        bruto = input(f"  Opción [1-{len(opciones)}]{f' o Enter={defecto}' if defecto else ''}: ").strip()
        if not bruto and defecto:
            return defecto
        if bruto.isdigit() and 1 <= int(bruto) <= len(opciones):
            return opciones[int(bruto) - 1]
        if bruto.lower() in (o.lower() for o in opciones):
            return next(o for o in opciones if o.lower() == bruto.lower())
        print(f"  {C.ROJO}Opción inválida, intenta de nuevo.{C.FIN}")


def pedir_texto(
    mensaje: str,
    obligatorio: bool = False,
    maximo: int | None = None,
    etiqueta_campo: str = "",
) -> str | None:
    sufijo = f" {C.GRIS}(máx. {maximo} caracteres){C.FIN}" if maximo else ""
    while True:
        valor = input(f"  {mensaje}{sufijo}: ").strip()
        if not valor:
            if obligatorio:
                print(f"  {C.ROJO}El campo '{etiqueta_campo or mensaje}' es obligatorio.{C.FIN}")
                continue
            return None
        if maximo and len(valor) > maximo:
            print(f"  {C.ROJO}Supera {maximo} caracteres ({len(valor)}).{C.FIN}")
            continue
        return valor


def pedir_monto() -> float:
    while True:
        bruto = input("  Monto (> 0): ").strip().replace(" ", "")
        normalizado = bruto.replace(",", ".")
        if not re.fullmatch(r"\d+(\.\d{1,2})?", normalizado):
            print(f"  {C.ROJO}Formato inválido. Ejemplos válidos: 250 / 12,50 / 1299.99{C.FIN}")
            continue
        valor = float(normalizado)
        if valor <= 0:
            print(f"  {C.ROJO}Debe ser mayor que cero.{C.FIN}")
            continue
        if valor > MONTO_MAXIMO:
            print(f"  {C.ROJO}Máximo permitido: {MONTO_MAXIMO:,}{C.FIN}")
            continue
        return round(valor, 2)


def pedir_comision(moneda: str) -> float | None:
    print(COMISIONES_REFERENCIA)
    while True:
        bruto = input("  Comisión (Enter = sin comisión): ").strip().replace(",", ".")
        if not bruto:
            return None
        if not re.fullmatch(r"\d+(\.\d{1,2})?", bruto):
            print(f"  {C.ROJO}Formato inválido. Ejemplo: 0.75{C.FIN}")
            continue
        valor = float(bruto)
        if valor <= 0:
            print(f"  {C.ROJO}Si incluyes comisión debe ser mayor que cero.{C.FIN}")
            continue
        if valor >= MONTO_MAXIMO:
            print(f"  {C.ROJO}Valor demasiado grande.{C.FIN}")
            continue
        print(f"  {C.GRIS}→ Se enviará como monto explícito en {moneda}. El servidor lo registra como gasto 'Comisiones'.{C.FIN}")
        return round(valor, 2)


def pedir_fecha() -> str | None:
    bruto = input(
        f"  Fecha ISO 8601 {C.GRIS}(ej. 2026-08-22T14:30:00-04:00 · Enter = ahora){C.FIN}: "
    ).strip()
    if not bruto:
        ahora = datetime.now(VENTANA_HORARIA).isoformat(timespec="seconds")
        print(f"  {C.GRIS}→ Usando {ahora}{C.FIN}")
        return ahora
    try:
        datetime.fromisoformat(bruto.replace("Z", "+00:00"))
    except ValueError:
        error_salir("Fecha inválida. Usa formato ISO 8601.")
    return bruto


def pedir_identificador(mensaje: str) -> str:
    while True:
        valor = input(f"  {mensaje}: ").strip()
        if not valor:
            print(f"  {C.ROJO}Obligatorio.{C.FIN}")
            continue
        if len(valor) > 50:
            print(f"  {C.ROJO}Máximo 50 caracteres.{C.FIN}")
            continue
        return valor


# ─── Token y entorno ────────────────────────────────────────────────────────


def leer_token_de_env_local() -> str | None:
    ruta = Path(__file__).resolve().parent.parent / ".env.local"
    if not ruta.exists():
        return None
    patron = re.compile(r"^SHORTCUTS_API_TOKEN\s*=\s*[\"']?([^\"'\n]+)", re.MULTILINE)
    coincidencia = patron.search(ruta.read_text(encoding="utf-8"))
    return coincidencia.group(1).strip() if coincidencia else None


def obtener_token(opcional: bool = False) -> str | None:
    token = os.environ.get("SHORTCUTS_API_TOKEN") or leer_token_de_env_local()
    if token:
        origen = "variable de entorno" if os.environ.get("SHORTCUTS_API_TOKEN") else ".env.local"
        ok(f"Token cargado desde {origen}.")
        return token
    if opcional:
        advertencia("Sin SHORTCUTS_API_TOKEN: no se podrán listar cuentas.")
        return None
    advertencia("No se encontró SHORTCUTS_API_TOKEN en el entorno ni en .env.local.")
    token = getpass.getpass("  Pega el token (entrada oculta): ").strip()
    if not token:
        error_salir("Sin token no se puede autenticar la petición.")
    return token


def listar_cuentas(url_base: str, token: str) -> list[dict] | None:
    """GET /api/shortcuts/accounts. Devuelve None si falla (para usar fallback manual)."""
    try:
        peticion = urllib.request.Request(
            url_base + "/api/shortcuts/accounts",
            headers={"Authorization": f"Bearer {token}"},
            method="GET",
        )
        with urllib.request.urlopen(peticion, timeout=TIMEOUT_SEGUNDOS) as respuesta:
            cuerpo = json.loads(respuesta.read().decode("utf-8"))
            return cuerpo.get("cuentas", [])
    except urllib.error.HTTPError as excepcion:
        advertencia(f"No se pudieron listar cuentas (HTTP {excepcion.code}).")
        return None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        advertencia("No se pudo contactar el endpoint de cuentas.")
        return None


def elegir_cuenta(cuentas: list[dict], mensaje: str, excluir_id: str | None = None) -> str:
    """Menú numerado de cuentas reales; opción 0 = entrada manual del ID."""
    visibles = [c for c in cuentas if c["id"] != excluir_id] if excluir_id else cuentas
    if visibles:
        print(f"{mensaje}")
        for i, cuenta in enumerate(visibles, start=1):
            print(
                f"  {i}) {cuenta['nombre']} · {cuenta['banco'] or '—'} · "
                f"{cuenta['moneda']} · saldo {cuenta['saldo']:,.2f}"
            )
        print(f"  0) Ingresar ID manualmente")
        while True:
            bruto = input(f"  Opción [0-{len(visibles)}]: ").strip()
            if bruto == "0":
                return pedir_identificador("ID de la cuenta")
            if bruto.isdigit() and 1 <= int(bruto) <= len(visibles):
                elegida = visibles[int(bruto) - 1]
                print(f"  {C.GRIS}→ {elegida['id']}{C.FIN}")
                return elegida["id"]
            print(f"  {C.ROJO}Opción inválida.{C.FIN}")
    return pedir_identificador(mensaje.replace("(elige una)", "").strip() + " (accountId)")


def elegir_url(entorno: str) -> str:
    if entorno == "dev":
        return URL_DEV
    if entorno == "prod":
        return URL_PROD
    if entorno == "local":
        return URL_LOCAL
    return entorno.rstrip("/")


# ─── Validación local (espejo del esquema Zod) ──────────────────────────────


def validar_carga(carga: dict) -> list[str]:
    errores: list[str] = []

    if carga["monto"] <= 0:
        errores.append("El monto debe ser mayor que cero.")
    if carga["monto"] > MONTO_MAXIMO:
        errores.append("El monto es demasiado grande.")
    if carga["tipo"] not in ("ingreso", "gasto", "transferencia"):
        errores.append('El tipo debe ser "ingreso", "gasto" o "transferencia".')
    if carga["currency"] not in ("USD", "VES"):
        errores.append('La moneda debe ser "USD" o "VES".')

    categorias_validas = {
        "ingreso": CATEGORIAS_INGRESO,
        "gasto": CATEGORIAS_GASTO,
        "transferencia": ["Transferencias"],
    }[carga["tipo"]]
    if carga["categoria"] not in categorias_validas:
        errores.append(
            f'La categoría "{carga["categoria"]}" no es válida para un {carga["tipo"]}. '
            f"Permitidas: {', '.join(categorias_validas)}."
        )

    for campo, limite in (("categoria", 50), ("subcategoria", 50), ("descripcion", 200)):
        if carga.get(campo) and len(carga[campo]) > limite:
            errores.append(f"'{campo}' supera {limite} caracteres.")

    for campo in ("accountId", "targetAccountId"):
        if carga.get(campo) and not (1 <= len(carga[campo]) <= 50):
            errores.append(f"'{campo}' debe tener entre 1 y 50 caracteres.")

    if carga["tipo"] == "transferencia":
        if not carga.get("targetAccountId"):
            errores.append("Una transferencia requiere targetAccountId.")
        elif carga.get("accountId") == carga.get("targetAccountId"):
            errores.append("La cuenta origen y destino deben ser distintas.")

    if carga.get("comision") is not None and carga["comision"] <= 0:
        errores.append("La comisión debe ser mayor que cero.")

    return errores


# ─── Envío ──────────────────────────────────────────────────────────────────


def enviar(url_base: str, token: str, carga: dict) -> tuple[int, dict]:
    peticion = urllib.request.Request(
        url_base + RUTA,
        data=json.dumps(carga, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=TIMEOUT_SEGUNDOS) as respuesta:
            return respuesta.status, json.loads(respuesta.read().decode("utf-8"))
    except urllib.error.HTTPError as excepcion:
        cuerpo = excepcion.read().decode("utf-8", errors="replace")
        try:
            return excepcion.code, json.loads(cuerpo)
        except json.JSONDecodeError:
            return excepcion.code, {"error": cuerpo}


# ─── Flujo principal ────────────────────────────────────────────────────────


def main() -> None:
    analizador = argparse.ArgumentParser(description="Simulador del Atajo de iOS para LogPose VZLA")
    analizador.add_argument("--dry-run", action="store_true", help="Valida y muestra el JSON sin enviarlo")
    analizador.add_argument("--entorno", choices=["dev", "prod", "local"], default="dev")
    argumentos = analizador.parse_args()

    print(f"{C.NEGRITA}📱 Simulador de Atajo iOS — LogPose VZLA{C.FIN}")

    url_base = elegir_url(argumentos.entorno)
    ok(f"Entorno: {argumentos.entorno} → {url_base + RUTA}")

    token = obtener_token(opcional=argumentos.dry_run)

    titulo("Cuentas disponibles")
    cuentas = listar_cuentas(url_base, token) if token else None

    tipo = pedir_opcion("Tipo de movimiento:", ["ingreso", "gasto", "transferencia"]).lower()
    if cuentas:
        cuenta_origen = elegir_cuenta(cuentas, "Cuenta ORIGEN (la que realiza el movimiento):")
    else:
        cuenta_origen = pedir_identificador("ID de la cuenta ORIGEN (accountId)")
    cuenta_destino = None
    if tipo == "transferencia":
        while True:
            if cuentas:
                cuenta_destino = elegir_cuenta(
                    cuentas, "Cuenta DESTINO (donde llega el dinero):", excluir_id=cuenta_origen
                )
            else:
                cuenta_destino = pedir_identificador("ID de la cuenta DESTINO (targetAccountId)")
            if cuenta_destino != cuenta_origen:
                break
            print(f"  {C.ROJO}La cuenta destino debe ser distinta a la origen.{C.FIN}")

    titulo("Monto y moneda")
    monto = pedir_monto()
    moneda = pedir_opcion("Moneda del movimiento:", ["USD", "VES"], defecto="USD")

    comision = None
    if tipo in ("gasto", "transferencia"):
        comision = pedir_comision(moneda)

    titulo("Clasificación")
    if tipo == "transferencia":
        categoria = "Transferencias"
        ok('Las transferencias usan automáticamente la categoría "Transferencias".')
    else:
        opciones = CATEGORIAS_INGRESO if tipo == "ingreso" else CATEGORIAS_GASTO
        categoria = pedir_opcion(f"Categoría ({tipo}):", opciones)

    subcategoria = pedir_texto(
        "Subcategoría (opcional)", obligatorio=False, maximo=50, etiqueta_campo="subcategoria"
    )
    descripcion = pedir_texto(
        "Descripción breve (opcional)", obligatorio=False, maximo=200, etiqueta_campo="descripcion"
    )

    titulo("Fecha")
    fecha = pedir_fecha()

    carga: dict = {
        "monto": monto,
        "tipo": tipo,
        "categoria": categoria,
        "currency": moneda,
    }
    if cuenta_origen:
        carga["accountId"] = cuenta_origen
    if cuenta_destino:
        carga["targetAccountId"] = cuenta_destino
    if subcategoria:
        carga["subcategoria"] = subcategoria
    if descripcion:
        carga["descripcion"] = descripcion
    if comision is not None:
        carga["comision"] = comision
    if fecha:
        carga["fecha"] = fecha

    titulo("Carga útil (JSON)")
    print(json.dumps(carga, indent=2, ensure_ascii=False))

    errores = validar_carga(carga)
    if errores:
        for detalle in errores:
            error_salir(detalle)
    ok("Validación local superada (espejo del esquema Zod del servidor).")

    if argumentos.dry_run:
        print(f"\n{C.AMBAR}--dry-run activo: no se envió ninguna petición.{C.FIN}")
        return

    confirmacion = input(f"\n¿Enviar al servidor? [{C.VERDE}s{C.FIN}/n]: ").strip().lower()
    if confirmacion and confirmacion != "s":
        print("Cancelado por el usuario.")
        return

    if not token:
        token = obtener_token()

    print(f"\n{C.GRIS}Enviando…{C.FIN}")
    codigo, cuerpo = enviar(url_base, token, carga)

    if codigo == 200 and cuerpo.get("success"):
        transaccion = cuerpo["transaccion"]
        print(f"\n{C.VERDE}{C.NEGRITA}✓ Movimiento registrado correctamente (HTTP 200){C.FIN}")
        print(f"  ID           : {transaccion['id']}")
        print(f"  Tipo         : {transaccion['tipo']}")
        print(f"  Monto        : {transaccion['monto']} {transaccion['currency']}")
        print(f"  Categoría    : {transaccion['categoria']}")
        if transaccion.get("subcategoria") or transaccion.get("subcategory"):
            print(f"  Subcategoría : {transaccion.get('subcategoria') or transaccion.get('subcategory')}")
        if transaccion.get("descripcion"):
            print(f"  Descripción  : {transaccion['descripcion']}")
        print(f"  Fecha        : {transaccion['fecha']}")
        if transaccion.get("accountId"):
            print(f"  Cuenta origen : {transaccion['accountId']}")
        if transaccion.get("targetAccountId"):
            print(f"  Cuenta destino: {transaccion['targetAccountId']}")
        if comision is not None:
            print(f"  Comisión     : {comision} {moneda} (documento aparte categoría 'Comisiones')")
    elif codigo == 401:
        error_salir("Token no autorizado (HTTP 401). Revisa SHORTCUTS_API_TOKEN.")
    elif codigo == 429:
        error_salir("Límite de solicitudes alcanzado (HTTP 429). Espera un minuto.")
    elif codigo == 400:
        error_salir(f"Datos inválidos (HTTP 400): {cuerpo.get('error')}")
    else:
        error_salir(f"Error HTTP {codigo}: {cuerpo.get('error', cuerpo)}")


if __name__ == "__main__":
    main()
