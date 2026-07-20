const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

function getServiceAccount(): Record<string, string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT no está configurado");
  return JSON.parse(raw);
}

let cachedToken: { token: string; exp: number } | null = null;

async function obtenerAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) {
    return cachedToken.token;
  }

  const sa = getServiceAccount();
  const { client_email, private_key } = sa;

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: client_email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  function base64url(data: string) {
    return Buffer.from(data)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  const { createPrivateKey } = await import("node:crypto");
  const { sign } = await import("node:crypto");

  const payload = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;

  const key = createPrivateKey(private_key);
  const sig = sign("RSA-SHA256", Buffer.from(payload), key);
  const jwt = `${payload}.${base64url(sig.toString("base64"))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("No se pudo obtener token de acceso");

  cachedToken = { token: data.access_token, exp: now + data.expires_in - 60 };
  return data.access_token;
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

function docToObject(doc: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  if (!doc.fields) return obj;
  for (const [key, val] of Object.entries(doc.fields)) {
    const v = val as Record<string, any>;
    if (v.stringValue !== undefined) obj[key] = v.stringValue;
    else if (v.integerValue !== undefined) obj[key] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) obj[key] = v.doubleValue;
    else if (v.booleanValue !== undefined) obj[key] = v.booleanValue;
    else if (v.timestampValue) obj[key] = v.timestampValue;
    else if (v.nullValue !== undefined) obj[key] = null;
    else obj[key] = v;
  }
  return obj;
}

function jsonToFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
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
  } catch {
    return null;
  }
}

export async function listarUsuarios() {
  const data = await requestFirestore(
    "POST",
    "/users:runQuery",
    {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }
  );

  const docs: Array<Record<string, any>> = [];
  for (const result of data || []) {
    if (result.document) {
      const obj = docToObject(result.document);
      obj.uid = result.document.name.split("/").pop();
      docs.push(obj);
    }
  }
  return docs;
}

export async function actualizarUsuario(
  uid: string,
  updates: Record<string, any>
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
): Promise<Record<string, any> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return docToObject(data);
}
