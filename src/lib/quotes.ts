export type QuoteCategory = "general" | "cuentas" | "deudas" | "gastos-fijos" | "listas" | "movimientos" | "perfil" | "reportes";

export interface Quote {
    text: string;
    author: string;
    context?: string;
    financialLesson?: string;
    category: QuoteCategory;
}

export const ONE_PIECE_QUOTES: Quote[] = [
    // CUENTAS
    {
        text: "Riqueza, fama, poder… Gold Roger, el Rey de los Piratas, obtuvo esto y todo lo demás que el mundo podía ofrecer.",
        author: "Narrador / Gol D. Roger",
        context: "El inicio de la Gran Era",
        financialLesson: "Define qué significa la 'riqueza' para ti y traza una ruta directa hacia tu propio 'One Piece' financiero.",
        category: "cuentas"
    },
    {
        text: "¿Mi tesoro? ¡Búsquenlo! Lo escondí todo en ese lugar.",
        author: "Gol D. Roger",
        context: "Últimas palabras",
        financialLesson: "Diversificar y ubicar estratégicamente tus activos es esencial para que tu patrimonio crezca.",
        category: "cuentas"
    },
    {
        text: "¡Reuniré 100,000,000 de Berries para comprar la libertad de mi aldea!",
        author: "Nami",
        context: "Objetivo SMART inicial",
        financialLesson: "Llevar un registro implacable y tener metas financieras claras es el inicio de la buena administración de cuentas.",
        category: "cuentas"
    },

    // DEUDAS
    {
        text: "La muerte no es una excusa para romper una promesa.",
        author: "Brook",
        context: "Cumpliendo con Laboon",
        financialLesson: "Honrar tus deudas a tiempo construye una reputación sólida; tu historial crediticio es tu honor en el mercado.",
        category: "deudas"
    },
    {
        text: "La vida de mis nakamas es mía también.",
        author: "Roronoa Zoro",
        context: "Sacrificio por la tripulación",
        financialLesson: "Antes de endeudarte por alguien o ser fiador, asegúrate de tener la capacidad real de asumir esa responsabilidad.",
        category: "deudas"
    },
    {
        text: "Hacer y devolver favores de honor.",
        author: "Jinbe",
        context: "Su código moral",
        financialLesson: "Cancelar tus deudas y devolver préstamos a tiempo forja la confianza mutua indispensable para futuros apoyos.",
        category: "deudas"
    },

    // GASTOS FIJOS
    {
        text: "¿De qué sirve la fortuna si no tienes comida?",
        author: "Zeff",
        context: "Sobre las necesidades básicas",
        financialLesson: "La liquidez y el presupuesto para necesidades básicas siempre van primero en tu lista de gastos ineludibles.",
        category: "gastos-fijos"
    },
    {
        text: "El Thousand Sunny necesita madera, mantenimiento y a su carpintero.",
        author: "Franky",
        context: "Cuidado del barco",
        financialLesson: "El mantenimiento continuo de tus bienes (hogar, vehículo) no es un lujo, sino un gasto fijo vital.",
        category: "gastos-fijos"
    },
    {
        text: "El pago del Tributo Celestial al Gobierno Mundial.",
        author: "Ciudadanos del Mundo",
        context: "Obligaciones sistémicas",
        financialLesson: "Considera tus impuestos y pagos de seguros como obligaciones mensuales para mantener la estabilidad de lo que posees.",
        category: "gastos-fijos"
    },

    // LISTAS
    {
        text: "Encontrar ingredientes de todos los mares para el legendario All Blue.",
        author: "Sanji",
        context: "Logística culinaria",
        financialLesson: "Crear una lista de compras meticulosa evita desperdicios y optimiza el presupuesto como el cocinero de la tripulación.",
        category: "listas"
    },
    {
        text: "Priorizar lo que entra a la bodega antes de zarpar al próximo mar.",
        author: "Usopp / Nami",
        context: "Preparativos",
        financialLesson: "Planifica tus salidas al mercado y respeta tu lista; no compres nada que no sea necesario para tu viaje financiero.",
        category: "listas"
    },

    // MOVIMIENTOS
    {
        text: "Las raras Frutas del Diablo pueden cotizarse en cientos de millones en el mercado.",
        author: "Underworld",
        context: "Ley de oferta y demanda",
        financialLesson: "Un flujo de efectivo sano implica saber identificar cuándo comprar activos y en qué momento el mercado exige vender.",
        category: "movimientos"
    },
    {
        text: "Recibir la recompensa justa por una transacción u objetivo pirata.",
        author: "Los Cazarrecompensas",
        context: "Intercambios de valor",
        financialLesson: "Rastrea celosamente las entradas y salidas de tu dinero; controlar tus movimientos previene fugas de tu tesoro personal.",
        category: "movimientos"
    },

    // PERFIL
    {
        text: "¡No lo quiero conquistar! ¡En este mar, el que goce de más libertad será el Rey!",
        author: "Monkey D. Luffy",
        context: "El verdadero sueño",
        financialLesson: "Tu perfil de inversor requiere metas de vida claras; busca libertad de tiempo y acción, no solo acumular.",
        category: "perfil"
    },
    {
        text: "¿Cuál es la gracia de perseguir tus sueños si lo haces sólo?",
        author: "Nami",
        context: "Sobre el equipo",
        financialLesson: "Tu perfil financiero se potencia al alinear tu visión a largo plazo con tu pareja o familiares.",
        category: "perfil"
    },
    {
        text: "¡Tengo una inmensa recompensa sobre mi cabeza!",
        author: "Piratas de la Nueva Era",
        context: "Evaluación de amenaza",
        financialLesson: "Tu 'Bounty' es tu cotización en el mercado laboral; invertir en aprender habilidades extraordinarias incrementará tus ingresos.",
        category: "perfil"
    },

    // REPORTES
    {
        text: "Soñar con crear el mapa del mundo más preciso.",
        author: "Nami",
        context: "El sueño de la navegante",
        financialLesson: "Generar reportes financieros rigurosos equivale a trazar el mapa de tus cuentas para corregir el rumbo a tiempo.",
        category: "reportes"
    },
    {
        text: "Observa bien las corrientes. El mar nunca miente.",
        author: "Jinbe",
        context: "Navegación experta",
        financialLesson: "Los datos históricos y de análisis son tu brújula; escúchalos y predice las aguas turbulentas del futuro.",
        category: "reportes"
    },
    {
        text: "El estudio del clima en Weatheria predice las tormentas venideras.",
        author: "Haredas",
        context: "Análisis climático",
        financialLesson: "Tus reportes y análisis estadísticos te dan la visión necesaria para construir fondos de emergencia eficaces.",
        category: "reportes"
    },

    // GENERAL / OTRAS
    {
        text: "No pienses en lo que has perdido, piensa en lo que aun te queda.",
        author: "Jinbe",
        context: "Post-Marineford",
        financialLesson: "Tras una mala inversión, deja el costo hundido atrás, revisa tu balance actual y enfócate en gestionar mejor tus recursos presentes.",
        category: "general"
    }
];

export const getRandomQuote = (category?: QuoteCategory): Quote => {
    const filteredQuotes = category 
        ? ONE_PIECE_QUOTES.filter(q => q.category === category)
        : ONE_PIECE_QUOTES;
    
    // Si no hay frases en la categoría, usar las generales o todas
    const pool = filteredQuotes.length > 0 ? filteredQuotes : ONE_PIECE_QUOTES;
    
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
};
