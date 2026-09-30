// The short notes that explain parts of the dashboard. One copy, used twice:
// as the hotspots on the tour screenshots (components/ProductTour.tsx) and as
// the numbered hints inside the interactive demo (components/demo/DemoShell.tsx),
// so the two can never drift apart.
export type TourLang = "EN" | "ES" | "FR";
export type L10n = Record<TourLang, string>;
export type NoteSlide = "overview" | "calls" | "calendar" | "support";

export const TOUR_NOTES: Record<NoteSlide, L10n[]> = {
  overview: [
    {
      EN: "Calls answered, booking requests and your booking rate, updated as calls come in.",
      ES: "Llamadas atendidas, solicitudes de cita y tu tasa de reserva, al día con cada llamada.",
      FR: "Appels traités, demandes de rendez-vous et taux de réservation, mis à jour à chaque appel.",
    },
    {
      EN: "See when your calls come in, hour by hour, so you know when the phone matters most.",
      ES: "Mira a qué horas llegan tus llamadas y sabrás cuándo es más importante estar localizable.",
      FR: "Voyez à quelle heure arrivent vos appels, heure par heure, pour savoir quand le téléphone compte le plus.",
    },
  ],
  calls: [
    {
      EN: "Pick a date range with the calendar, or just type it.",
      ES: "Elige un rango de fechas en el calendario, o escríbelo directamente.",
      FR: "Choisissez une période dans le calendrier, ou saisissez-la directement.",
    },
    {
      EN: "A one-line AI summary of what the caller wanted, so you don't have to listen back.",
      ES: "Un resumen en una línea de lo que quería quien llamó, sin tener que escuchar la llamada.",
      FR: "Un résumé en une ligne de ce que voulait l'appelant, sans avoir à réécouter l'appel.",
    },
    {
      EN: "Tags show the type of call and whether it needs your review.",
      ES: "Las etiquetas indican el tipo de llamada y si necesita tu revisión.",
      FR: "Les étiquettes indiquent le type d'appel et s'il nécessite votre attention.",
    },
  ],
  calendar: [
    {
      EN: "Each day shows how many requests it has, colour-coded by status.",
      ES: "Cada día muestra cuántas solicitudes tiene, con un color según su estado.",
      FR: "Chaque jour indique le nombre de demandes, avec une couleur selon leur statut.",
    },
    {
      EN: "Open a day to confirm or cancel each request, or jump to the call behind it.",
      ES: "Abre un día para confirmar o cancelar cada solicitud, o ir a la llamada que la originó.",
      FR: "Ouvrez un jour pour confirmer ou annuler chaque demande, ou accéder à l'appel d'origine.",
    },
  ],
  support: [
    {
      EN: "Describe the problem or your question. No name or email to fill in, we already know who you are.",
      ES: "Describe el problema o tu duda. Sin nombre ni email que rellenar: ya sabemos quién eres.",
      FR: "Décrivez le problème ou votre question. Pas de nom ni d'e-mail à saisir, nous savons déjà qui vous êtes.",
    },
    {
      EN: "Attach a screenshot or a PDF so we can see exactly what you see.",
      ES: "Adjunta una captura o un PDF para que veamos exactamente lo mismo que tú.",
      FR: "Joignez une capture d'écran ou un PDF pour que nous voyions exactement ce que vous voyez.",
    },
  ],
};

// Only in the demo: the page a call opens onto.
export const DEMO_DETAIL_NOTE: L10n = {
  EN: "The AI summary and the full transcript, with the call's details on the right.",
  ES: "El resumen de la IA y la transcripción completa, con los datos de la llamada a la derecha.",
  FR: "Le résumé de l'IA et la transcription complète, avec les détails de l'appel à droite.",
};
