# LogPose Vzla 💰

> Aplicación web para gestión integral de finanzas personales con diseño Glassmorphism y asistente financiero con IA.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat&logo=tailwind-css)
![Firebase](https://img.shields.io/badge/Firebase-Firestone-ffca28?style=flat&logo=firebase)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)

---

## 📸 Preview

> **Nota:** Agrega una captura de pantalla de tu aplicación en la carpeta `/public` y actualiza esta sección.

```markdown
![Dashboard](public/dashboard-preview.png)
```

---

## 🌟 Características

### Dashboard Inteligente
- Widgets de ingresos, gastos, ahorros y metas financieras
- Botones de acceso rápido para acciones frecuentes
- Conversión de divisas con caché de 15 minutos (tasa BCV)
- Edición directa de transacciones desde el historial

### Asistente Financiero "Nami"
- Chatbot con IA para consultas financieras personalizadas
- Análisis de gastos y recomendaciones automáticas
- Respuestas en tiempo real sobre tu situación financiera

### Gestión de Metas de Ahorro
- Creación de objetivos con montos objetivo
- Aportes inteligentes que actualizan progreso y saldo
- Barra de visualización del porcentaje alcanzado

### Billetera Multi-Divisa
- Control unificado de Efectivo Físico y USDT
- Sincronización automática con metas de ahorro
- Validación de fondos para prevenir sobregiros

### Listas de Compras
- Calculadora en tiempo real (USD/BS)
- Checklists interactivos con seguimiento de estado
- Filtrado, búsqueda y ordenamiento flexible

### Deudas y Gastos Fijos
- Registro sin movimientos automáticos
- Soporte multi-moneda (USD/VES)
- Historial inmutable con tasa de cambio original

---

## 🛠️ Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de Datos | Firebase Firestore |
| Auth | Firebase Auth |
| Estado | React Context API |
| IA | Groq SDK (Nami) |
| UI | Recharts, Framer Motion, React Hook Form |

---

## 🚀 Getting Started

### Prerrequisitos

- Node.js 18+
- Cuenta de Firebase (Firestore + Auth)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/logpose-vzla.git
cd logpose-vzla

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Firebase
```

### Variables de Entorno

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura

```
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Componentes React
│   ├── contexts/        # React Context (estado global)
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilidades y Firebase
│   └── types/           # Definiciones de TypeScript
├── public/              # Assets estáticos
└── package.json
```

---

## 📄 Licencia

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Contacto

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@ejemplo.com