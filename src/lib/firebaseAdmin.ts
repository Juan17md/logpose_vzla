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

export async function listarUsuarios() {
  const token = await obtenerAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?pageSize=100`;
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
    obj.uid = doc.name.split("/").pop();
    docs.push(obj);
  }
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

export async function eliminarColeccion(
  uid: string,
  coleccion: string
): Promise<void> {
  const data = await requestFirestore(
    "POST",
    `/users/${uid}/${coleccion}:runQuery`,
    {
      structuredQuery: {
        from: [{ collectionId: coleccion }],
        select: { fields: [{ fieldPath: "__name__" }] },
      },
    }
  );

  for (const result of data || []) {
    if (result.document) {
      const docPath = result.document.name;
      const encodedPath = docPath
        .replace(
          `projects/${PROJECT_ID}/databases/(default)/documents/`,
          ""
        );
      await requestFirestore("DELETE", `/${encodedPath}`);
    }
  }
}

export async function eliminarDocumentosWhere(
  coleccion: string,
  campo: string,
  valor: string
): Promise<void> {
  const data = await requestFirestore(
    "POST",
    `/${coleccion}:runQuery`,
    {
      structuredQuery: {
        from: [{ collectionId: coleccion }],
        where: {
          fieldFilter: {
            field: { fieldPath: campo },
            op: "EQUAL",
            value: { stringValue: valor },
          },
        },
      },
    }
  );

  for (const result of data || []) {
    if (result.document) {
      const docPath = result.document.name;
      const encodedPath = docPath
        .replace(
          `projects/${PROJECT_ID}/databases/(default)/documents/`,
          ""
        );
      await requestFirestore("DELETE", `/${encodedPath}`);
    }
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

  const body: Record<string, unknown> = { localId: uid };
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
    console.error("Error eliminando auth user:", text);
  }
}

export async function leerUsuarioConToken(
  uid: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return docToObject(data);
}
