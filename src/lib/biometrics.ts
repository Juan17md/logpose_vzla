/**
 * Utilidad para manejar autenticación biométrica (WebAuthn / Passkeys)
 */

export const isBiometricSupported = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  
  return (
    !!window.PublicKeyCredential &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
};

export const registerBiometric = async (userEmail: string) => {
  // Nota: Esto es una implementación simplificada para el PWA.
  // En una app real, el 'challenge' debe venir del servidor.
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
    pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
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

export const authenticateBiometric = async () => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [], // Permitir cualquier credencial registrada en este dispositivo
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  return assertion;
};
