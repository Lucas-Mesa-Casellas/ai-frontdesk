"use client";

import { useState } from "react";

// Native <input type="date"> renders its own format and placeholder from
// the browser/OS locale, which nothing in the page can override -- lang on
// the input included (tried, no effect). So the filter uses a plain text
// field with one fixed dd/mm/yyyy format for everyone, and hands the page
// the YYYY-MM-DD it already expects through a hidden field. The trade is
// losing the native calendar picker, in exchange for the format being the
// same on every machine.
function isoToDisplay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function displayToIso(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function DateFilterInput({
  name, defaultValue, label, labelStyle, placeholder,
}: {
  name: string;
  defaultValue: string;
  label: string;
  labelStyle: React.CSSProperties;
  // day/month/year order stays dd/mm/yyyy for every locale (matches
  // isoToDisplay/displayToIso above, which don't vary by locale either) --
  // only the placeholder/title TEXT localizes (yyyy vs aaaa).
  placeholder: string;
}) {
  const [text, setText] = useState(() => isoToDisplay(defaultValue));
  const iso = displayToIso(text);

  return (
    <div>
      <label style={labelStyle} htmlFor={`date-filter-${name}`}>{label}</label>
      <input
        id={`date-filter-${name}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        // Lenient on purpose: 1/1/2027 is accepted and padded on the way
        // out, so the only thing this blocks is input that isn't a date at
        // all. An empty field skips validation entirely, which is what
        // leaves the filter optional.
        pattern="\d{1,2}/\d{1,2}/\d{4}"
        title={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="dash-input"
      />
      {/* Omitted entirely when blank so clearing the field drops the param
          from the query string rather than submitting an empty one. */}
      {iso && <input type="hidden" name={name} value={iso} />}
    </div>
  );
}
