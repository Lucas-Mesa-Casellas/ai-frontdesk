import type { Locale } from "./locale";

export type DashDict = {
  navOverview: string; navCalls: string; navCalendar: string; navSettings: string;
  navSignOut: string;
  loginTitle: string; loginSub: string; loginLabel: string; loginPh: string;
  loginCta: string; loginSending: string; loginErr: string;
  loginSentTitle: string; loginSentSub: (email: string) => string;
  loginBack: string; loginExpired: string;

  ovTitle: string; ovSub: string;
  statCalls: string; statBookings: string; statConv: string;
  noCalls: string; unknown: string;
  hourChartTitle: string; hourChartSub: string;
  chartTooltip: (label: string, count: number) => string;

  callsTitle: string; callsSub: string; callsEmptyTitle: string; callsEmptySub: string;
  noPhone: string; back: string;
  callsFilterFrom: string; callsFilterTo: string; callsFilterApply: string; callsFilterClear: string; callsFilterDatePlaceholder: string;
  callsFilterEmptyTitle: string; callsFilterEmptySub: string;
  callStatusCaptured: string; callStatusReview: string;
  urgencyLow: string; urgencyNormal: string; urgencyHigh: string;
  intentBookAppointment: string; intentCallback: string; intentInquiry: string; intentOther: string;

  detailDate: string; detailTime: string; detailRequested: string; detailUrgency: string; detailUrgent: string;
  detailSummary: string; detailTranscript: string; detailIntent: string;
  transcriptTranslateBtn: string; transcriptTranslating: string;
  transcriptShowOriginal: string; transcriptShowTranslated: string; transcriptTranslateError: string;

  calTitle: string; calSub: string; calEmptyTitle: string; calEmptySub: string;
  calPending: string; calConfirmed: string; calConfirm: string; calConfirming: string;
  calConfirmed_: string; calNoDate: string; calUndatedTitle: string; calSelectDay: string; calDayEmpty: string; calCancel: string; calCancelling: string; calCancelled: string; calStatsThisMonth: string; calActionError: string; calNoReason: string; calSeeCall: string; calChange: string; people: (n: number) => string;

  setTitle: string; setSub: string; setBizInfo: string; setBizName: string;
  setEmail: string; setPhone: string; setSave: string; setSaved: string; setSaveFailed: string;
  setDanger: string; setDangerSub: string; setSignOut: string;

  statusNew: string; statusReview: string; statusRequested: string;

  langName: string; navHome: string;
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
    statCalls: "Calls answered", statBookings: "Booking requests", statConv: "Booking rate",
    noCalls: "No calls yet.", unknown: "Unknown",
    hourChartTitle: "Calls by hour of day", hourChartSub: "When your calls tend to come in.",
    chartTooltip: (l, n) => `${l} — ${n} ${n === 1 ? "call" : "calls"}`,

    callsTitle: "Call history", callsSub: "Every call your AI receptionist has handled.",
    callsEmptyTitle: "No calls yet", callsEmptySub: "Calls will appear here once your AI starts answering.",
    noPhone: "Number not captured", back: "Back to calls",
    callsFilterFrom: "From", callsFilterTo: "To", callsFilterApply: "Filter", callsFilterClear: "Clear", callsFilterDatePlaceholder: "dd/mm/yyyy",
    callsFilterEmptyTitle: "No calls in this range", callsFilterEmptySub: "Try a different date range.",
    callStatusCaptured: "Request captured", callStatusReview: "Needs review",
    urgencyLow: "Low", urgencyNormal: "Normal", urgencyHigh: "High",
    intentBookAppointment: "Appointment request", intentCallback: "Callback request",
    intentInquiry: "General inquiry", intentOther: "Other",

    detailDate: "Date", detailTime: "Time", detailRequested: "Requested time",
    detailUrgency: "Urgency", detailUrgent: "Urgent", detailSummary: "AI summary", detailTranscript: "Full transcript",
    transcriptTranslateBtn: "Translate transcript", transcriptTranslating: "Translating…",
    transcriptShowOriginal: "Show original", transcriptShowTranslated: "Show translation",
    transcriptTranslateError: "Translation failed. Please try again.",
    detailIntent: "Call type",

    calTitle: "Calendar", calSub: "Booking requests captured by your AI.",
    calEmptyTitle: "No bookings", calEmptySub: "Booking requests captured by your AI will appear here.",
    calPending: "Requested", calConfirmed: "Confirmed",
    calConfirm: "Confirm", calConfirming: "Confirming…", calConfirmed_: "Confirmed",
    calNoDate: "No date given", calUndatedTitle: "Requests without a date", calSelectDay: "Select a day to see its bookings.", calDayEmpty: "No bookings this day.", calCancel: "Cancel", calCancelling: "Cancelling…", calCancelled: "Cancelled", calStatsThisMonth: "This month", calActionError: "Something went wrong. Please try again.", calNoReason: "No summary available", calSeeCall: "See call", calChange: "Change", people: (n) => `${n} ${n === 1 ? "person" : "people"}`,

    setTitle: "Settings", setSub: "Manage your business info and preferences.",
    setBizInfo: "Business information", setBizName: "Business name",
    setEmail: "Notification email", setPhone: "Phone number",
    setSave: "Save changes", setSaved: "Saved.",
    setSaveFailed: "Save failed — nothing was updated. Check permissions.",
    setDanger: "Account", setDangerSub: "You can log back in anytime with your email.", setSignOut: "Sign out",

    statusNew: "new", statusReview: "needs review", statusRequested: "requested",
    navHome: "Home",
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
    statCalls: "Llamadas atendidas", statBookings: "Solicitudes de cita", statConv: "Tasa de reserva",
    noCalls: "Aún no hay llamadas.", unknown: "Desconocido",
    hourChartTitle: "Llamadas por hora del día", hourChartSub: "Cuándo suelen llegar tus llamadas.",
    chartTooltip: (l, n) => `${l} — ${n} ${n === 1 ? "llamada" : "llamadas"}`,

    callsTitle: "Historial de llamadas", callsSub: "Todas las llamadas gestionadas por tu IA.",
    callsEmptyTitle: "Aún no hay llamadas", callsEmptySub: "Las llamadas aparecerán aquí en cuanto tu IA empiece a contestar.",
    noPhone: "Número no capturado", back: "Volver a llamadas",
    callsFilterFrom: "Desde", callsFilterTo: "Hasta", callsFilterApply: "Filtrar", callsFilterClear: "Quitar filtro", callsFilterDatePlaceholder: "dd/mm/aaaa",
    callsFilterEmptyTitle: "No hay llamadas en este rango", callsFilterEmptySub: "Prueba con otro rango de fechas.",
    callStatusCaptured: "Solicitud registrada", callStatusReview: "Necesita revisión",
    urgencyLow: "Baja", urgencyNormal: "Normal", urgencyHigh: "Alta",
    intentBookAppointment: "Solicitud de cita", intentCallback: "Solicitud de llamada",
    intentInquiry: "Consulta general", intentOther: "Otro",

    detailDate: "Fecha", detailTime: "Hora", detailRequested: "Horario solicitado",
    detailUrgency: "Urgencia", detailUrgent: "Urgente", detailSummary: "Resumen de la IA", detailTranscript: "Transcripción completa",
    transcriptTranslateBtn: "Traducir transcripción", transcriptTranslating: "Traduciendo…",
    transcriptShowOriginal: "Ver original", transcriptShowTranslated: "Ver traducción",
    transcriptTranslateError: "No se pudo traducir. Inténtalo de nuevo.",
    detailIntent: "Tipo de llamada",

    calTitle: "Calendario", calSub: "Solicitudes de cita recogidas por tu IA.",
    calEmptyTitle: "Sin reservas", calEmptySub: "Las solicitudes de cita recogidas por tu IA aparecerán aquí.",
    calPending: "Solicitado", calConfirmed: "Confirmado",
    calConfirm: "Confirmar", calConfirming: "Confirmando…", calConfirmed_: "Confirmado",
    calNoDate: "Sin fecha indicada", calUndatedTitle: "Solicitudes sin fecha", calSelectDay: "Selecciona un día para ver sus citas.", calDayEmpty: "Sin citas ese día.", calCancel: "Cancelar", calCancelling: "Cancelando…", calCancelled: "Cancelado", calStatsThisMonth: "Este mes", calActionError: "Algo salió mal. Inténtalo de nuevo.", calNoReason: "Sin resumen disponible", calSeeCall: "Ver llamada", calChange: "Cambiar", people: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,

    setTitle: "Ajustes", setSub: "Gestiona tu información y preferencias.",
    setBizInfo: "Información del negocio", setBizName: "Nombre del negocio",
    setEmail: "Email de notificación", setPhone: "Teléfono",
    setSave: "Guardar cambios", setSaved: "Guardado.",
    setSaveFailed: "No se pudo guardar — no se actualizó nada. Comprueba los permisos.",
    setDanger: "Cuenta", setDangerSub: "Puedes volver a entrar cuando quieras con tu email.", setSignOut: "Cerrar sesión",

    statusNew: "nueva", statusReview: "revisar", statusRequested: "solicitada",
    navHome: "Inicio",
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
    statCalls: "Appels traités", statBookings: "Demandes de rendez-vous", statConv: "Taux de réservation",
    noCalls: "Aucun appel pour l'instant.", unknown: "Inconnu",
    hourChartTitle: "Appels par heure de la journée", hourChartSub: "À quel moment vos appels arrivent le plus souvent.",
    chartTooltip: (l, n) => `${l} — ${n} ${n === 1 ? "appel" : "appels"}`,

    callsTitle: "Historique des appels", callsSub: "Tous les appels gérés par votre IA.",
    callsEmptyTitle: "Aucun appel pour l'instant", callsEmptySub: "Les appels apparaîtront ici dès que votre IA commencera à répondre.",
    noPhone: "Numéro non capturé", back: "Retour aux appels",
    callsFilterFrom: "Du", callsFilterTo: "Au", callsFilterApply: "Filtrer", callsFilterClear: "Effacer", callsFilterDatePlaceholder: "jj/mm/aaaa",
    callsFilterEmptyTitle: "Aucun appel sur cette période", callsFilterEmptySub: "Essayez une autre période.",
    callStatusCaptured: "Demande enregistrée", callStatusReview: "À vérifier",
    urgencyLow: "Faible", urgencyNormal: "Normale", urgencyHigh: "Élevée",
    intentBookAppointment: "Demande de rendez-vous", intentCallback: "Demande de rappel",
    intentInquiry: "Demande d'information", intentOther: "Autre",

    detailDate: "Date", detailTime: "Heure", detailRequested: "Horaire demandé",
    detailUrgency: "Urgence", detailUrgent: "Urgent", detailSummary: "Résumé de l'IA", detailTranscript: "Transcription complète",
    transcriptTranslateBtn: "Traduire la transcription", transcriptTranslating: "Traduction…",
    transcriptShowOriginal: "Voir l'original", transcriptShowTranslated: "Voir la traduction",
    transcriptTranslateError: "La traduction a échoué. Veuillez réessayer.",
    detailIntent: "Type d'appel",

    calTitle: "Calendrier", calSub: "Demandes de rendez-vous enregistrées par votre IA.",
    calEmptyTitle: "Aucun rendez-vous", calEmptySub: "Les demandes enregistrées par votre IA apparaîtront ici.",
    calPending: "Demandé", calConfirmed: "Confirmé",
    calConfirm: "Confirmer", calConfirming: "Confirmation…", calConfirmed_: "Confirmé",
    calNoDate: "Aucune date indiquée", calUndatedTitle: "Demandes sans date", calSelectDay: "Sélectionnez un jour pour voir ses rendez-vous.", calDayEmpty: "Aucun rendez-vous ce jour.", calCancel: "Annuler", calCancelling: "Annulation…", calCancelled: "Annulé", calStatsThisMonth: "Ce mois-ci", calActionError: "Une erreur est survenue. Veuillez réessayer.", calNoReason: "Aucun résumé disponible", calSeeCall: "Voir l'appel", calChange: "Modifier", people: (n) => `${n} ${n === 1 ? "personne" : "personnes"}`,

    setTitle: "Paramètres", setSub: "Gérez vos informations et préférences.",
    setBizInfo: "Informations de l'entreprise", setBizName: "Nom de l'entreprise",
    setEmail: "Email de notification", setPhone: "Téléphone",
    setSave: "Enregistrer", setSaved: "Enregistré.",
    setSaveFailed: "Échec de l'enregistrement — rien n'a été mis à jour. Vérifiez les permissions.",
    setDanger: "Compte", setDangerSub: "Vous pouvez vous reconnecter à tout moment avec votre email.", setSignOut: "Déconnexion",

    statusNew: "nouveau", statusReview: "à vérifier", statusRequested: "demandée",
    navHome: "Accueil",
    langName: "Français",
  },
};
