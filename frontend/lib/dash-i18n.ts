import type { Locale } from "./locale";

export type DashDict = {
  navOverview: string; navCalls: string; navCalendar: string; navSettings: string;
  navSignOut: string;
  loginTitle: string; loginSub: string; loginLabel: string; loginPh: string;
  loginCta: string; loginSending: string; loginErr: string;
  loginSentTitle: string; loginSentSub: (email: string) => string;
  loginBack: string; loginExpired: string;

  ovTitle: string; ovSub: string;
  statCalls: string; statBookings: string; statConv: string; statConvGoal: string;
  recentCalls: string; viewAll: string; noCalls: string; noSummary: string; unknown: string;
  upcoming: string; noUpcoming: string; noDateSet: string;

  callsTitle: string; callsSub: string; callsEmptyTitle: string; callsEmptySub: string;
  noPhone: string; back: string;

  detailDate: string; detailTime: string; detailRequested: string; detailUrgency: string;
  detailSummary: string; detailTranscript: string; detailBooking: string;

  calTitle: string; calSub: string; calEmptyTitle: string; calEmptySub: string;
  calPending: string; calConfirmed: string; calConfirm: string; calConfirming: string;
  calConfirmed_: string; calNoDate: string; people: (n: number) => string;

  setTitle: string; setSub: string; setBizInfo: string; setBizName: string;
  setEmail: string; setPhone: string; setSave: string; setSaved: string;
  setDanger: string; setDangerSub: string; setSignOut: string;

  statusNew: string; statusReview: string; statusRequested: string;

  langName: string;
};

