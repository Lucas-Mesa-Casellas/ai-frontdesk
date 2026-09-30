// Sample content for the interactive demo of the client dashboard. Everything
// here is fictional: invented business names, invented people, reserved or
// masked phone numbers. Nothing in this file (or lib/demo/*) reads or writes a
// real database.
//
// k: book | cb (callback) | inq (inquiry) | other.  u: urgency.
// nt: the summary has no time reference.  unknown: the caller left no details.
// c1 / a1 / c2: the caller's opening, the agent's follow-up, the caller's answer.

export type Locale = "en" | "es" | "fr";
export type Kind = "book" | "cb" | "inq" | "other";
export type Scenario = {
  k: Kind; u: "low" | "normal" | "high"; nt?: boolean; unknown?: boolean;
  s: string; tp: string | null; pref?: string; c1?: string; a1?: string; c2?: string;
};
export type LocaleScenarios = {
  business: { name: string; language: Locale; country: string; email: string };
  opener: string;
  bookClose: (pref: string) => string;
  cbClose: string;
  inqClose: string;
  nameLine: (name: string) => string;
  bye: (first: string) => string;
  unknownLines: [string, string][];
  outcome: { book: string; bookHigh: string; cb: string; inq: string; other: string };
  undatedPref: string;
  names: string[];
  phone: (r: () => number) => string;
  scen: Scenario[];
};

