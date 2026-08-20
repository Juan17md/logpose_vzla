# LogPose Vzla

> Plataforma de gestión financiera personal **mobile-first** con estética *Quiet Luxury*, asistente IA y soporte multi-moneda para el ecosistema financiero venezolano.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-iOS%20%7C%20Android-5A0FC8?style=for-the-badge&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Groq](https://img.shields.io/badge/IA-Groq%20Llama%203.3-orange?style=for-the-badge)](https://groq.com/)


---

## Características

### Dashboard Inteligente
- **12 widgets dinámicos** con layouts duales móvil/desktop: Balance Hero, Health Score, Flujo de Caja, Presupuesto, Metas, Deudas y más
- **Gráficos D3.js** (Rosen Charts): donut interactivo de gastos, área chart de flujo mensual, bar charts en reportes
- **Conversión BCV en tiempo real** con caché de 15 minutos y toggle de privacidad (oculta montos)

### Asistente Financiero — Nami
- **16 intents**: registro de transacciones, deudas, metas, gastos fijos, listas de compras y consultas analíticas
- **Pre-ruteo local** sin latencia para consultas comunes (balance, gastos, deudas, metas)
- **Entrada por voz** vía Web Speech API
- **Resolución inteligente de cuentas** con sistema de puntuación y filtrado contextual

### Multi-moneda
- Soporte para **USD, VES, USDT, EUR** con tasa histórica congelada al momento de la transacción
- Comisiones automáticas venezolanas: Pago Móvil P2P (0.30%), P2C (1.50%),Transferencia Interbancaria (0.30%)
- Deudas nominales selectivas sin conversión forzada

### PWA Mobile-first
- **Offline-first**: persistencia IndexedDB + Firestore offline cache con `persistentMultipleTabManager`
- **iOS Splash Screens**: 46 resoluciones cubriendo todos los dispositivos (iPhone SE hasta iPad Pro 12.9")
- **Avisos de instalación y actualización** con `SKIP_WAITING`
- Safe area para notch y home indicator

### Categorías Personalizadas
- CRUD completo con 17 categorías predeterminadas al primer login
- Selector inteligente de dos niveles (categoría → subcategoría) con colores dinámicos
- Paleta de 10 colores con micro-animaciones

### Seguridad
- Firestore Security Rules con validación de tipos, roles (RBAC) y protección multi-colección
- Rate limiting con Redis/Upstash (10 req/min chat, 5 req/min auth)
- Headers de seguridad OWASP (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Validación Zod en todas las escrituras Firestore (15+ esquemas)
- `server-only` para módulos sensibles del backend

## Integración con Atajos de iOS (Shortcuts)

Registra ingresos y gastos directamente desde la app **Atajos** sin abrir la interfaz web, mediante el endpoint `POST /api/shortcuts/transaction`.

**Configuración** (variables de entorno):

| Variable | Descripción |
| :--- | :--- |
| `SHORTCUTS_API_TOKEN` | Token estático generado con `openssl rand -hex 32`. Se envía como `Authorization: Bearer <token>` |
| `SHORTCUTS_USER_ID` | UID de Firebase del dueño de la cuenta (el token solo escribe en esta cuenta) |

**Body JSON**: `monto` (número positivo; también acepta string numérica como `"2500"` — Atajos serializa los números como texto), `tipo` (`ingreso`/`gasto`, insensible a mayúsculas: `Ingreso`/`Gasto` funcionan), `categoria` (Salario, Freelance, Comida, Hogar, Transporte, Servicios, Salud, Educación, Entretenimiento, Mascotas, Regalos, Ropa, Seguros, Belleza, Deudas, Inversiones, Otra), `descripcion` (opcional), `fecha` (opcional, ISO 8601, default: ahora) y `currency` (opcional, `USD`/`VES`, default: `USD`).

```bash
curl -X POST https://logpose-vzla.vercel.app/api/shortcuts/transaction \
  -H "Authorization: Bearer $SHORTCUTS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"monto": 2500, "tipo": "gasto", "categoria": "Comida",
       "descripcion": "Almuerzo con amigos", "currency": "VES"}'
```

Respuesta de éxito: `200` con `{ "success": true, "transaccion": { id, monto, tipo, ... } }`. Errores: `400` body inválido, `401` token incorrecto, `429` límite de solicitudes, `500` error de servidor. Al no exponer cabeceras CORS, solo clientes nativos (Atajos) pueden consumirlo — los navegadores quedan excluidos por diseño.

## Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Estilizado** | Tailwind CSS v4, Framer Motion, Glassmorphism |
| **Backend & Auth** | Firebase Auth + Firestore |
| **Inteligencia Artificial** | Groq Cloud (Llama 3.3 70B) |
| **Gráficos** | D3.js (Rosen Charts — SVG nativo) |
| **Formularios** | React Hook Form + Zod |
| **PWA** | @ducanh2912/next-pwa, Workbox |
| **Testing** | Vitest (129 tests, 9 suites) |
| **CI/CD** | GitHub Actions (lint, typegen, typecheck, test, build) |

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/           # Login, registro, términos, privacidad
│   ├── api/              # Route handlers (chat, sesión)
│   ├── dashboard/        # 12 secciones de la app
│   ├── onboarding/       # Wizard de 6 pasos post-registro
│   └── layout.tsx        # Layout raíz con PWA y splash
├── components/
│   ├── charts/           # Gráficos D3.js
│   ├── forms/            # Formularios homogeneizados
│   ├── layout/           # Sidebar, navegación, logo
│   ├── pwa/              # Avisos PWA, IOSSplash
│   └── ui/               # Sistema de diseño: Modal, Input, Select, etc.
├── contexts/             # Context API como caché reactiva (6 contextos)
└── lib/                  # Utilidades, schemas Zod, Firebase, Nami
```

## Arquitectura

- **Transacciones atómicas** con `runTransaction` de Firestore para operaciones multi-documento
- **Context API como caché reactiva** eliminando ~80% de lecturas duplicadas a Firestore
- **Onboarding wizard** de 6 pasos con migración automática de usuarios legacy
- **Lazy loading** en todos los widgets del dashboard y chatbot (59KB)

---

*LogPose Vzla — Navegando el Grand Line de tus finanzas.*
