import 'server-only';
import { createSign } from "crypto";

const AUD_IDENTITY_TOOLKIT =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

let serviceAccount: { client_email: string; private_key: string } | null = null;

function obtenerServiceAccount(): { client_email: string; private_key: string } {
  if (!serviceAccount) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT no está configurado");
    serviceAccount = JSON.parse(raw) as { client_email: string; private_key: string };
  }
  return serviceAccount;
}

/**
 * Genera un custom token de Firebase Auth firmando un JWT RS256 con la clave
 * privada del service account (equivalente a admin.auth().createCustomToken
 * de firebase-admin, sin la dependencia ni sus conflictos ESM en serverless).
 */
export async function crearCustomToken(uid: string): Promise<string> {
  const { client_email: clientEmail, private_key: privateKey } = obtenerServiceAccount();

  const ahora = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: AUD_IDENTITY_TOOLKIT,
      iat: ahora,
      exp: ahora + 3600,
      uid,
    })
  ).toString("base64url");

  const firma = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .end()
    .sign(privateKey, "base64url");

  return `${header}.${payload}.${firma}`;
}
