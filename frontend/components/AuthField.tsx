"use client";

import { useEffect, useRef } from "react";
import { authField, AUTH_FIELD_CSS, type AuthFieldApi } from "@/lib/auth-field";

// The pixel-field background of /login (the engine and the story behind it are in
// lib/auth-field.ts). It reacts to the form through three props.

export default function AuthField({
  typing = false,
  keys = 0,
  phase = "idle",
}: {
  typing?: boolean; // an address is in the field
  keys?: number; // goes up by one with every keystroke
  phase?: "idle" | "sending" | "sent";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<AuthFieldApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    api.current = authField(ref.current);
    return () => {
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  useEffect(() => { api.current?.setEnergy(typing); }, [typing]);
  useEffect(() => { if (keys > 0) api.current?.ripple(); }, [keys]);
  useEffect(() => {
    if (phase === "sending") api.current?.send();
    if (phase === "sent") api.current?.settle();
  }, [phase]);

  return (
    <>
      <canvas ref={ref} className="af" aria-hidden="true" />
      <style>{AUTH_FIELD_CSS}</style>
    </>
  );
}
