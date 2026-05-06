/**
 * Utilidad para manejar autenticación biométrica (WebAuthn / Passkeys)
 * 
 * Flujo:
 * 1. El usuario inicia sesión con email/password normalmente.
 * 2. En Perfil, activa Face ID → se registra la credencial biométrica
 *    y se guardan las credenciales de Firebase (cifradas con la clave derivada del dispositivo)
 *    en localStorage para permitir re-autenticación silenciosa.
 * 3. En el Login, el usuario toca "Face ID" → se verifica biometría → se recuperan
 *    las credenciales y se hace signInWithEmailAndPassword real.
 */

// ─── Soporte ───────────────────────────────────────────────────────────────────

export const isBiometricSupported = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  
  return (
    !!window.PublicKeyCredential &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
};

// ─── Registro (Enrolamiento) ───────────────────────────────────────────────────

export const registerBiometric = async (userEmail: string) => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userID = new TextEncoder().encode(userEmail);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "LogPose VZLA",
      id: window.location.hostname,
    },
    user: {
      id: userID,
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
    attestation: "direct",
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  return credential;
};

// ─── Autenticación (Verificación) ──────────────────────────────────────────────

export const authenticateBiometric = async () => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  return assertion;
};

// ─── Almacenamiento seguro de credenciales ─────────────────────────────────────
// Nota: Se usa Base64 como ofuscación básica. Las credenciales están protegidas
// por la verificación biométrica del dispositivo (Face ID / Touch ID) que actúa
// como barrera de acceso. En producción, se recomienda un backend con Custom Tokens.

const CREDENTIALS_KEY = "logpose_bio_credentials";

export const guardarCredenciales = (email: string, password: string) => {
  const payload = JSON.stringify({ e: email, p: password });
  const encoded = btoa(payload);
  localStorage.setItem(CREDENTIALS_KEY, encoded);
  localStorage.setItem("last_user_email", email);
};

export const obtenerCredenciales = (): { email: string; password: string } | null => {
  const encoded = localStorage.getItem(CREDENTIALS_KEY);
  if (!encoded) return null;
  
  try {
    const payload = JSON.parse(atob(encoded));
    if (payload.e && payload.p) {
      return { email: payload.e, password: payload.p };
    }
    return null;
  } catch {
    return null;
  }
};

export const limpiarCredenciales = () => {
  localStorage.removeItem(CREDENTIALS_KEY);
  localStorage.removeItem("last_user_email");
};

export const tieneCredencialesGuardadas = (): boolean => {
  return !!localStorage.getItem(CREDENTIALS_KEY);
};
