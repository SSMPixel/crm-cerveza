# Correo de recuperación de contraseña

La app manda el correo a través de Supabase. Supabase lo envía con el Gmail del
proyecto (SMTP propio), porque el correo de prueba de Supabase solo llega a los
miembros del equipo de Supabase.

## 1. Gmail del proyecto

1. Verificación en dos pasos activada.
2. Contraseña de aplicación: Cuenta de Google → Seguridad → Contraseñas de
   aplicaciones → nombre "Supabase". Son 16 letras. **No se comparte con nadie**:
   se pega directo en Supabase.

## 2. Supabase → Authentication

**Emails → SMTP Settings → Enable custom SMTP**

| Campo | Valor |
|---|---|
| Sender email | el Gmail del proyecto |
| Sender name | Bluepace |
| Host | smtp.gmail.com |
| Port | 465 |
| Username | el Gmail del proyecto |
| Password | la contraseña de aplicación |

**URL Configuration**

- Site URL: `https://bluepace.vercel.app`
- Redirect URLs: `https://bluepace.vercel.app/**`

Cuando haya dominio propio, se cambian las dos.

**Emails → Templates → Reset password**

Asunto:

```
Tu enlace para entrar a Bluepace
```

Cuerpo (HTML):

```html
<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 480px; color: #1c1917; line-height: 1.5">
  <p style="font-size: 18px; font-weight: 600; margin: 0 0 12px">Contraseña nueva para Bluepace</p>
  <p style="margin: 0 0 20px">Alguien pidió cambiar la contraseña de esta cuenta. Si fuiste tú, toca el botón. El enlace sirve una sola vez y vence en una hora.</p>
  <p style="margin: 0 0 24px">
    <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery"
       style="display: inline-block; background: #92400e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600">Poner contraseña nueva</a>
  </p>
  <p style="margin: 0; font-size: 13px; color: #57534e">Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>
</div>
```

## 3. Límites

- Gmail permite unos 500 correos al día. Sobra para recuperar contraseñas.
- Supabase limita cuántos correos se mandan por hora (Authentication → Rate
  Limits). Con SMTP propio arranca en 30 por hora; está bien así.
- Este mismo Gmail puede servir después para el resumen semanal, mientras no
  haya dominio propio.
