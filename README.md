## Uniformes Admin – Stack

- [Next.js 15](https://nextjs.org/) com App Router
- TypeScript
- Tailwind CSS 3
- ESLint + Prettier integrados
- Yarn (Classic) como gerenciador de pacotes

## Scripts principais

```bash
yarn dev       # Ambiente de desenvolvimento
yarn build     # Build de produção
yarn start     # Servidor após build
yarn lint      # ESLint + Prettier
yarn format    # Formata com Prettier
```

## Autenticação e OAuth

- Configure as variáveis de ambiente usadas pelo backend de auth:
	- `MONGODB_URI` e `JWT_SECRET` já eram obrigatórias para login por email/senha.
	- **Novas** para OAuth com Google:
		- `GOOGLE_CLIENT_ID`
		- `GOOGLE_CLIENT_SECRET`
		- `GOOGLE_OAUTH_SCOPE` (opcional, padrão `openid email profile`).
		- O callback autorizado usa automaticamente `NEXT_PUBLIC_URL/api/auth/google/callback`, então mantenha `NEXT_PUBLIC_URL` atualizado para cada ambiente.
- No [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
	1. Ative o OAuth consent screen e inclua o domínio/localhost utilizado.
	2. Crie um "OAuth client ID" do tipo **Web application**.
	3. Cadastre em *Authorized redirect URIs* o valor `https://seu-dominio/api/auth/google/callback` (o mesmo `NEXT_PUBLIC_URL` + `/api/auth/google/callback`).
- O fluxo implementado redireciona o usuário para `/api/auth/google/start`, valida o `state` anti-CSRF e, no callback, cria/atualiza o usuário local via `loginWithGoogle`. O token JWT emitido pelo backend é salvo em `localStorage` e o app redireciona automaticamente para `/sugestao`, `/admin/dashboard` ou para a rota indicada por `returnTo`.
- Caso o login falhe, a tela `/login` mostra uma mensagem amigável baseada no código em `?error=`.

## Arquitetura de pastas

```
app/
	admin/
		dashboard/
		reservations/
		schools/
		suppliers/
		uniforms/
	api/
		reservations/
		schools/
		suppliers/
		uniforms/
	components/
		cards/
		forms/
		layout/
		steps/
		ui/
	data/
	lib/
	styles/
	globals.css
	layout.tsx
	page.tsx
public/
tailwind.config.ts
eslint.config.mjs
prettier.config.mjs
```

## Convenções de código

- Siga o padrão de imports absolutos prefixados por `@/`.
- Components reutilizáveis ficam em `app/components` separados por domínio.
- Use `buttonClasses` quando precisar aplicar o estilo padrão de botões em links.
- Dados mockados residem em `app/data` até integração real com APIs.

## Design System

- Fonte global: **Inter**, carregada via `next/font`.
- Paleta de cores centralizada em `tailwind.config.ts` (`brand`, `neutral`, `accent`, `success`, `warning`, `danger`).
- Tokens adicionais em `app/styles/tokens.css`.

## APIs mockadas

Rotas em `/app/api/*` expõem dados mockados para escolas, fornecedores, uniformes e reservas. As respostas retornam `{ data: [...] }`, facilitando o consumo via fetch/React Query quando for integrar com o front.
