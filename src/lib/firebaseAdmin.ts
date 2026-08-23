import 'server-only';

const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

let cachedToken: { token: string; exp: number } | null = null;

async function obtenerAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) {
    return cachedToken.token;
  }

  const { GoogleAuth } = await import("google-auth-library");
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT no está configurado");

  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: [SCOPE],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token?.token) throw new Error("No se pudo obtener token de acceso");

  const exp = token.res?.data?.expires_in
    ? Math.floor(Date.now() / 1000) + token.res.data.expires_in - 60
    : Math.floor(Date.now() / 1000) + 3540;

  cachedToken = { token: token.token, exp };
  return token.token;
}

async function requestFirestore(
  method: string,
  path: string,
  body?: unknown
) {
  const token = await obtenerAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore API error (${res.status}): ${text}`);
  }

  if (method === "DELETE") return null;
  return res.json();
}

type FirestoreValue = Record<string, unknown>;

function docToObject(doc: FirestoreValue): FirestoreValue {
  const obj: FirestoreValue = {};
  if (!doc.fields || typeof doc.fields !== 'object') return obj;
  for (const [key, val] of Object.entries(doc.fields)) {
    const v = val as FirestoreValue;
    if (v.stringValue !== undefined) obj[key] = v.stringValue;
    else if (v.integerValue !== undefined) obj[key] = parseInt(v.integerValue as string, 10);
    else if (v.doubleValue !== undefined) obj[key] = v.doubleValue;
    else if (v.booleanValue !== undefined) obj[key] = v.booleanValue;
    else if (v.timestampValue) obj[key] = v.timestampValue;
    else if (v.nullValue !== undefined) obj[key] = null;
    else obj[key] = v;
  }
  return obj;
}

function jsonToFields(obj: FirestoreValue): FirestoreValue {
  const fields: FirestoreValue = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
    }
  }
  return fields;
}

export async function leerUsuario(uid: string) {
  try {
    const data = await requestFirestore("GET", `/users/${uid}`);
    return docToObject(data);
  } catch (e) {
    console.error(`Error leyendo usuario ${uid}:`, e);
    return null;
  }
}

export async function listarUsuarios(maxResultados: number = 500) {
  const token = await obtenerAccessToken();
  const docs: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore API error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      documents?: Array<{ name: string; fields?: Record<string, unknown> }>;
      nextPageToken?: string;
    };

    for (const doc of data.documents || []) {
      const obj = docToObject(doc);
      obj.uid = doc.name.split("/").pop();
      docs.push(obj);
      if (docs.length >= maxResultados) break;
    }

    pageToken = data.nextPageToken;
  } while (pageToken && docs.length < maxResultados);

  return docs;
}

export async function actualizarUsuario(
  uid: string,
  updates: Record<string, unknown>
) {
  const fields = jsonToFields(updates);
  const mask = Object.keys(updates)
    .map((k) => `updateMask.fieldPaths=${k}`)
    .join("&");

  const token = await obtenerAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?${mask}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore API error (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Crea una transacción en la colección raíz `transactions` con ID autogenerado.
 * Devuelve el ID del documento creado. El POST a la colección sin `documentId`
 * hace que Firestore genere un ID aleatorio.
 */
export async function crearTransaccionFirestore(
  datos: Record<string, unknown>
): Promise<string> {
  const data = await requestFirestore("POST", "/transactions", {
    fields: jsonToFields(datos),
  });
  const nombre = (data as { name?: string })?.name ?? "";
  return nombre.split("/").pop() ?? "";
}

type ResultadoRunQuery = Array<{
  document?: { name: string };
  done?: { transaction?: string };
}>;

/**
 * Ejecuta un runQuery con paginación completa. La API REST de Firestore devuelve
 * un token de transacción en el último mensaje (`done.transaction`) cuando hay
 * más resultados; se repite la consulta pasándolo como cursor hasta agotar.
 * Devuelve los nombres completos de los documentos encontrados.
 */
async function ejecutarRunQueryPaginated(
  path: string,
  query: Record<string, unknown>
): Promise<string[]> {
  const nombres: string[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { structuredQuery: query };
    if (cursor) body.transaction = cursor;

    const data = (await requestFirestore(
      "POST",
      path,
      body
    )) as ResultadoRunQuery;
    cursor = undefined;

    for (const resultado of data || []) {
      if (resultado.document?.name) nombres.push(resultado.document.name);
      if (resultado.done?.transaction) cursor = resultado.done.transaction;
    }
  } while (cursor);

  return nombres;
}

async function borrarDocumentos(nombres: string[]): Promise<void> {
  for (const docPath of nombres) {
    const encodedPath = docPath.replace(
      `projects/${PROJECT_ID}/databases/(default)/documents/`,
      ""
    );
    await requestFirestore("DELETE", `/${encodedPath}`);
  }
}

/**
 * Elimina todos los documentos de una subcolección `users/{uid}/{coleccion}`.
 * El parent del runQuery es el documento del usuario (`/users/{uid}:runQuery`),
 * no la colección: la API espera el ancestro + `from.collectionId`.
 * Tras borrar, re-consulta y lanza si quedó algún documento (PII / ARCO).
 */
export async function eliminarColeccion(
  uid: string,
  coleccion: string
): Promise<void> {
  const path = `/users/${uid}:runQuery`;
  const query = {
    from: [{ collectionId: coleccion }],
    select: { fields: [{ fieldPath: "__name__" }] },
  };

  const nombres = await ejecutarRunQueryPaginated(path, query);
  await borrarDocumentos(nombres);

  const restantes = await ejecutarRunQueryPaginated(path, query);
  if (restantes.length > 0) {
    throw new Error(
      `Quedaron ${restantes.length} documentos en "${coleccion}" del usuario ${uid}`
    );
  }
}

/**
 * Elimina documentos de una colección raíz filtrando por un campo.
 * El parent del runQuery es la raíz (`/documents:runQuery`) con `from.collectionId`.
 */
export async function eliminarDocumentosWhere(
  coleccion: string,
  campo: string,
  valor: string
): Promise<void> {
  const path = ":runQuery";
  const query = {
    from: [{ collectionId: coleccion }],
    where: {
      fieldFilter: {
        field: { fieldPath: campo },
        op: "EQUAL",
        value: { stringValue: valor },
      },
    },
    select: { fields: [{ fieldPath: "__name__" }] },
  };

  const nombres = await ejecutarRunQueryPaginated(path, query);
  await borrarDocumentos(nombres);

  const restantes = await ejecutarRunQueryPaginated(path, query);
  if (restantes.length > 0) {
    throw new Error(`Quedaron ${restantes.length} documentos en "${coleccion}"`);
  }
}

export async function eliminarUsuarioDoc(uid: string): Promise<void> {
  await requestFirestore("DELETE", `/users/${uid}`);
}

export async function actualizarAuthUser(
  uid: string,
  updates: { password?: string }
): Promise<void> {
  const token = await obtenerAccessToken();
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { localId: uid };
  if (updates.password) body.password = updates.password;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Identity Toolkit error (${res.status}): ${text}`);
  }
}

