# SMTP + Mailpit (Emails)

Este projeto envia e-mails via SMTP (Nodemailer). Para desenvolvimento local, recomendamos usar o **Mailpit** para capturar e visualizar e-mails sem depender de um provedor real.

## 1) Subir o Mailpit (local)

Use o compose local:

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

- SMTP: `http://localhost:1025`
- UI: `http://localhost:8025`

## 2) Configurar envs (compatível com o padrão do devbutter)

Em `.env` (ou `.env.local`), configure:

```bash
# Base URL para links em e-mails
NEXT_APP_URL=http://localhost:3000

# SMTP (Mailpit)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM="Uniformes <no-reply@uniformes.local>"

# Em Mailpit geralmente não precisa de auth
SMTP_USER=
SMTP_PASS=

# Opcional
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

Para produção, aponte `SMTP_HOST/SMTP_PORT` para seu provedor SMTP e preencha `SMTP_USER/SMTP_PASS`.

## 3) Onde o envio está integrado

- Endpoint de convite de fornecedor: `POST /api/admin/suppliers/invite`
  - Se o payload incluir `email`, o backend tenta enviar o e-mail de convite.
  - A resposta inclui `emailSent` e `emailError` para ajudar na UX.

## 5) Templates (design do site)

- Templates HTML reutilizáveis ficam em `src/services/emailTemplates.ts`.
- A ideia é centralizar layout/cores/tipografia e reaproveitar em novos e-mails (boas-vindas, reset de senha, notificações etc.).

## 4) Troubleshooting

- Se `emailSent=false` e `emailError` indicar SMTP não configurado: confira `SMTP_HOST`, `SMTP_PORT` e `SMTP_FROM`.
- Se o Mailpit estiver rodando mas nada chega na UI, confirme se o app está usando `SMTP_PORT=1025`.
