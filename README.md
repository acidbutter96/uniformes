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

## Arquitetura de pastas

```
app/
	admin/
		dashboard/
		orders/
		schools/
		suppliers/
		uniforms/
	api/
		orders/
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
