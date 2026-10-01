# Copy review: English, Spanish, French

Scope: the landing page (`frontend/components/Landing.tsx`, `ProductTour.tsx`, `VoiceSamples.tsx`, `BusinessTypes.tsx`),
the dashboard and login (`frontend/lib/dash-i18n.ts`), the demo and tour notes (`frontend/lib/demo/copy.ts`,
`frontend/lib/tour-notes.ts`), the notify-the-caller messages (`frontend/lib/notify-message.ts`) and the owner emails
(`backend/app/services/notify.py`). **No copy was changed**; this is a list of suggestions. Spanish is written for Spain
(*tú* in the product, *usted* when the business writes to its own customers); French uses *vous* throughout.

Priority: **P1** a real mistake or something a native would notice at once; **P2** a calque, inconsistency or wording that can be better;
**P3** polish.

## A. Mechanical issues (safe to fix in one pass)

| # | Where | Issue | Fix |
|---|---|---|---|
| A1 | French, `dash-i18n.ts` lines ~191, 229, 235, 247 (`loginSub`, `detailDeleteConfirm`, `calDeleteConfirm`, `supMsgLabel`) | A normal space before `?` and `:` (the line can wrap leaving a lone `?` or `:`) | Use a non-breaking space (U+00A0) before `? ! : ;` in every French string |
| A2 | French everywhere (`Landing.tsx` FR block, `dash-i18n.ts` `fr`) | Straight apostrophes (`l'appelant`); the notify messages and the auth email use the typographic `’` | Use `’` in all French strings (and Spanish/English have none to convert) |
| A3 | French `aiSub` ("Répond aux appels 24h/24, 7j/7") vs landing ("Disponible 24/7", "Répond 24/7") | Two notations for the same promise | One form everywhere: "24 h/24, 7 j/7" (with non-breaking spaces) or "24/7" |
| A4 | Spanish `Desliza` (landing scroll cue, `c*` / `cue`) | "Desliza" is a touch gesture; on desktop it reads wrong | "Desplázate" |
| A5 | English `Party size` in the owner email (`notify.py`, `label_party_size`) | Restaurant jargon in a product for trades and property management; the ES/FR labels say "people" | "People" |
| A6 | Owner emails are sent from `notificaciones@lmcagents.app` for every language (`notify.py`) | Spanish sender address on French and English emails | A neutral one, for example `notifications@lmcagents.app` |

## B. Terms that are inconsistent

| Concept | Current | Suggestion | Why |
|---|---|---|---|
| The product the client logs into | EN "Client access" / "dashboard"; ES "Área de clientes" / "panel"; FR "Espace client" / "tableau de bord" | One name per language: EN "client dashboard", ES "panel de cliente", FR "espace client" (and use it in the tour heading and the demo button) | The login button and the tour call the same thing by two names |
| The kind of demo | `heroCta` "Request a demo" / "Solicitar una demo" / "Demander une démo" **and** the new "Try the client dashboard" | Reserve "demo" for the sandbox; for the human walkthrough use "Talk to us" / "Hablemos" / "Parlons-en" or "Book a call" | Two different meanings of "demo" on one page |
| Booking vs appointment (EN) | "Booking requests" (stat, landing) and "Appointment request" (call type) | "Appointment requests" everywhere | Same object, two words |
| Booking vs appointment (ES/FR) | ES stat "Tasa de reserva", FR "Taux de réservation" but "Solicitudes de cita" / "rendez-vous" | ES "Tasa de citas", FR "Taux de rendez-vous" | "Reserva/réservation" suggests a hotel or table |
| Status of a new request | EN "Requested" (`calPending`), ES "Pendiente", FR "En attente" | EN "Pending" | EN is the odd one out and "Requested" already names the request itself |
| The person who called | ES "Contacto" (column), "quien llama" (landing), "cliente" (landing outcomes); EN "Caller" | ES: "Quien llama" in prose; "Contacto" is acceptable only as a column header; do not say "cliente" for a caller | A caller is not necessarily a customer |
| Callback (ES) | `intentCallback` "Devolver llamada" (an instruction), `BusinessTypes` "Devoluciones de llamada" ("returns of a call") | "Llamada de vuelta" or "Solicitud de llamada" | The siblings are nouns ("Solicitud de cita"); "devoluciones" reads as a refund |
| Email | EN "Email", FR "E-mail" / "e-mail", ES "Email" and "correo" mixed | Pick "email" (EN, ES) and "e-mail" (FR), and use "correo" nowhere or everywhere | Mixed forms in the same screen ("Revisa tu correo" next to "Email") |
| Error style | EN "Couldn't send, try again" vs "Couldn't delete. Please try again."; FR "Échec de l'envoi, réessayez" vs "Veuillez réessayer" | One pattern per language, for example EN "Couldn't send. Please try again.", FR "L'envoi a échoué. Veuillez réessayer.", ES "No se ha podido enviar. Inténtalo de nuevo." | Some errors say please, some do not; some are terse, some full sentences |

