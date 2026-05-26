# JR Gestao Desportiva

Projeto web interno para gestao administrativa da Associacao Paradesportiva JR SP.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Componentes base no padrao shadcn/ui
- PostgreSQL
- Prisma ORM
- Autenticacao simples com login e senha
- Perfis preparados: admin, diretoria, secretaria, professor, financeiro e consulta

Referencia institucional: https://www.jrparadesporto.com.br/

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` com base em `.env.example`.

3. Gere o Prisma Client:

```bash
npx prisma generate
```

4. Rode o servidor:

```bash
npm run dev
```

5. Acesse `http://localhost:3000`.

Credenciais locais padrao, caso nenhum usuario exista no banco:

- E-mail: `admin@jr.local`
- Senha: `admin123`

## Observacoes de seguranca

Troque `AUTH_SECRET` e as credenciais administrativas antes de qualquer uso real.
Dados pessoais, escolares, medicos e financeiros devem ser acessados apenas por
usuarios autorizados.
