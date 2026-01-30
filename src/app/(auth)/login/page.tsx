"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Swal from "sweetalert2";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/forms/Input";

const loginSchema = z.object({
    email: z.string().email("Correo electrónico inválido"),
    password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            Swal.fire({
                icon: "success",
                title: "¡Bienvenido de nuevo!",
                text: "Has iniciado sesión correctamente.",
                timer: 1500,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            let errorMessage = "Ocurrió un error al iniciar sesión.";
            if (error instanceof FirebaseError) {
                if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                    errorMessage = "Credenciales incorrectas.";
                } else if (error.code === "auth/invalid-email") {
                    errorMessage = "El correo electrónico no es válido.";
                } else if (error.code === "auth/too-many-requests") {
                    errorMessage = "Demasiados intentos fallidos. Intenta más tarde.";
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

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            Swal.fire({
                icon: "success",
                title: "¡Bienvenido!",
                text: "Has iniciado sesión con Google correctamente.",
                timer: 1500,
                showConfirmButton: false,
                background: "#1f2937",
                color: "#fff",
            });
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            let errorMessage = "Ocurrió un error al iniciar sesión con Google.";

            if (error instanceof FirebaseError) {
                if (error.code === "auth/popup-closed-by-user") {
                    errorMessage = "Inicio de sesión cancelado.";
                } else if (error.code === "auth/account-exists-with-different-credential") {
                    errorMessage = "Ya existe una cuenta con este correo usando otro método.";
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
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 left-1/2 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 relative animation-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bienvenido</h1>
                    <p className="text-slate-400">Ingresa a tu control financiero premium</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                                className="text-slate-500 hover:text-emerald-400 focus:outline-none transition-colors"
                            >
                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                            </button>
                        }
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transform transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span>Iniciar Sesión</span>
                                <FiArrowRight />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700/50"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-slate-900/50 text-slate-400 backdrop-blur-sm">O continúa con</span>
                    </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    type="button"
                    className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 rounded-xl shadow-lg transform transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed border border-gray-200"
                >
                    <FcGoogle size={24} />
                    <span>Continuar con Google</span>
                </button>

                <p className="mt-8 text-center text-sm text-slate-400">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors">
                        Regístrate aquí
                    </Link>
                </p>
            </div>
        </div>
    );
}