## C. Line-by-line suggestions

| Where (key) | Current | Suggested | Reason |
|---|---|---|---|
| FR `tInh` | "Tout de {n}, et en plus" | "Tout ce qui est inclus dans {n}, et en plus" | Calque of "Everything in {n}"; "Tout de Starter" is not French |
| ES `tInh` | "Todo lo de {n}, y además" | "Todo lo de {n}, más:" | Shorter and the usual pricing-table form |
| FR `outcomes[3]` | "Horaires confirmés à l'appelant" | "Horaires communiqués à l'appelant" | "Confirmés" suggests a booking was confirmed |
| ES `outcomes[3]` | "Horario de atención confirmado" | "Horario comunicado" | Same |
| FR `chip2` | "Vous êtes prévenu" | "Vous êtes prévenu·e" or "Nous vous prévenons" | The French here is masculine only; the active form avoids gender |
| ES `featCal` | "Las solicitudes llegan a tu calendario" | fine; keep as the model for FR/EN | (reference) |
| FR `featCal` | "Les demandes arrivent dans votre calendrier" | "Les demandes arrivent directement dans votre calendrier" | Matches the "directly" of the Spanish and English plan lines ("straight to your dashboard") |
| ES `loginSentSub` | "…Solo se puede usar una vez y caduca en poco tiempo." | "…Solo funciona una vez y caduca enseguida." | More natural; same length |
| FR `loginSentTitle` | "Consultez votre boîte mail" | "Consultez votre boîte de réception" | "Boîte mail" is informal next to "vous" register |
| FR `colCaller` | "Appelant" | keep | (reference: consistent with the rest of French) |
| FR `intentInquiry` | "Demande de renseignements" | "Demande d'information" | Both exist; "d'information" is shorter and matches the English "General inquiry" |
| FR `hourChartSub` | "Les heures où vous recevez le plus d'appels." | "Les heures où vos appels arrivent le plus." or keep | Fine; optional |
| FR `calNoReason` | "Aucun résumé disponible" | keep | (reference) |
| ES `calSelectDay` | "Selecciona un día para ver sus citas." | "Elige un día para ver sus citas." | "Elige" is what the rest of the interface uses |
| ES `detailDeleteConfirm` | "…Esta acción no se puede deshacer." | keep | (reference) |
| EN `setSaveFailed` | "Couldn't save your changes. Nothing was updated, please try again." | "Couldn't save your changes. Nothing was updated. Please try again." | Comma splice |
| EN `calActionError` | "Something went wrong. Please try again." | keep | (reference for the error pattern) |
| `statusNew`, `statusReview`, `statusRequested` (all three languages) | "new" / "needs review" / "requested" and equivalents | **Unused**: no component reads them (checked with a search). Delete them, or if they are used later, check the gender agreement first (FR "appel" is masculine, "demande" feminine) | Dead strings are never reviewed and drift |
| ES `cue` | "Desliza" | "Desplázate" | See A4 |
| EN `heroCta2` "See pricing" / ES "Ver precios" / FR "Voir les tarifs" | fine | | (reference) |
| ES `BusinessTypes` Real estate chip | "Consultas de inquilinos y propietarios" | keep | (reference) |
| EN `BusinessTypes` Trades blurb | "Works well for plumbers, electricians, and heating specialists." | "Works well for plumbers, electricians and heating engineers." | No serial comma elsewhere on the page; "heating engineers" is the usual UK trade name |
| FR `BusinessTypes` sub | "Conçu et testé avec deux types d'activité, il sait déjà comment leurs appels se déroulent." | "Conçu et testé avec deux types d'activité, LMC Agents connaît déjà le déroulement de leurs appels." | "il" has no clear antecedent |
| ES `demo` button | "Probar el panel de cliente" | "Probar el panel de clientes" | "Área de clientes" is plural everywhere else |
| FR `tour` tag | "Tableau de bord" | "Espace client" | See B (one name) |
| FR notify (`fr.changed`) | "… a changé : il est désormais confirmé." | keep | (reference: non-breaking space already used) |

## D. Capitalization and accents

- No missing accents found in French or Spanish strings; `Réceptionniste`, `Multilingüe`, `Área`, `Élevée`, `À vérifier` are correct.
- Spanish titles use sentence case (correct); the English interface also uses sentence case, but `Business information`, `Call history` and `Booking requests` are
  Title-ish in places ("Booking Requests" does not occur; fine).
- "IA" is correct in ES/FR; EN uses "AI". `lmcagents.app` is written in lower case everywhere (correct).
- Spanish `¿ ?` and `¡ !` pairs are complete in every string checked.
- French `Á`-style capital accents are used correctly (`À bientôt`, `Échec`, `Élevée`).

## E. Not covered

- `backend` AI prompts (internal), the English-only internal emails from `/api/contact` and `/api/support`, and the Retell agent's spoken prompt (not in this repo).
- The six welcome recordings and their transcripts (given verbatim).
- Dates and times formatted by `Intl` follow the browser/locale rules and need no review.
