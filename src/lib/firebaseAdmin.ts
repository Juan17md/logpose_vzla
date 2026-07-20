let adminDb: FirebaseFirestore.Firestore | null = null;
let adminAuth: import("firebase-admin/auth").Auth | null = null;

async function iniciarAdminApp() {
  if (adminDb) return { adminDb, adminAuth };

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length > 0) {
    const app = getApps()[0];
    adminDb = getFirestore(app);
    adminAuth = getAuth(app);
    return { adminDb, adminAuth };
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  let app;
  if (serviceAccount) {
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
    });
  } else {
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
  return { adminDb, adminAuth };
}

export async function getAdminDb() {
  const instancia = await iniciarAdminApp();
  return instancia.adminDb!;
}

export async function getAdminAuth() {
  const instancia = await iniciarAdminApp();
  return instancia.adminAuth!;
}
