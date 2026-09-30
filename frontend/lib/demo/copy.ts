// Words used by the demo and the buttons that open it, in the three languages.
import type { L10n } from "@/lib/tour-notes";

export const DEMO_COPY = {
  title: { EN: "Client dashboard demo", ES: "Demo del panel de cliente", FR: "Démo de l'espace client" } as L10n,
  bar: { EN: "Demo with sample data", ES: "Demo con datos de ejemplo", FR: "Démo avec des données d'exemple" } as L10n,
  start: { EN: "Get started", ES: "Empezar", FR: "Commencer" } as L10n,
  close: { EN: "Close the demo", ES: "Cerrar la demo", FR: "Fermer la démo" } as L10n,
  hints: { EN: "Hints", ES: "Pistas", FR: "Conseils" } as L10n,
  disabled: { EN: "Disabled in the demo", ES: "Desactivado en la demo", FR: "Désactivé dans la démo" } as L10n,
  gotIt: { EN: "Got it", ES: "Entendido", FR: "Compris" } as L10n,
  hintN: { EN: "Hint", ES: "Pista", FR: "Conseil" } as L10n,
  loading: { EN: "Loading the demo…", ES: "Cargando la demo…", FR: "Chargement de la démo…" } as L10n,
  // the button in the product tour (and its hover label on the screenshots)
  open: { EN: "Try the client dashboard", ES: "Probar el panel de cliente", FR: "Essayer l'espace client" } as L10n,
};

// Messages between the landing page and the demo inside its iframe.
export const DEMO_MSG = "lmcDemo";
export type DemoPage = "overview" | "calls" | "calendar" | "support";
export const DEMO_PATH: Record<DemoPage, string> = {
  overview: "/demo", calls: "/demo/calls", calendar: "/demo/calendar", support: "/demo/support",
};
