"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FiUser, FiMail, FiShield, FiCalendar, FiEdit2, FiSave, FiLock, FiLogOut } from "react-icons/fi";

export default function ProfilePage() {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<{ createdAt?: { toDate: () => Date } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState("");
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push("/login"); // Asumiendo que /login es la ruta de inicio de sesión
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setNewName(currentUser.displayName || "");

                // Fetch additional data from Firestore
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateProfile = async () => {
        if (!user) return;

        try {
            await updateProfile(user, { displayName: newName });

            // Update in Firestore as well for consistency
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { displayName: newName });

            setEditing(false);
            toast.success("Perfil actualizado");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo actualizar el perfil");
        }
    };

    const handlePasswordReset = () => {
        if (!user?.email) return;
        setShowResetConfirm(true);
    };

    const confirmPasswordReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success("Correo de recuperación enviado");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo enviar el correo");
        } finally {
            setShowResetConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-10 -translate-y-10">
                    <FiUser className="text-9xl text-violet-400" />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Mi Perfil</h1>
                    <p className="text-slate-400 text-lg">Gestiona tu información personal y seguridad.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-400"></div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FiUser className="text-violet-400" />
                            Información Personal
                        </h2>
                        <button
                            onClick={() => {
                                if (editing) handleUpdateProfile();
                                else setEditing(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${editing
                                ? "bg-violet-500 text-white hover:bg-violet-600 shadow-violet-500/20"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                                }`}
                        >
                            {editing ? <><FiSave /> Guardar</> : <><FiEdit2 /> Editar</>}
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled={!editing}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className={`w-full bg-slate-800/50 border text-white rounded-xl py-3 px-4 outline-none transition-all ${editing
                                        ? "border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                                        : "border-slate-700/50 text-slate-400 cursor-not-allowed"
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico</label>
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-slate-400">
                                    <FiMail className="text-violet-500" />
                                    <span>{user?.email}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Miembro Desde</label>
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-slate-400">
                                    <FiCalendar className="text-violet-500" />
                                    <span>
                                        {userData?.createdAt?.toDate
                                            ? userData.createdAt.toDate().toLocaleDateString()
                                            : user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan & Security Sidebar */}
                <div className="space-y-6">
                    {/* Plan Info */}


                    {/* Security Actions */}
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <FiShield className="text-red-400" />
                            Seguridad
                        </h3>
                        <button
                            onClick={handlePasswordReset}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all group border border-slate-700/50 hover:border-red-500/30 mb-3"
                        >
                            <span className="font-medium">Cambiar Contraseña</span>
                            <FiLock className="opacity-50 group-hover:opacity-100 group-hover:text-red-400 transition-colors" />
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 rounded-xl transition-all group border border-red-500/20 hover:border-red-500/40"
                        >
                            <span className="font-medium">Cerrar Sesión</span>
                            <FiLogOut className="opacity-70 group-hover:opacity-100 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={confirmPasswordReset}
                title="¿Enviar correo de recuperación?"
                message={`Se enviará un enlace temporal a ${user?.email}`}
                confirmText="Enviar Correo"
                type="info"
            />
        </div>
    );
}