export const DASH_T: Record<Locale, DashDict> = {
  en: {
    navOverview: "Overview", navCalls: "Calls", navCalendar: "Calendar", navSettings: "Settings",
    navSignOut: "Sign out",
    loginTitle: "Client access", loginSub: "Enter the email your account is under. We'll send you a secure link, no password to remember.",
    loginLabel: "Email", loginPh: "you@business.com",
    loginCta: "Send me the link", loginSending: "Sending…",
    loginErr: "That email isn't linked to a client account. Double-check it or contact us.",
    loginSentTitle: "Check your inbox",
    loginSentSub: (email) => `We've sent a secure sign-in link to ${email}. It works once and expires shortly.`,
    loginBack: "Back to lmcagents.app",
    loginExpired: "That link has expired or was already used. Request a new one.",

    ovTitle: "Overview", ovSub: "Your activity, live.",
    statCalls: "Calls answered", statBookings: "Booking requests", statConv: "Conversion",
    statConvGoal: "vs calls answered",
    recentCalls: "Recent calls", viewAll: "View all", noCalls: "No calls yet.",
    noSummary: "No summary yet.", unknown: "Unknown",
    upcoming: "Upcoming bookings", noUpcoming: "No upcoming bookings.", noDateSet: "No date set",

    callsTitle: "Call history", callsSub: "Every call your AI receptionist has handled.",
    callsEmptyTitle: "No calls yet", callsEmptySub: "Calls will appear here once your AI starts answering.",
    noPhone: "Number not captured", back: "Back to calls",

    detailDate: "Date", detailTime: "Time", detailRequested: "Requested time",
    detailUrgency: "Urgency", detailSummary: "AI summary", detailTranscript: "Full transcript",
    detailBooking: "Linked booking",

    calTitle: "Calendar", calSub: "Booking requests captured by your AI.",
    calEmptyTitle: "No bookings", calEmptySub: "Booking requests captured by your AI will appear here.",
    calPending: "Requested, not confirmed", calConfirmed: "Confirmed",
    calConfirm: "Confirm", calConfirming: "Confirming…", calConfirmed_: "Confirmed",
    calNoDate: "No date given", people: (n) => `${n} ${n === 1 ? "person" : "people"}`,

    setTitle: "Settings", setSub: "Manage your business info and preferences.",
    setBizInfo: "Business information", setBizName: "Business name",
    setEmail: "Notification email", setPhone: "Phone number",
    setSave: "Save changes", setSaved: "Saved.",
    setDanger: "Danger zone", setDangerSub: "This action is irreversible.", setSignOut: "Sign out",

    statusNew: "new", statusReview: "needs review", statusRequested: "requested",
    langName: "English",
  },
  es: {
    navOverview: "Resumen", navCalls: "Llamadas", navCalendar: "Calendario", navSettings: "Ajustes",
    navSignOut: "Cerrar sesión",
    loginTitle: "Acceso clientes", loginSub: "Introduce el email de tu cuenta. Te enviamos un enlace seguro, sin contraseña que recordar.",
    loginLabel: "Email", loginPh: "tu@negocio.com",
    loginCta: "Enviarme el enlace", loginSending: "Enviando…",
    loginErr: "Ese email no está vinculado a ninguna cuenta de cliente. Compruébalo o contáctanos.",
    loginSentTitle: "Revisa tu correo",
    loginSentSub: (email) => `Te hemos enviado un enlace de acceso seguro a ${email}. Funciona una sola vez y caduca pronto.`,
    loginBack: "Volver a lmcagents.app",
    loginExpired: "Ese enlace ha caducado o ya se ha usado. Pide uno nuevo.",

    ovTitle: "Resumen", ovSub: "Tu actividad, en directo.",
    statCalls: "Llamadas atendidas", statBookings: "Solicitudes de cita", statConv: "Conversión",
    statConvGoal: "sobre llamadas atendidas",
    recentCalls: "Últimas llamadas", viewAll: "Ver todas", noCalls: "Aún no hay llamadas.",
    noSummary: "Sin resumen aún.", unknown: "Desconocido",
    upcoming: "Próximas reservas", noUpcoming: "No hay próximas reservas.", noDateSet: "Sin fecha",

    callsTitle: "Historial de llamadas", callsSub: "Todas las llamadas gestionadas por tu IA.",
    callsEmptyTitle: "Aún no hay llamadas", callsEmptySub: "Las llamadas aparecerán aquí en cuanto tu IA empiece a contestar.",
    noPhone: "Número no capturado", back: "Volver a llamadas",

    detailDate: "Fecha", detailTime: "Hora", detailRequested: "Horario solicitado",
    detailUrgency: "Urgencia", detailSummary: "Resumen de la IA", detailTranscript: "Transcripción completa",
    detailBooking: "Reserva vinculada",

    calTitle: "Calendario", calSub: "Solicitudes de cita recogidas por tu IA.",
    calEmptyTitle: "Sin reservas", calEmptySub: "Las solicitudes de cita recogidas por tu IA aparecerán aquí.",
    calPending: "Solicitado, sin confirmar", calConfirmed: "Confirmado",
    calConfirm: "Confirmar", calConfirming: "Confirmando…", calConfirmed_: "Confirmado",
    calNoDate: "Sin fecha indicada", people: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,

    setTitle: "Ajustes", setSub: "Gestiona tu información y preferencias.",
    setBizInfo: "Información del negocio", setBizName: "Nombre del negocio",
    setEmail: "Email de notificación", setPhone: "Teléfono",
    setSave: "Guardar cambios", setSaved: "Guardado.",
    setDanger: "Zona de peligro", setDangerSub: "Esta acción es irreversible.", setSignOut: "Cerrar sesión",

    statusNew: "nueva", statusReview: "revisar", statusRequested: "solicitada",
    langName: "Español",
  },
  fr: {
    navOverview: "Aperçu", navCalls: "Appels", navCalendar: "Calendrier", navSettings: "Paramètres",
    navSignOut: "Déconnexion",
    loginTitle: "Espace client", loginSub: "Saisissez l'email de votre compte. Nous vous envoyons un lien sécurisé, aucun mot de passe à retenir.",
    loginLabel: "Email", loginPh: "vous@entreprise.com",
    loginCta: "M'envoyer le lien", loginSending: "Envoi…",
    loginErr: "Cet email n'est associé à aucun compte client. Vérifiez-le ou contactez-nous.",
    loginSentTitle: "Consultez votre boîte mail",
    loginSentSub: (email) => `Nous avons envoyé un lien de connexion sécurisé à ${email}. Il fonctionne une fois et expire rapidement.`,
    loginBack: "Retour à lmcagents.app",
    loginExpired: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",

    ovTitle: "Aperçu", ovSub: "Votre activité, en direct.",
    statCalls: "Appels traités", statBookings: "Demandes de rendez-vous", statConv: "Conversion",
    statConvGoal: "sur les appels traités",
    recentCalls: "Derniers appels", viewAll: "Tout voir", noCalls: "Aucun appel pour l'instant.",
    noSummary: "Pas encore de résumé.", unknown: "Inconnu",
    upcoming: "Prochains rendez-vous", noUpcoming: "Aucun rendez-vous à venir.", noDateSet: "Aucune date",

    callsTitle: "Historique des appels", callsSub: "Tous les appels gérés par votre IA.",
    callsEmptyTitle: "Aucun appel pour l'instant", callsEmptySub: "Les appels apparaîtront ici dès que votre IA commencera à répondre.",
    noPhone: "Numéro non capturé", back: "Retour aux appels",

    detailDate: "Date", detailTime: "Heure", detailRequested: "Horaire demandé",
    detailUrgency: "Urgence", detailSummary: "Résumé de l'IA", detailTranscript: "Transcription complète",
    detailBooking: "Rendez-vous lié",

    calTitle: "Calendrier", calSub: "Demandes de rendez-vous enregistrées par votre IA.",
    calEmptyTitle: "Aucun rendez-vous", calEmptySub: "Les demandes enregistrées par votre IA apparaîtront ici.",
    calPending: "Demandé, non confirmé", calConfirmed: "Confirmé",
    calConfirm: "Confirmer", calConfirming: "Confirmation…", calConfirmed_: "Confirmé",
    calNoDate: "Aucune date indiquée", people: (n) => `${n} ${n === 1 ? "personne" : "personnes"}`,

    setTitle: "Paramètres", setSub: "Gérez vos informations et préférences.",
    setBizInfo: "Informations de l'entreprise", setBizName: "Nom de l'entreprise",
    setEmail: "Email de notification", setPhone: "Téléphone",
    setSave: "Enregistrer", setSaved: "Enregistré.",
    setDanger: "Zone dangereuse", setDangerSub: "Cette action est irréversible.", setSignOut: "Déconnexion",

    statusNew: "nouveau", statusReview: "à vérifier", statusRequested: "demandée",
    langName: "Français",
  },
};