export const SCENARIOS: Record<Locale, LocaleScenarios> = {
  fr: {
    business: { name: "Plomberie Nordvelle", language: "fr", country: "FR", email: "contact@nordvelle.example" },
    opener: "Bonjour, vous êtes bien chez Plomberie Nordvelle, comment puis-je vous aider ?",
    bookClose: (pref) => `Très bien, j'ai noté votre demande pour ${pref}. L'équipe vous confirmera l'horaire rapidement. Puis-je avoir votre nom ?`,
    cbClose: "C'est noté, je transmets votre demande de rappel à l'équipe. Puis-je avoir votre nom ?",
    inqClose: "Je transmets votre question à l'équipe, qui reviendra vers vous si besoin. Puis-je avoir votre nom ?",
    nameLine: (n) => `${n}.`,
    bye: (f) => `Merci ${f}, c'est enregistré. Bonne journée.`,
    unknownLines: [["Agent", "Bonjour, vous êtes bien chez Plomberie Nordvelle, comment puis-je vous aider ?"], ["User", "Allô ?"]],
    outcome: { book: "Rendez-vous demandé", bookHigh: "Intervention urgente demandée", cb: "Rappel demandé", inq: "Renseignement donné", other: "Appel interrompu" },
    undatedPref: "à convenir",
    names: ["Nadia Fournier", "Baptiste Lemaire", "Inès Carvalho", "Olivier Roche", "Margaux Delorme", "Yann Perrot", "Sabrina Costa", "Thibault Gaillard", "Élodie Mercier", "Karim Benali", "Laure Vidal", "Hugo Descamps", "Agnès Rivière", "Mathieu Colin", "Léa Fontaine", "Clémence Guyot", "Antoine Bellec", "Sonia Lambert", "Romain Chevalier", "Justine Marchand", "David Nguyen", "Charlotte Poirier", "Étienne Vasseur", "Maëlle Renaud", "Pierre Lacombe", "Anaïs Dupuy", "Vincent Morel", "Noémie Thibault", "Fabien Rey", "Claire Duval"],
    phone: (r) => (r() < 0.72 ? `+33 6 39 98 ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))}` : `+33 1 99 00 ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))}`),
    scen: [
      { k: "book", u: "normal", s: "Fuite sous l'évier de la cuisine, souhaite une intervention rapide dans la semaine.", tp: "Fuite d'eau", pref: "jeudi matin", c1: "Bonjour, j'ai une fuite sous l'évier de ma cuisine, ça goutte en continu.", a1: "D'accord. Le robinet d'arrêt sous l'évier est-il accessible pour couper l'eau ?", c2: "Oui, je l'ai fermé, mais il faudrait que quelqu'un passe rapidement." },
      { k: "book", u: "high", s: "Chaudière en panne depuis ce matin, plus d'eau chaude ni de chauffage, demande une intervention en urgence.", tp: "Panne de chaudière", pref: "aujourd'hui", c1: "Ma chaudière ne démarre plus depuis ce matin, je n'ai plus ni chauffage ni eau chaude.", a1: "Je suis désolé. Est-ce qu'un code d'erreur s'affiche sur l'écran de la chaudière ?", c2: "Oui, il y a un code qui clignote, et j'ai des enfants à la maison." },
      { k: "book", u: "normal", s: "Radiateur du salon qui ne chauffe plus en bas, demande un passage pour le purger et vérifier l'installation.", tp: "Radiateur", pref: "lundi après-midi", c1: "Un de mes radiateurs reste froid en bas et chaud en haut, je pense qu'il faut le purger.", a1: "Très bien. Les autres radiateurs de l'appartement chauffent-ils normalement ?", c2: "Oui, seulement celui du salon pose problème." },
      { k: "book", u: "normal", nt: true, s: "Demande un entretien annuel de la chaudière à gaz avant l'hiver.", tp: "Entretien chaudière", pref: "la semaine prochaine, plutôt en fin de journée", c1: "Je voudrais prendre rendez-vous pour l'entretien annuel de ma chaudière à gaz.", a1: "Bien sûr. Savez-vous quel âge a la chaudière ?", c2: "Elle a été installée il y a six ans, c'est une chaudière murale." },
      { k: "book", u: "high", s: "WC bouché avec débordement, demande un débouchage en urgence.", tp: "Débouchage", pref: "aujourd'hui", c1: "Mes toilettes sont bouchées et ça déborde, j'ai besoin de quelqu'un rapidement.", a1: "Je comprends. Avez-vous pu couper l'arrivée d'eau du WC ?", c2: "Oui, c'est fait, mais l'eau ne descend plus du tout." },
      { k: "book", u: "normal", s: "Ballon d'eau chaude qui goutte au niveau du groupe de sécurité, souhaite un diagnostic.", tp: "Chauffe-eau", pref: "vendredi matin", c1: "Mon ballon d'eau chaude goutte en dessous, il y a une petite flaque.", a1: "D'accord. Le ballon est-il installé dans un placard ou dans une pièce à part ?", c2: "Dans un placard de la salle de bain." },
      { k: "book", u: "normal", nt: true, s: "Remplacement du mitigeur de la douche, qui fuit à la base.", tp: "Robinetterie", pref: "mardi en fin de matinée", c1: "Le mitigeur de ma douche fuit à la base, je voudrais le faire remplacer.", a1: "Très bien. Avez-vous déjà le nouveau mitigeur ou faut-il le fournir ?", c2: "Non, je n'ai rien, je compte sur vous pour le fournir." },
      { k: "book", u: "low", nt: true, s: "Robinet de salle de bain qui goutte, sans urgence, souhaite un créneau la semaine prochaine.", tp: "Robinetterie", pref: "mercredi après-midi", c1: "Le robinet de ma salle de bain goutte, rien d'urgent mais j'aimerais que ce soit réparé.", a1: "Pas de souci. Le robinet fuit-il quand il est fermé ?", c2: "Oui, un petit goutte-à-goutte constant." },
      { k: "book", u: "high", s: "Dégât des eaux : l'eau coule du plafond depuis l'étage du dessus, demande un plombier en urgence.", tp: "Dégât des eaux", pref: "aujourd'hui", c1: "De l'eau coule du plafond de ma cuisine, je crois que ça vient de chez le voisin du dessus.", a1: "Je suis désolé. Avez-vous pu prévenir votre voisin et couper l'eau chez vous ?", c2: "Oui, il a coupé l'arrivée d'eau, mais le plafond est déjà mouillé." },
      { k: "cb", u: "normal", s: "Demande à être rappelé au sujet d'un devis pour la rénovation d'une salle de bain.", tp: "Devis", c1: "Je voudrais un devis pour rénover entièrement ma salle de bain.", a1: "Bien sûr. S'agit-il d'un appartement ou d'une maison ?", c2: "Un appartement, deux pièces, au troisième étage." },
      { k: "cb", u: "normal", s: "Souhaite un devis pour l'installation d'un sèche-serviettes électrique dans la salle de bain.", tp: "Devis", c1: "J'aimerais faire installer un sèche-serviettes électrique, pouvez-vous me rappeler pour un devis ?", a1: "Oui. Y a-t-il déjà une arrivée électrique à l'endroit prévu ?", c2: "Oui, une prise est déjà en place." },
      { k: "cb", u: "normal", s: "Rappelle au sujet de l'intervention de la semaine dernière et demande à parler au plombier.", tp: "Suivi d'intervention", c1: "Votre plombier est passé la semaine dernière et j'ai une question sur ce qui a été fait.", a1: "Je transmets. Pouvez-vous me dire de quoi il s'agit ?", c2: "Le radiateur refait un peu de bruit depuis." },
      { k: "cb", u: "normal", s: "Demande un rappel concernant une facture reçue et le détail de la main-d'œuvre.", tp: "Facturation", c1: "J'ai reçu ma facture et j'aurais une question sur le détail de la main-d'œuvre.", a1: "Bien sûr. Avez-vous le numéro de la facture ?", c2: "Oui, je le retrouve et je vous le donne." },
      { k: "cb", u: "normal", s: "Souhaite être rappelé pour discuter du remplacement de sa chaudière fioul par une pompe à chaleur.", tp: "Devis", c1: "Je réfléchis à remplacer ma chaudière fioul par une pompe à chaleur, pouvez-vous me rappeler ?", a1: "Volontiers. Est-ce pour une maison individuelle ?", c2: "Oui, une maison de 110 mètres carrés." },
      { k: "inq", u: "low", s: "Se renseigne sur les frais de déplacement et les horaires d'intervention le samedi.", tp: "Tarifs et horaires", c1: "Bonjour, je voudrais savoir si vous intervenez le samedi et ce que coûte un déplacement.", a1: "Je note votre question. Est-ce pour une urgence ?", c2: "Non, ce serait pour un petit dépannage, sans urgence." },
      { k: "inq", u: "low", s: "Demande si l'équipe intervient dans le 20e arrondissement et en proche banlieue.", tp: "Zone d'intervention", c1: "Est-ce que vous intervenez dans le 20e arrondissement ?", a1: "Je note votre question. Dans quelle rue se trouve le logement ?", c2: "Près de la place Gambetta." },
      { k: "inq", u: "low", s: "Veut savoir si un contrat d'entretien annuel est proposé pour une chaudière à gaz.", tp: "Contrat d'entretien", c1: "Proposez-vous un contrat d'entretien annuel pour une chaudière à gaz ?", a1: "Je note votre question. Est-ce pour un logement ou un local professionnel ?", c2: "Pour mon appartement." },
      { k: "inq", u: "low", s: "Demande quel est le délai habituel pour une intervention hors urgence.", tp: "Délais", c1: "En général, sous quel délai pouvez-vous intervenir quand ce n'est pas urgent ?", a1: "Je note votre question. De quel type de problème s'agit-il ?", c2: "Un joint de baignoire à refaire et une fuite légère." },
      { k: "inq", u: "low", s: "Se demande si l'équipe intervient sur des installations de chauffage collectif.", tp: "Prestations", c1: "Je suis syndic bénévole, vous intervenez sur du chauffage collectif ?", a1: "Je note votre question. Combien de logements l'immeuble compte-t-il ?", c2: "Une douzaine d'appartements." },
      { k: "inq", u: "low", s: "Demande quels moyens de paiement sont acceptés après l'intervention.", tp: "Paiement", c1: "Après l'intervention, je peux payer comment ?", a1: "Je note votre question. Avez-vous déjà eu un devis ?", c2: "Non, pas encore, c'était pour savoir." },
      { k: "other", u: "normal", unknown: true, s: "Appel coupé après l'accueil, aucun détail recueilli.", tp: null },
      { k: "other", u: "normal", s: "Message laissé pour le plombier, sans demande précise.", tp: "Message", c1: "Je voulais laisser un message pour le plombier qui est venu l'autre jour.", a1: "Bien sûr. Pouvez-vous préciser votre message ?", c2: "Dites-lui simplement que je le rappellerai." },
      { k: "other", u: "low", s: "Démarchage commercial sans lien avec l'activité de l'entreprise.", tp: "Démarchage", c1: "Bonjour, je vous appelle pour vous proposer une offre de fournitures de bureau.", a1: "Je vous remercie, nous ne sommes pas intéressés.", c2: "Très bien, bonne journée." },
    ],
  },

  es: {
    business: { name: "Casaliva Inmobiliaria", language: "es", country: "ES", email: "contacto@casaliva.example" },
    opener: "Hola, ha llamado a Casaliva Inmobiliaria, ¿en qué puedo ayudarle?",
    bookClose: (pref) => `Perfecto, he anotado su solicitud para ${pref}. El equipo le confirmará la hora en breve. ¿Me dice su nombre?`,
    cbClose: "Anotado, paso su petición de llamada al equipo. ¿Me dice su nombre?",
    inqClose: "Paso su consulta al equipo, que le responderá si hace falta. ¿Me dice su nombre?",
    nameLine: (n) => `${n}.`,
    bye: (f) => `Gracias, ${f}, queda registrado. Que tenga un buen día.`,
    unknownLines: [["Agent", "Hola, ha llamado a Casaliva Inmobiliaria, ¿en qué puedo ayudarle?"], ["User", "¿Hola?"]],
    outcome: { book: "Cita solicitada", bookHigh: "Visita urgente solicitada", cb: "Llamada solicitada", inq: "Consulta atendida", other: "Llamada interrumpida" },
    undatedPref: "a convenir",
    names: ["Lucía Ortega", "Javier Molina", "Carmen Bautista", "Andrés Villalba", "Marta Quintero", "Sergio Navarro", "Paula Escudero", "Rafael Cordero", "Inmaculada Peña", "Diego Salvatierra", "Beatriz Lozano", "Álvaro Miranda", "Rocío Herrera", "Ignacio Duarte", "Elena Cabrera", "Miguel Ángel Soler", "Nuria Camacho", "Fernando Aguilar", "Lorena Pardo", "Adrián Ibáñez", "Sonia Trujillo", "Tomás Bermúdez", "Alicia Montero", "Cristian Prieto", "Yolanda Serrano", "Raúl Meléndez", "Silvia Arroyo", "Enrique Lara", "Patricia Cano", "Óscar Beltrán"],
    phone: (r) => `+34 6•• ••• ${String(100 + Math.floor(r() * 899))}`,
    scen: [
      { k: "book", u: "normal", s: "Gotera en el baño del apartamento, solicita una visita de mantenimiento esta semana.", tp: "Mantenimiento", pref: "el jueves por la mañana", c1: "Hola, soy inquilino de un apartamento de Nueva Andalucía y tengo una gotera en el baño.", a1: "Lamento oírlo. ¿La filtración viene del techo o de las tuberías?", c2: "Del techo, justo encima de la ducha." },
      { k: "book", u: "high", s: "Sin agua caliente en una vivienda ocupada, solicita una reparación urgente.", tp: "Avería", pref: "hoy", c1: "No tenemos agua caliente desde anoche y vivimos cuatro personas en el piso.", a1: "Lo siento mucho. ¿El termo está encendido y sin ninguna luz de error?", c2: "Sí, está encendido, pero el agua sale fría." },
      { k: "book", u: "normal", s: "Interesada en visitar un apartamento de alquiler de larga temporada en Puerto Banús.", tp: "Visita de vivienda", pref: "el sábado a mediodía", c1: "Quería ver el apartamento de alquiler de larga temporada que tienen anunciado en Puerto Banús.", a1: "Claro. ¿Para cuántas personas sería la vivienda?", c2: "Para dos, mi pareja y yo." },
      { k: "book", u: "normal", s: "El aire acondicionado del salón no enfría, pide una revisión.", tp: "Climatización", pref: "el lunes por la tarde", c1: "El aire acondicionado del salón no enfría y con este calor es imposible.", a1: "Entiendo. ¿Hace algún ruido o se apaga solo?", c2: "Funciona, pero solo sopla aire templado." },
      { k: "book", u: "high", s: "Ha perdido las llaves y no puede entrar en la vivienda, necesita ayuda con urgencia.", tp: "Cerrajería", pref: "hoy", c1: "He perdido las llaves del piso y no puedo entrar, estoy en la puerta.", a1: "Lo siento. ¿Hay alguien dentro de la vivienda o está vacía?", c2: "Está vacía, vivo solo." },
      { k: "book", u: "normal", nt: true, s: "Solicita agendar la entrega de llaves y la revisión del inventario de la vivienda.", tp: "Entrega de llaves", pref: "el martes a las diez", c1: "Quisiera concertar la entrega de llaves del apartamento que voy a dejar.", a1: "Por supuesto. ¿Ya tiene hecho el inventario?", c2: "Sí, tengo la lista de lo que había." },
      { k: "book", u: "high", s: "Filtración de agua desde la vivienda del piso superior, solicita una visita urgente.", tp: "Filtración", pref: "hoy", c1: "Me cae agua del techo del salón, creo que viene del piso de arriba.", a1: "Lamento la situación. ¿Ha podido avisar a los vecinos de arriba?", c2: "Sí, han cerrado la llave de paso, pero el techo ya está mojado." },
      { k: "book", u: "normal", s: "Propietario que quiere valorar su vivienda para alquiler vacacional y pide una visita.", tp: "Valoración", pref: "el miércoles por la tarde", c1: "Soy propietario de un apartamento cerca de la playa y me gustaría valorarlo para alquiler vacacional.", a1: "Muy bien. ¿Cuántos dormitorios tiene?", c2: "Dos dormitorios y una terraza grande." },
      { k: "book", u: "low", nt: true, s: "Cambio de cerradura tras una mudanza, sin urgencia.", tp: "Cerrajería", pref: "la semana que viene, por la mañana", c1: "Acabo de mudarme y quisiera cambiar la cerradura, sin prisa.", a1: "Perfecto. ¿Es una puerta de entrada estándar?", c2: "Sí, una puerta normal de piso." },
      { k: "cb", u: "normal", s: "Pide que le devuelvan la llamada sobre la renovación de su contrato de alquiler.", tp: "Renovación de contrato", c1: "Mi contrato de alquiler termina en dos meses y quisiera hablar de la renovación.", a1: "Claro. ¿Prefiere que le llame una persona del equipo?", c2: "Sí, por favor, por la mañana si es posible." },
      { k: "cb", u: "normal", s: "Un propietario solicita que le llamen para hablar del informe mensual de su vivienda.", tp: "Informe al propietario", c1: "Soy propietario y quería comentar el último informe mensual de mi apartamento.", a1: "Por supuesto. ¿Hay algo concreto que le haya llamado la atención?", c2: "Unos gastos de mantenimiento que no me cuadran." },
      { k: "cb", u: "normal", s: "Consulta sobre la devolución de la fianza y pide una llamada de un responsable.", tp: "Fianza", c1: "Dejé el piso hace un mes y todavía no me han devuelto la fianza.", a1: "Lamento la espera. ¿Recuerda la dirección de la vivienda?", c2: "Sí, es en Nueva Andalucía." },
      { k: "cb", u: "normal", s: "Quiere hablar con el gestor sobre un recibo de comunidad.", tp: "Comunidad", c1: "Tengo una duda sobre el último recibo de la comunidad de propietarios.", a1: "Entendido. ¿Me puede decir a qué vivienda corresponde?", c2: "Al segundo B del edificio." },
      { k: "cb", u: "normal", s: "Pide presupuesto para gestionar el alquiler de un segundo apartamento.", tp: "Presupuesto", c1: "Ya tengo un apartamento con ustedes y quiero añadir un segundo.", a1: "Estupendo. ¿Está también en la zona de Marbella?", c2: "Sí, en el centro." },
      { k: "inq", u: "low", s: "Pregunta por los precios y la disponibilidad de alquileres de larga temporada en la zona.", tp: "Disponibilidad", c1: "Buenas, ¿tienen apartamentos de larga temporada disponibles en Marbella?", a1: "Tomo nota de su consulta. ¿Para cuándo lo necesitaría?", c2: "Para principios del mes que viene." },
      { k: "inq", u: "low", s: "Quiere saber qué incluye el servicio de gestión de alquiler para propietarios.", tp: "Servicios", c1: "Quisiera saber qué incluye el servicio de gestión de alquiler para propietarios.", a1: "Tomo nota de su consulta. ¿Ya tiene la vivienda alquilada?", c2: "Todavía no, la tengo vacía." },
      { k: "inq", u: "low", s: "Consulta el horario de atención de la oficina y si atienden los sábados.", tp: "Horarios", c1: "¿Abren la oficina los sábados por la mañana?", a1: "Tomo nota de su consulta. ¿Es para una visita o para un trámite?", c2: "Para dejar unos documentos." },
      { k: "inq", u: "low", s: "Pregunta si se admiten mascotas en las viviendas de alquiler.", tp: "Condiciones", c1: "Tengo un perro pequeño, ¿admiten mascotas en los pisos de alquiler?", a1: "Tomo nota de su consulta. ¿Qué tipo de vivienda busca?", c2: "Un apartamento de dos habitaciones." },
      { k: "inq", u: "low", s: "Pregunta cuánto tarda el propietario en cobrar tras cada mensualidad.", tp: "Pagos", c1: "Soy propietario, ¿cuánto tardan en ingresarme el alquiler cada mes?", a1: "Tomo nota de su consulta. ¿Ya es cliente de la agencia?", c2: "Sí, desde el año pasado." },
      { k: "inq", u: "low", s: "Duda sobre los gastos de suministros que van incluidos en el alquiler.", tp: "Suministros", c1: "En mi contrato no me queda claro qué suministros van incluidos en el alquiler.", a1: "Tomo nota de su consulta. ¿Sabe el número de referencia de su contrato?", c2: "Lo busco y se lo digo otro día." },
      { k: "other", u: "normal", unknown: true, s: "Llamada cortada tras el saludo, sin detalles recogidos.", tp: null },
      { k: "other", u: "normal", s: "Mensaje para el gestor de su vivienda, sin una petición concreta.", tp: "Mensaje", c1: "Quería dejarle un mensaje al gestor que lleva mi piso.", a1: "Por supuesto. ¿Qué le digo de su parte?", c2: "Que le llamaré yo esta semana." },
      { k: "other", u: "low", s: "Llamada comercial sin relación con la actividad de la empresa.", tp: "Publicidad", c1: "Buenas, le llamo para ofrecerle un servicio de telefonía para empresas.", a1: "Gracias, pero no nos interesa.", c2: "Muy bien, que tenga buen día." },
    ],
  },

  en: {
    business: { name: "Kestrelwick Heating", language: "en", country: "GB", email: "hello@kestrelwick.example" },
    opener: "Hello, you've reached Kestrelwick Heating, how can I help?",
    bookClose: (pref) => `Great, I've noted your request for ${pref}. The team will confirm the time shortly. Can I take your name?`,
    cbClose: "Noted, I'll pass your callback request to the team. Can I take your name?",
    inqClose: "I'll pass your question on to the team, who'll get back to you if needed. Can I take your name?",
    nameLine: (n) => `It's ${n}.`,
    bye: (f) => `Thank you, ${f}, that's all recorded. Have a good day.`,
    unknownLines: [["Agent", "Hello, you've reached Kestrelwick Heating, how can I help?"], ["User", "Hello?"]],
    outcome: { book: "Visit requested", bookHigh: "Urgent visit requested", cb: "Callback requested", inq: "Question answered", other: "Call cut off" },
    undatedPref: "to be arranged",
    names: ["Oliver Hartley", "Priya Nair", "Callum Reyes", "Hannah Whitcombe", "Tomasz Brandt", "Aisha Rahman", "Ewan Gallagher", "Sophie Lindqvist", "Marcus Adeyemi", "Freya Kavanagh", "Daniel Osei", "Imogen Pryce", "Rohan Malhotra", "Ellie Fenwick", "Jamal Hussain", "Georgia Tennant", "Niall Brennan", "Chloe Ashworth", "Kwame Boateng", "Rachel Somerton", "Ben Okafor", "Isla Fairbrother", "Luca Ferraro", "Megan Pollard", "Sanjay Verma", "Harriet Lowe", "Dominic Cray", "Yasmin Qureshi", "Adam Whitlock", "Nora Ellery"],
    phone: (r) => `+44 7700 900${String(100 + Math.floor(r() * 899))}`,
    scen: [
      { k: "book", u: "normal", s: "Leak under the kitchen sink, wants a plumber to visit this week.", tp: "Water leak", pref: "Thursday morning", c1: "Hi, I've got a leak under my kitchen sink, it's dripping constantly.", a1: "I'm sorry to hear that. Can you reach the isolation valve under the sink to turn the water off?", c2: "Yes, I've turned it off, but I'd like someone to come quickly." },
      { k: "book", u: "high", s: "Boiler broken down since this morning, no heating or hot water, needs an urgent visit.", tp: "Boiler breakdown", pref: "today", c1: "My boiler stopped working this morning, so no heating and no hot water.", a1: "I'm sorry about that. Is there an error code showing on the boiler display?", c2: "Yes, there's a code flashing, and I've got young kids at home." },
      { k: "book", u: "normal", s: "Living room radiator stays cold at the bottom, asking for a bleed and a check of the system.", tp: "Radiator", pref: "Monday afternoon", c1: "One of my radiators is cold at the bottom and hot at the top, I think it needs bleeding.", a1: "Sure. Are the other radiators in the flat heating up properly?", c2: "Yes, it's only the one in the living room." },
      { k: "book", u: "normal", nt: true, s: "Annual gas boiler service, wants a slot before the winter.", tp: "Boiler service", pref: "next week, ideally late afternoon", c1: "I'd like to book the annual service for my gas boiler.", a1: "Of course. Roughly how old is the boiler?", c2: "It was fitted about six years ago, it's a wall-hung one." },
      { k: "book", u: "high", s: "Blocked toilet overflowing, needs an urgent call-out.", tp: "Blocked drain", pref: "today", c1: "My toilet is blocked and it's overflowing, I need someone quickly.", a1: "I understand. Have you been able to turn off the water supply to the toilet?", c2: "Yes, but nothing is going down at all." },
      { k: "book", u: "normal", s: "Hot water cylinder dripping from the pressure relief valve, wants it looked at.", tp: "Hot water cylinder", pref: "Friday morning", c1: "My hot water cylinder is dripping and there's a small puddle underneath.", a1: "Okay. Is the cylinder in an airing cupboard?", c2: "Yes, in the bathroom airing cupboard." },
      { k: "book", u: "normal", nt: true, s: "Shower mixer leaking at the base, asks for a replacement.", tp: "Taps and mixers", pref: "Tuesday late morning", c1: "The mixer on my shower is leaking at the base and I'd like it replaced.", a1: "Sure. Do you already have the new mixer, or does it need supplying?", c2: "I haven't got one, I'd need you to supply it." },
      { k: "book", u: "low", nt: true, s: "Dripping bathroom tap, low priority, wants a slot next week.", tp: "Taps and mixers", pref: "Wednesday afternoon", c1: "The tap in my bathroom keeps dripping, nothing urgent but I'd like it fixed.", a1: "No problem. Does it drip when it's fully closed?", c2: "Yes, a slow constant drip." },
      { k: "book", u: "high", s: "Water coming through the ceiling from the flat above, needs a plumber urgently.", tp: "Water damage", pref: "today", c1: "Water is coming through my kitchen ceiling, I think it's from the flat above.", a1: "I'm sorry. Have you been able to tell your neighbour and turn off your water?", c2: "They've turned their water off, but the ceiling is already soaked." },
      { k: "cb", u: "normal", s: "Asks for a callback about a quote for a bathroom refit.", tp: "Quote", c1: "I'd like a quote for a full bathroom refit.", a1: "Of course. Is it a flat or a house?", c2: "A two-bedroom flat on the third floor." },
      { k: "cb", u: "normal", s: "Wants a quote for fitting an electric heated towel rail in the bathroom.", tp: "Quote", c1: "I'd like an electric heated towel rail fitted, can someone call me back with a quote?", a1: "Yes. Is there already a socket where it will go?", c2: "Yes, there's a socket on that wall." },
      { k: "cb", u: "normal", s: "Calling about last week's visit and asks to speak to the plumber.", tp: "Follow-up", c1: "Your plumber came round last week and I have a question about the work.", a1: "I'll pass that on. Can you tell me what it's about?", c2: "The radiator has started making a noise again." },
      { k: "cb", u: "normal", s: "Asks for a callback about an invoice and the breakdown of the labour charge.", tp: "Invoicing", c1: "I've received my invoice and I have a question about the labour charge.", a1: "Of course. Do you have the invoice number to hand?", c2: "I'll find it and give it to whoever calls me." },
      { k: "cb", u: "normal", s: "Wants a callback to discuss replacing an oil boiler with a heat pump.", tp: "Quote", c1: "I'm thinking of replacing my oil boiler with a heat pump, could someone call me?", a1: "Happy to. Is it a detached house?", c2: "Yes, about 110 square metres." },
      { k: "inq", u: "low", s: "Asks about the call-out fee and Saturday opening hours.", tp: "Prices and hours", c1: "Hi, do you work on Saturdays, and what's the call-out fee?", a1: "I'll note your question. Is it an emergency?", c2: "No, it's a small repair, nothing urgent." },
      { k: "inq", u: "low", s: "Asks whether the team covers the north London area.", tp: "Areas covered", c1: "Do you cover the north of the city?", a1: "I'll note your question. Which street is the property on?", c2: "It's near the park, just off the high street." },
      { k: "inq", u: "low", s: "Wants to know whether an annual service plan is offered for a gas boiler.", tp: "Service plan", c1: "Do you offer an annual service plan for a gas boiler?", a1: "I'll note your question. Is it for a home or a business?", c2: "For my flat." },
      { k: "inq", u: "low", s: "Asks what the usual lead time is for a non-urgent visit.", tp: "Lead times", c1: "How soon can you usually come out when it isn't an emergency?", a1: "I'll note your question. What's the problem?", c2: "A bath seal to redo and a small leak." },
      { k: "inq", u: "low", s: "Asks whether the team works on communal heating systems.", tp: "Services", c1: "I manage a small block, do you work on communal heating?", a1: "I'll note your question. How many flats are in the building?", c2: "Around a dozen." },
      { k: "inq", u: "low", s: "Asks which payment methods are accepted after a visit.", tp: "Payment", c1: "After the work is done, how can I pay?", a1: "I'll note your question. Have you already had a quote?", c2: "No, I was just wondering." },
      { k: "other", u: "normal", unknown: true, s: "Call cut off after the greeting, no details captured.", tp: null },
      { k: "other", u: "normal", s: "Left a message for the plumber, no specific request.", tp: "Message", c1: "I wanted to leave a message for the plumber who came the other day.", a1: "Of course. What would you like me to tell him?", c2: "Just that I'll call him back." },
      { k: "other", u: "low", s: "Sales call unrelated to the business.", tp: "Sales call", c1: "Hello, I'm calling to offer you a new office supplies deal.", a1: "Thank you, we're not interested.", c2: "Understood, have a good day." },
    ],
  },
};