export async function eliminarAuthUser(uid: string): Promise<void> {
  const token = await obtenerAccessToken();
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ localId: uid }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Identity Toolkit error al eliminar auth user (${res.status}): ${text}`);
  }
}

export async function crearLog(
  data: Record<string, unknown>
): Promise<void> {
  await requestFirestore("POST", `/admin_logs`, {
    fields: jsonToFields({
      ...data,
      timestamp: new Date().toISOString(),
    }),
  });
}

export async function listarLogs(): Promise<Array<Record<string, unknown>>> {
  const token = await obtenerAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_logs?orderBy=timestamp%20desc&pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const docs: Array<Record<string, unknown>> = [];
  for (const doc of data.documents || []) {
    const obj = docToObject(doc);
    obj.id = doc.name.split("/").pop();
    docs.push(obj);
  }
  return docs;
}

export async function obtenerCuentaFirestore(
  userId: string,
  accountId: string
): Promise<Record<string, unknown> | null> {
  try {
    const data = await requestFirestore(
      "GET",
      `/users/${userId}/bank_accounts/${accountId}`
    );
    return docToObject(data);
  } catch {
    return null;
  }
}

/** Vista mínima de una cuenta para listados (atajo iOS / simulador). */
export interface CuentaResumen {
  id: string;
  nombre: string;
  banco: string;
  moneda: string;
  saldo: number;
}

/**
 * Lista las cuentas ACTIVAS del usuario ordenadas por creación (mismo criterio
 * que el listener de la app). Sin orderBy en el structuredQuery a propósito:
 * así no depende del índice compuesto activa+creadoEn en ningún proyecto;
 * el orden se aplica en memoria sobre creadoEn.
 */
export async function listarCuentasActivasFirestore(
  userId: string
): Promise<CuentaResumen[]> {
  const data = (await requestFirestore("POST", `/users/${userId}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: "bank_accounts" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "activa" },
          op: "EQUAL",
          value: { booleanValue: true },
        },
      },
    },
  })) as Array<{
    document?: { name: string; fields?: Record<string, unknown> };
  }>;

  const cuentas: (CuentaResumen & { _creadoEn: string })[] = [];
  for (const resultado of data || []) {
    if (!resultado.document?.name) continue;
    const id = resultado.document.name.split("/").pop() as string;
    const campos = docToObject(resultado.document);
    cuentas.push({
      id,
      nombre: String(campos.nombre ?? ""),
      banco: String(campos.banco ?? ""),
      moneda: String(campos.moneda ?? "USD"),
      saldo: Number(campos.saldo ?? 0),
      _creadoEn: String(campos.creadoEn ?? ""),
    });
  }

  cuentas.sort((a, b) => a._creadoEn.localeCompare(b._creadoEn));
  return cuentas.map(({ _creadoEn, ...cuenta }) => cuenta);
}

