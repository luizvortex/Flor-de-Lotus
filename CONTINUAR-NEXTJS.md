# Próximo chat: Next.js + TypeScript

## Pedido atual do usuário

> “Prepare o ambiente dizendo que vamos usar Next.js pois irei começar um novo chat no Codex. Precisamos fazer inúmeras outras alterações e melhorar o site.”

Este pedido prepara as ferramentas e registra o contexto. **Não significa que a migração foi concluída.** A próxima fase deve implementar a migração e as alterações de produto que o usuário solicitar.

## O que existe

- Site original: `index.html`, `avaliacoes.html`, `main.css`, `main.js`, fotos e diretórios de imagens (vários nomes têm espaços e acentos).
- Administração criada: `admin.html`, `admin.js`, `painel.css`.
- Reservas públicas criadas: `reservas.html`, `reservas.js`.
- Backend de desenvolvimento de referência: `server.py` (Python stdlib, SQLite), com quartos, pacotes, disponibilidade, login, confirmação/cancelamento e bloqueios.
- Testes de regras e API: `tests/test_reservations.py`.
- Documentação do legado: `README.md`.
- Dados locais: `.local/lotus.db`, ignorado pelo Git. Não apagar, expor via diretório público ou substituir por dados de exemplo. Testes usam bancos temporários.

Os sete testes Python passaram. O fluxo administrativo/público foi validado no navegador: cadastro de quarto e pacote, reserva pendente, indisponibilidade imediata, confirmação, cancelamento e liberação das datas. Também foi validado o calendário em celular. Isso valida o legado, não uma implementação Next.js.

## Ferramentas preparadas

Node.js **24.19.0**, npm **11.9.0**. Dependências de verificação: Next.js **16.4.2**, React/React DOM **19.3.1**, TypeScript **7.0.2**; versões dos tipos estão fixadas no package.json e package-lock.json da aplicação de verificação.

Diretório de verificação: `/workspace/shared/flor-de-lotus-next-check` (fora do checkout, não destinado à produção). Não copie node_modules para o repositório. Essa pasta possui uma página App Router simples em português para comprovar compilação e execução. O script de build usa Webpack explicitamente; isso não é uma restrição arquitetural para o site final.

```bash
cd /workspace/shared/flor-de-lotus-next-check
npm --cache /workspace/shared/npm-cache ci --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npm run build
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run dev
# Produção da aplicação de verificação, após build: npm run start
```

Dev e start usam porta 3000 e não devem rodar simultaneamente nessa porta. Use requisições HTTP internas para validar conteúdo; não forneça links de localhost como links públicos.

## Direção para a migração

1. Inspecionar Git e ler `AGENTS.md`; preservar todo o trabalho local e as imagens.
2. Implementar a estrutura Next.js com TypeScript/App Router no repositório e documentação dos comandos reais. Não apagar o legado antes de ter substituto funcional e validação correspondente.
3. Migrar site, área administrativa e reservas para componentes e rotas. Reaproveitar identidade, conteúdo e fotos, melhorando o visual conforme os próximos pedidos.
4. Implementar autenticação e persistência no servidor, levando as regras existentes e os testes de concorrência para a nova arquitetura. Decidir a hospedagem/banco antes de afirmar que SQLite em filesystem funciona em ambiente serverless. Não colocar o banco em `public/`.
5. Verificar build, TypeScript e testes úteis, incluindo o fluxo de reserva ponta a ponta e proteção do painel. Atualizar os scripts e instruções do ambiente ao longo da migração.

Os próximos pedidos visuais e funcionais ainda serão definidos pelo usuário. Integração de pagamentos, e-mails, expiração de pendências, hospedagem e banco de produção não estão contratados/configurados.

## Continuidade entre chats

Os arquivos novos e modificados ainda podem estar sem commit. O rascunho de configuração do ambiente salva instruções; a publicação do ambiente é o que prepara a versão/snapshot para novas tarefas. Um checkout limpo do GitHub não contém este trabalho local enquanto ele não for enviado. Não afirmar que um novo chat restaurou os arquivos antes de verificá-los. O usuário deve revisar/salvar a configuração e publicar o ambiente para reutilizar o snapshot.

## Migração iniciada em 22/10/2026

Implementada a primeira etapa no checkout: projeto Next.js/TypeScript com lockfile, scripts e rotas App Router. Os Route Handlers atendem temporariamente os quatro templates HTML originais, incluindo URLs `.html`. A API Next.js encaminha requisições ao Python por loopback, validando origem e preservando cookies. Fotos e scripts são preparados em `public/` por uma seleção explícita.

**Ainda pendente:** componentes React, API TypeScript e definição da hospedagem/banco de produção. O Python continua necessário nesta etapa; `.local/` não foi migrado nem substituído. Consulte os comandos em README.md. `npm run test:next` aplica os testes de contrato do legado através do Next.js com banco temporário.
