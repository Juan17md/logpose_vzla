export default function DarkLogo() {
  return (
    <div className="bg-slate-900 p-8 rounded-2xl shadow-sm flex flex-col items-center">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">
        Variante Dark Mode
      </h2>
      <svg width="280" height="130" viewBox="0 0 360 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="75" cy="75" r="45" stroke="#FBBF24" strokeWidth="3"/>
        <path d="M75 45L82 75L75 105L68 75L75 45Z" fill="white"/>
        <circle cx="75" cy="75" r="5" fill="#EF4444"/>
        {/* Texto Corregido a LOGPOSE VZLA */}
        <text x="135" y="75" fontFamily="Bungee" fontSize="30" fill="white">LOGPOSE</text>
        <text x="135" y="105" fontFamily="Bungee" fontSize="30" fill="#FBBF24">VZLA</text>
      </svg>
    </div>
  );
}