/** Categoría del usuario para listados del atajo/simulador. */
export interface CategoriaResumen {
  nombre: string;
  tipo: string;
  subcategorias: string[];
}

/**
 * Lista TODAS las categorías del usuario (el consumidor filtra por tipo).
 * Orden por nombre ascendente igual que el listener de la app (índice simple,
 * sin compuestos). subcategorias llega como arrayValue REST y se aplana.
 */
export async function listarCategoriasFirestore(
  userId: string
): Promise<CategoriaResumen[]> {
  const data = (await requestFirestore("POST", `/users/${userId}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: "categories" }],
      orderBy: [
        { field: { fieldPath: "nombre" }, direction: "ASCENDING" },
      ],
    },
  })) as Array<{
    document?: { name: string; fields?: Record<string, unknown> };
  }>;

  const categorias: CategoriaResumen[] = [];
  for (const resultado of data || []) {
    if (!resultado.document?.name) continue;
    const campos = docToObject(resultado.document);
    const bruto = campos.subcategorias as
      | { arrayValue?: { values?: Array<{ stringValue?: string }> } }
      | undefined;
    const subcategorias = Array.isArray(bruto)
      ? (bruto as string[])
      : (bruto?.arrayValue?.values ?? [])
          .map((valor) => valor.stringValue ?? "")
          .filter(Boolean);

    categorias.push({
      nombre: String(campos.nombre ?? ""),
      tipo: String(campos.tipo ?? "gasto"),
      subcategorias,
    });
  }
  return categorias;
}

/**
 * Genera un ID de documento aleatorio compatible con Firestore (20 caracteres
 * alfanuméricos). Replica el formato de los IDs autogenerados del SDK.
 */
export function generarNuevoDocId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** Alias interno para no romper usos existentes dentro del módulo. */
function generarDocId(): string {
  return generarNuevoDocId();
}

/**
 * Crea una transacción y actualiza el saldo de una cuenta bancaria en una
 * sola operación atómica (:commit). Si la cuenta no existe, toda la operación
 * falla y no se crea la transacción (precondición `exists: true`).
 *
 * Resuelve T8 (accountId persistido) y T9 (atomicidad) del plan de corrección.
 */
export async function crearTransaccionConSaldoAtomico(
  datos: Record<string, unknown>,
  userId: string,
  accountId: string,
  delta: number
): Promise<string> {
  const docId = generarDocId();
  const transName = `projects/${PROJECT_ID}/databases/(default)/documents/transactions/${docId}`;
  const accountName = `projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/bank_accounts/${accountId}`;

  await requestFirestore("POST", ":commit", {
    writes: [
      {
        update: {
          name: transName,
          fields: jsonToFields(datos),
        },
        currentDocument: { exists: false },
      },
      {
        update: {
          name: accountName,
        },
        updateTransforms: [
          { fieldPath: "saldo", increment: { doubleValue: delta } },
        ],
        currentDocument: { exists: true },
      },
    ],
  });

  return docId;
}

/**
 * Aplica un delta al saldo de una cuenta bancaria de forma atómica
 * (increment server-side con la API :commit de Firestore, sin condición de
 * carrera). El delta se expresa en la misma moneda de la cuenta.
 */
export async function incrementarSaldoCuenta(
  userId: string,
  accountId: string,
  delta: number
): Promise<void> {
  await requestFirestore("POST", ":commit", {
    writes: [
      {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/bank_accounts/${accountId}`,
        },
        updateTransforms: [
          { fieldPath: "saldo", increment: { doubleValue: delta } },
        ],
        currentDocument: { exists: true },
      },
    ],
  });
}

