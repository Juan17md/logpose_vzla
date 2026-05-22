/**
 * Verifica el ID token de Firebase Auth usando la REST API (sin firebase-admin).
 */
export async function verificarTokenFirebase(
    idToken: string
): Promise<{ uid: string; email?: string } | null> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || !idToken?.trim()) return null;

    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            }
        );

        if (!res.ok) return null;

        const data = (await res.json()) as {
            users?: Array<{ localId: string; email?: string }>;
        };

        const usuario = data.users?.[0];
        if (!usuario?.localId) return null;

        return { uid: usuario.localId, email: usuario.email };
    } catch {
        return null;
    }
}
