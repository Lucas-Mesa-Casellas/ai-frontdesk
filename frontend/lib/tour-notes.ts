// The short notes that explain parts of the dashboard. One copy, used twice:
// as the hotspots on the tour screenshots (components/ProductTour.tsx) and as
// the numbered hints inside the interactive demo (components/demo/DemoShell.tsx),
// so the two can never drift apart.
export type TourLang = "EN" | "ES" | "FR";
export type L10n = Record<TourLang, string>;
export type NoteSlide = "overview" | "calls" | "calendar" | "support";

export const TOUR_NOTES: Record<NoteSlide, L10n[]> = {
  overview: [
    { EN: "Calls, booking requests and booking rate, live.", ES: "Llamadas, solicitudes de cita y tasa de reserva, al día.", FR: "Appels, demandes de rendez-vous et taux de réservation, en direct." },
    { EN: "When your calls come in, hour by hour.", ES: "A qué horas llegan tus llamadas.", FR: "À quelle heure arrivent vos appels." },
  ],
  calls: [
    { EN: "Filter calls by date.", ES: "Filtra las llamadas por fecha.", FR: "Filtrez les appels par date." },
    { EN: "What the caller wanted, summarised by the AI.", ES: "Lo que quería quien llamó, resumido por la IA.", FR: "Ce que voulait l'appelant, résumé par l'IA." },
    { EN: "Call type, and whether it needs your review.", ES: "Tipo de llamada y si necesita tu revisión.", FR: "Type d'appel, et s'il demande votre attention." },
  ],
  calendar: [
    { EN: "Requests per day, coloured by status.", ES: "Solicitudes por día, con un color según su estado.", FR: "Demandes par jour, colorées selon leur statut." },
    { EN: "Open a day to confirm or cancel its requests.", ES: "Abre un día para confirmar o cancelar sus solicitudes.", FR: "Ouvrez un jour pour confirmer ou annuler ses demandes." },
  ],
  support: [
    { EN: "Describe your problem or question. We already know who you are.", ES: "Describe tu problema o duda. Ya sabemos quién eres.", FR: "Décrivez votre problème ou votre question. Nous savons déjà qui vous êtes." },
    { EN: "Attach a screenshot or a PDF.", ES: "Adjunta una captura o un PDF.", FR: "Joignez une capture d'écran ou un PDF." },
  ],
};

// Only in the demo: the page a call opens onto.
export const DEMO_DETAIL_NOTE: L10n = {
  EN: "AI summary, full transcript and call details.",
  ES: "Resumen de la IA, transcripción completa y datos de la llamada.",
  FR: "Résumé de l'IA, transcription complète et détails de l'appel.",
};