// ─── Commit atómico genérico (transferencias + comisiones del atajo) ───

/** Escritura individual dentro de un commit atómico multi-documento. */
export type EscrituraAtomica =
  | {
      clase: "doc";
      /** Ruta relativa tras `documents/`, ej. "transactions" o "users/{uid}/transactions". */
      coleccion: string;
      datos: Record<string, unknown>;
      /** Opcional: ID pre-generado para poder vincular documentos entre sí. */
      docId?: string;
    }
  | { clase: "saldo"; userId: string; accountId: string; delta: number };

/**
 * Ejecuta N escrituras en UN solo `POST :commit` de la API REST de Firestore:
 * creación de documentos (`clase: "doc"`) e increments de saldo
 * (`clase: "saldo"`). Si cualquier escritura falla, NINGUNA se aplica.
 *
 * Soportado por el plan de corrección T9/T12: transferencias y comisiones del
 * atajo requieren tocar transacción + dos saldos (+ documento de comisión)
 * sin dejar estados a medias.
 */
export async function ejecutarCommitAtomico(
  escrituras: EscrituraAtomica[]
): Promise<string[]> {
  const docIds: string[] = [];

  const writes = escrituras.map((escritura) => {
    if (escritura.clase === "saldo") {
      return {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${escritura.userId}/bank_accounts/${escritura.accountId}`,
        },
        updateTransforms: [
          {
            fieldPath: "saldo",
            increment: { doubleValue: escritura.delta },
          },
        ],
        currentDocument: { exists: true },
      };
    }

    const docId = escritura.docId ?? generarDocId();
    docIds.push(docId);
    return {
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/${escritura.coleccion}/${docId}`,
        fields: jsonToFields(escritura.datos),
      },
      currentDocument: { exists: false } as { exists: boolean },
    };
  });

  await requestFirestore("POST", ":commit", { writes });
  return docIds;
}
