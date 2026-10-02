# Login email in the client's language

Today every client gets the same Supabase Auth "Magic Link" email, whatever language they use.
This page gives **one** Supabase template (subject + HTML body) that picks English, Spanish or French
from the user's metadata (`user_metadata.language`) and falls back to English, the SQL that fills that
metadata for existing users, and the exact dashboard steps. Each language also shows the 6-digit code
(`{{ .Token }}`) so a client can type it on `/login` when the link opens in the wrong browser.
Nothing here has been applied until the checklist in section 3 is ticked.

How it works: Supabase Auth renders its email templates with Go templates and exposes the user's
metadata as `{{ .Data }}` (the contents of `auth.users.raw_user_meta_data`). The login page calls
`signInWithOtp({ email, options: { shouldCreateUser: false } })`, so every login uses the **Magic Link** template.

**The link and the code.** The button points at the site's own page, `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`, not at `{{ .ConfirmationURL }}`. That page only shows a *Continue* button and verifies the token when it is pressed, so a mail scanner that opens the link cannot use it up, and the link works from any browser or device (no PKCE verifier needed). The email also carries `{{ .Token }}`, the one-time code the login page accepts instead of the link. Link and code are the **same** token: whichever is used first kills the other, which is why the login page says "Use the link or the code, not both". Emails already sent with the old `{{ .ConfirmationURL }}` link keep working through `/auth/callback`.

## 1. Set the language on existing users (do not run until you have read it)

`businesses.language` already holds `en`, `es` or `fr` for each client. Copy it onto the owner's auth user:

```sql
-- Preview first: who would change, and to what
select u.id, b.name as business, b.language as will_set, u.raw_user_meta_data ->> 'language' as current
from auth.users u
join public.businesses b on b.owner_id = u.id
order by b.name;

-- The change (run in the Supabase SQL editor; it needs the postgres role, the editor has it)
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('language', b.language)
from public.businesses b
where b.owner_id = u.id
  and b.language in ('en', 'es', 'fr');

-- Check
select count(*) filter (where raw_user_meta_data ->> 'language' is not null) as with_language, count(*) as users
from auth.users;
```

Users without a business, or whose metadata has no `language`, simply get English.

**Keeping it in step** (optional, also not run): if a client's `businesses.language` can change, mirror it:

```sql
create or replace function public.sync_owner_language() returns trigger
language plpgsql security definer set search_path = public, auth, pg_catalog as $$
begin
  if new.owner_id is not null and new.language in ('en', 'es', 'fr') then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('language', new.language)
    where id = new.owner_id;
  end if;
  return new;
end $$;
revoke execute on function public.sync_owner_language() from public, anon, authenticated;

create trigger businesses_sync_owner_language
after insert or update of language, owner_id on public.businesses
for each row execute function public.sync_owner_language();
```

**New clients**: when you invite someone, pass the language with the invite so the very first email is right:
`supabase.auth.admin.inviteUserByEmail(email, { data: { language: "fr" } })` (or set it in the dashboard's
"Invite user" dialog, user metadata field).

## 2. The template

Supabase has one template per email type. Paste the **subject** and the **HTML body** below into *Magic Link*.
The first line of each defines `$l` (the language) with an English default, then branches. The `{{- ... -}}` markers keep the
subject on one line.

### Subject heading

```
{{- $l := "en" -}}{{- if .Data -}}{{- if .Data.language -}}{{- $l = .Data.language -}}{{- end -}}{{- end -}}
{{- if eq $l "fr" -}}Votre lien de connexion à LMC Agents{{- else if eq $l "es" -}}Tu enlace de acceso a LMC Agents{{- else -}}Your LMC Agents sign-in link{{- end -}}
```

### Message body (HTML)

```html
{{- $l := "en" -}}{{- if .Data -}}{{- if .Data.language -}}{{- $l = .Data.language -}}{{- end -}}{{- end -}}
<!DOCTYPE html>
<html lang="{{ $l }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>LMC Agents</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1210;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td style="font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#0b1210;padding-bottom:20px;">LMC Agents</td></tr>

        {{- if eq $l "fr" }}
        <tr><td style="font-size:22px;font-weight:600;line-height:1.25;padding-bottom:10px;">Connexion à votre espace client</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#33403b;padding-bottom:24px;">Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien ne fonctionne qu’une fois et expire au bout de peu de temps.</td></tr>
        <tr><td style="padding-bottom:24px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#12b981;color:#04140d;font-size:15px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:999px;">Me connecter</a></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;">Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="color:#0a8f64;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email</a></td></tr>
        <tr><td style="padding-top:14px;font-size:13px;line-height:1.6;color:#66726d;">Ou saisissez ce code sur la page de connexion&nbsp;: <b>{{ .Token }}</b></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;padding-top:20px;">Vous n’avez pas demandé ce lien&nbsp;? Ignorez simplement cet e-mail&nbsp;: personne ne peut se connecter sans lui.</td></tr>

        {{- else if eq $l "es" }}
        <tr><td style="font-size:22px;font-weight:600;line-height:1.25;padding-bottom:10px;">Entra en tu área de clientes</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#33403b;padding-bottom:24px;">Pulsa el botón de abajo para iniciar sesión. Este enlace solo funciona una vez y caduca en poco tiempo.</td></tr>
        <tr><td style="padding-bottom:24px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#12b981;color:#04140d;font-size:15px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:999px;">Iniciar sesión</a></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;">¿El botón no funciona? Copia este enlace en tu navegador:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="color:#0a8f64;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email</a></td></tr>
        <tr><td style="padding-top:14px;font-size:13px;line-height:1.6;color:#66726d;">O escribe este código en la página de acceso: <b>{{ .Token }}</b></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;padding-top:20px;">¿No lo has pedido tú? Ignora este correo: nadie puede entrar sin este enlace.</td></tr>

        {{- else }}
        <tr><td style="font-size:22px;font-weight:600;line-height:1.25;padding-bottom:10px;">Sign in to your client area</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#33403b;padding-bottom:24px;">Click the button below to sign in. This link works once and expires after a short time.</td></tr>
        <tr><td style="padding-bottom:24px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#12b981;color:#04140d;font-size:15px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:999px;">Sign in</a></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;">Button not working? Copy this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="color:#0a8f64;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email</a></td></tr>
        <tr><td style="padding-top:14px;font-size:13px;line-height:1.6;color:#66726d;">Or type this code on the sign-in page: <b>{{ .Token }}</b></td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#66726d;padding-top:20px;">Didn’t ask for this? Just ignore this email: nobody can sign in without the link.</td></tr>
        {{- end }}
      </table>
    </td></tr>
  </table>
</body>
</html>
```

