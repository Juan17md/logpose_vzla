# Control de Gastos & Finanzas Personales 💰

Una aplicación web progresiva y moderna para la gestión integral de finanzas personales. Diseñada con un estilo "Premium Glassmorphism", ofrece herramientas avanzadas para el control de ingresos, gastos, ahorros en múltiples divisas y planificación financiera.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Control+de+Gastos+App+Preview)

## 🚀 Características Principales

### 📊 Dashboard Interactivo
- **Widgets Inteligentes**: Visualización centralizada de ingresos, gastos, ahorros globales y metas.
- **Accesos Rápidos**: Botones de acción directa para registrar, reportar, ahorrar y comprar con un solo clic.
- **Conversión de Divisas (Caché)**: Integración optimizada de la tasa BCV con caché de 15 minutos para mayor rapidez.
- **Edición Rápida**: Modifica registros de ingresos/gastos directamente desde el historial.
- **Diseño Glassmorphism**: Interfaz moderna y oscura con efectos translúcidos y animaciones fluidas.

### 🎯 Metas de Ahorro (Nuevo)
- **Gestión de Objetivos**: Crea metas específicas (ej. "Viaje", "Carro") con montos objetivo.
- **Aportes Inteligentes**: Botón "Aportar" que actualiza simultáneamente el progreso de la meta y restaura el saldo en tu billetera (Físico/USDT).
- **Barra de Progreso**: Visualización gráfica del porcentaje alcanzado en cada meta.

### 💰 Billetera y Ahorros
- **Multi-Divisa**: Control unificado de **Efectivo Físico** y **USDT**.
- **Sincronización Automática**: Los aportes a metas se reflejan automáticamente en el balance general de ahorros.
- **Validación de Fondos**: Bloqueo de retiros o movimientos si el saldo es insuficiente.

### 📝 Listas de Compras
- **Calculadora en Tiempo Real**: Suma automática en USD y conversión instantánea a Bs.
- **Checklists Interactivas**: Control de estado (pendiente/comprado) para cada item.
- **Seguimiento de Cantidades Parciales**: Marca productos comprados gradualmente cuando hay múltiples unidades.
- **Indicador de Pagos Pendientes**: Muestra el monto restante por pagar cuando se compran productos parcialmente.
- **Filtrado y Búsqueda**: 
  - Busca listas por nombre
  - Filtra productos dentro de cada lista
- **Ordenamiento Flexible**:
  - Por fecha (más recientes/antiguas)
  - Alfabético (A-Z / Z-A)
  - Productos pendientes aparecen primero automáticamente

### 📈 Reportes Actualizados
- **Consolidado Financiero**: Visión clara de ingresos vs. gastos del mes.
- **Estadísticas de Ahorro**: Gráficos que integran tus avances en metas y ahorros libres.

### 💳 Deudas y Gastos Fijos (Upgrade)
- **Lógica Financiera Precisa**: El registro de deudas *no* genera movimientos automáticos. Los egresos/ingresos se registran únicamente al momento de realizar un *abono* o pago real.
- **Soporte Multi-Moneda Real**: Registra abonos tanto en Dólares (USD) como en Bolívares (VES).
- **Historial Inmutable**: El sistema almacena la moneda original y la tasa de cambio exacta del momento del pago, asegurando que el historial refleje lo que realmente pagaste sin alterarse por la fluctuación diaria del dólar.
- **Gestión Visual**: Tabla de pagos con indicadores claros de moneda original y referencia en dólares.

### 🔒 Core Técnico Optimizado
- **Context API**: Gestión de estado global con `TransactionsContext` y `UserDataContext` para minimizar lecturas a Firebase (lectura única).
- **Atomic Transactions**: Uso de `runTransaction` de Firestore para asegurar integridad en datos financieros críticos.
- **Autenticación Robusta**: Protección de rutas y datos privados por usuario.
- **Data Integrity**: Estructura de datos extendida en pagos (`originalAmount`, `exchangeRate`) para auditoría precisa.

## 🛠️ Tecnologías Utilizadas

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Lenguaje**: TypeScript
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos**: Firebase Firestore (con optimización de lecturas)
- **Autenticación**: Firebase Auth
- **Estado Global**: React Context API
- **UI Libraries**: SweetAlert2, React Icons, React Datepicker, Recharts

## 🏁 Comenzando

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/tu-usuario/control-gastos-app.git
cd control-gastos-app
npm install
```

Configura tus variables de entorno en `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📱 Estructura del Proyecto

```
/src
  /app              # Rutas (Dashboard, Login, Ahorros, Reportes...)
  /components       # UI Kit, Widgets, Gráficos
  /hooks            # Lógica personalizada (useTransactions, useSavings...)
  /lib              # Configuración de Firebase y Utils
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir lo que te gustaría cambiar.

## 📄 Licencia

[MIT](https://choosealicense.com/licenses/mit/)
