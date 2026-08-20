import 'server-only';
import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

const URL_CLAVES_PUBLICAS =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cacheClaves: { mapa: Record<string, string>; exp: number } | null = null;

/**
 * Limpia el cache de claves públicas. Solo se usa en pruebas para aislar
 * el estado entre casos de test.
 */
export function resetearCacheClavesPublicas(): void {
  cacheClaves = null;
}

/**
 * Descarga el mapa de certificados X.509 públicos de Firebase Auth y lo cachea
 * en memoria con el TTL indicado por el header Cache-Control de la respuesta
 * (mínimo 5 minutos por seguridad).
 */
async function obtenerMapaClaves(): Promise<Record<string, string>> {
  if (cacheClaves && Date.now() < cacheClaves.exp) {
    return cacheClaves.mapa;
  }

  const res = await fetch(URL_CLAVES_PUBLICAS);
  if (!res.ok) {
    throw new Error(`Error descargando claves públicas de Firebase (${res.status})`);
  }

  const mapa = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] ?? '3600', 10);
  cacheClaves = { mapa, exp: Date.now() + Math.max(maxAge, 300) * 1000 };

  return mapa;
}

/** Extrae el `kid` (key id) del header del JWT sin verificarlo. */
function extraerKid(token: string): string | null {
  try {
    const { kid } = decodeProtectedHeader(token);
    return typeof kid === 'string' ? kid : null;
  } catch {
    return null;
  }
}

/**
 * Verifica el ID token de Firebase Auth de forma criptográfica:
 * firma RS256 con las claves públicas de Google, expiración (`exp`),
 * issuer (`https://securetoken.google.com/<PROJECT_ID>`) y audience
 * (`PROJECT_ID`). Un token expirado, revocado o manipulado se rechaza.
 */
export async function verificarTokenFirebase(
  idToken: string
): Promise<{ uid: string; email?: string } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !idToken?.trim()) return null;

  try {
    const kid = extraerKid(idToken);
    if (!kid) return null;

    const mapa = await obtenerMapaClaves();
    const pem = mapa[kid];
    if (!pem) return null;

    const clave = await importX509(pem, 'RS256');
    const { payload } = await jwtVerify(idToken, clave, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });

    const uid = typeof payload.sub === 'string' ? payload.sub : null;
    if (!uid) return null;

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    return { uid, email };
  } catch {
    return null;
  }
}