### Plain-text version (reference)

The hosted dashboard takes one body (HTML). The text below is the same message for custom SMTP setups or a
"Send Email" auth hook, where a text part can be supplied.

```
{{- $l := "en" -}}{{- if .Data -}}{{- if .Data.language -}}{{- $l = .Data.language -}}{{- end -}}{{- end -}}
{{- if eq $l "fr" -}}
LMC Agents

Connexion à votre espace client
Ouvrez ce lien pour vous connecter (il ne fonctionne qu’une fois et expire au bout de peu de temps) :

{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email

Ou saisissez ce code sur la page de connexion : {{ .Token }}

Vous n’avez pas demandé ce lien ? Ignorez simplement cet e-mail : personne ne peut se connecter sans lui.
{{- else if eq $l "es" -}}
LMC Agents

Entra en tu área de clientes
Abre este enlace para iniciar sesión (solo funciona una vez y caduca en poco tiempo):

{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email

O escribe este código en la página de acceso: {{ .Token }}

¿No lo has pedido tú? Ignora este correo: nadie puede entrar sin este enlace.
{{- else -}}
LMC Agents

Sign in to your client area
Open this link to sign in (it works once and expires after a short time):

{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email

Or type this code on the sign-in page: {{ .Token }}

Didn’t ask for this? Just ignore this email: nobody can sign in without the link.
{{- end -}}
```

Notes on the text of the template:
- Spanish uses *tú*, matching the dashboard; French uses *vous*; the French punctuation uses non-breaking spaces (`&nbsp;`) before `?` and `:`.
- "Área de clientes" and "espace client" are the terms the site already uses for the client login ("Client access" in English).
- The expiry is deliberately vague: the real value is the *Email OTP Expiration* setting (Authentication → Sign In / Providers → Email, default 1 hour).
- *Authentication → URL Configuration* must have Site URL `https://lmcagents.app` (it is what `{{ .SiteURL }}` expands to; if it still says `localhost` the link will point there) and `https://lmcagents.app/auth/callback` in the redirect allow-list for emails still using the old link.

## 3. Install it (dashboard steps)

1. Supabase dashboard → project **ai-frontdesk** → **Authentication** → **Emails** (older layout: *Authentication → Email Templates*).
2. Open the **Magic link** template.
3. Replace **Subject heading** with the subject block above (both lines, exactly as written).
4. Replace **Message body** with the HTML block above. Keep the first `{{- $l := ... -}}` line at the very top.
5. **Save changes**.
6. Check *Authentication → Sign In / Providers → Email → Email OTP Length*: it must equal the number of digits the `/login` code field expects (6).
7. Do the same for **Invite user** and **Confirm sign up** if you want first-time emails in the client's language too (same prelude, same branches; change the wording to "You've been invited to LMC Agents" etc.).
8. Make sure the users have `language` metadata (step 1 above).
9. Check each language: sign in once as a test client per language from `/login` (use an address you control). The email should arrive in that language, with that subject, a visible 6-digit code, and the button should land in `/dashboard`. Also test the typed code: request a link, ignore the button, type the code on `/login`.
10. Check the fallback: a user without `language` metadata should receive English.

## 4. Things to know

- **Go template safety.** `{{ .Data.language }}` on a user with no metadata would error in some Go versions if compared directly, which is why the prelude tests `.Data` and `.Data.language` for presence first and then compares a plain variable. If the dashboard shows a template error on save, send me the message.
- **Not rendered locally.** There is no Go toolchain on the machine this was written on, so the template has not been run through Go's template engine, only checked against Supabase's documented variables (`.Data`, `.ConfirmationURL`, `.Token`) and Go's template syntax rules. Step 9 above is the real test; do it with a throwaway user per language before telling clients.
- **The typed code.** `{{ .Token }}` is the same one-time password as the link, so it works from any browser or device. Without it in the template, the code field on `/login` has nothing to type.
- **Other languages.** A value other than `en`, `es`, `fr` (for example `de`) falls through to English.
- **Rate limits.** Supabase's built-in email service is limited to a few emails per hour per project, and a second request within about 30 seconds is refused ("you can only request this after 29 seconds"). For real volume configure *Custom SMTP* (Resend is already in use) under Authentication → SMTP Settings. Templates are unaffected.
- **Rollback.** Keep a copy of the current subject and body (copy them from the dashboard before pasting) so the old template can be restored in one paste.
