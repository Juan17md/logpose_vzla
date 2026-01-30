"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { FiUser, FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/forms/Input";

const registerSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Correo electrónico inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setLoading(true);
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // 2. Update Auth Profile
            await updateProfile(user, {
                displayName: data.name,
            });

            // 3. Create User Document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: data.name,
                email: data.email,
                plan: "free",
                createdAt: serverTimestamp(),
            });

            Swal.fire({
                icon: "success",
                title: "¡Cuenta creada!",
                text: "Bienvenido a tu control de gastos.",
                timer: 1500,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });

            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            let errorMessage = "Ocurrió un error al registrarse.";
            if (error instanceof FirebaseError) {
                if (error.code === "auth/email-already-in-use") {
                    errorMessage = "Este correo ya está registrado.";
                } else if (error.code === "auth/weak-password") {
                    errorMessage = "La contraseña debe tener al menos 6 caracteres.";
                }
            }

            Swal.fire({
                icon: "error",
                title: "Error",
                text: errorMessage,
                background: "#1f2937",
                color: "#fff",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/2 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 relative">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Crear Cuenta</h1>
                    <p className="text-slate-400">Comienza a tomar el control de tu dinero</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                        label="Nombre Completo"
                        type="text"
                        placeholder="Juan Pérez"
                        icon={<FiUser />}
                        {...register("name")}
                        error={errors.name}
                    />

                    <Input
                        label="Correo Electrónico"
                        type="email"
                        placeholder="ejemplo@correo.com"
                        icon={<FiMail />}
                        {...register("email")}
                        error={errors.email}
                    />

                    <Input
                        label="Contraseña"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        icon={<FiLock />}
                        {...register("password")}
                        error={errors.password}
                        rightElement={
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-slate-500 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                            >
                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                            </button>
                        }
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transform transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span>Registrarse</span>
                                <FiArrowRight />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-400">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
