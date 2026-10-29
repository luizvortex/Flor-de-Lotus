# Experiência romântica — implementação e publicação

## Situação em 29/10/2026

O proprietário autorizou explicitamente a aplicação da migração em 29/10/2026. `supabase/migrations/20261029112902_romantic_experience.sql` foi aplicada com sucesso no projeto Supabase da pousada pelo fluxo oficial de migrações. As quatro tabelas novas têm RLS; o bucket de fotografias é privado, limitado a 3 MiB e JPG/PNG/WebP; não há acesso direto de anon/authenticated aos dados privados. O catálogo foi conferido vazio, sem produtos, preços ou pedidos de teste semeados. A revisão automática anterior foi resolvida pela autorização do usuário.

A análise de segurança pós-migração não apresentou novos avisos; permanece o alerta preexistente de [proteção contra senhas comprometidas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) no Auth. O código foi enviado à branch main pelo fluxo autorizado Git/Vercel. O arquivo local usa o mesmo identificador `20261029112902` registrado pelo Supabase, evitando uma futura reaplicação por divergência de versões.

## Jornada e arquitetura

`/experiencias/decoracao-romantica` abre em nova aba a partir do card existente em Quartos. Reutiliza a foto principal real cadastrada em **Editar site → Decoração romântica**, o seletor nativo de datas, o catálogo, a disponibilidade, as tarifas por ocupação, as regras de crianças e a autenticação Google existentes. Sem foto cadastrada, o hero não usa uma imagem substituta fictícia.

O hóspede seleciona uma hospedagem de um quarto, adicionais, variantes e quantidades. O servidor recalcula a cotação antes de gravar. Produtos inativos, estoque insuficiente, incompatibilidades, capacidade ou tarifas inválidas impedem a finalização. Crianças de até cinco anos são isentas da tarifa, mas ocupam vaga. A preferência de andar é apresentada como solicitação; a unidade física continua sendo atribuída pelo proprietário.

A finalização chama a criação nativa de reserva pendente na mesma transação dos adicionais, vincula a conta Google e preserva os preços em um snapshot. Reservas pendentes bloqueiam noites. `bookings.total` contém o total combinado; o pedido mantém hospedagem e adicionais separados. Recebimentos continuam sendo lançamentos reais do módulo financeiro existente, sem duplicar o total de reservas. Não há cobrança, gateway ou confirmação automática de hospedagem.

A chave de idempotência pertence ao usuário e à solicitação. Repetir o mesmo pedido retorna a reserva original; alterar seu conteúdo com a mesma chave gera conflito. Bloqueios de estoque e a constraint nativa protegem concorrência. Cancelar a experiência cancela também a hospedagem e repõe uma única vez o estoque controlado dos adicionais; não realiza estorno.

## Cadastro pelo proprietário

Após a migração e a publicação:

1. Em **Editar site → Decoração romântica**, mantenha fotografias reais, seus textos alternativos e a principal. Confira a prévia e publique pelo fluxo editorial existente.
2. Abra **Reservas → Decoração personalizada → Produtos**. Cadastre nome, categoria, descrição e fotografia real. Informe variantes e os respectivos preços em reais; estoque vazio significa ausência de controle de estoque, não disponibilidade ilimitada garantida.
3. Defina quantidade máxima, ordem e disponibilidade. Para itens com fotos pessoais, informe quantas fotografias são exigidas por unidade, até seis no pedido. Produtos diferentes com o mesmo grupo de incompatibilidade não podem ser comprados juntos.
4. Ative somente produtos com dados e preços verdadeiros. A migração não cadastra produtos nem preços comerciais. Catálogo vazio informa a ausência de opções e impede uma finalização fictícia.
5. Em **Pedidos**, confira a preparação especial, itens, variantes, quantidades, fotos, instruções e data de entrada. Defina o quarto e confirme a hospedagem no fluxo existente antes de iniciar a preparação.

Estados operacional, financeiro e da hospedagem permanecem separados. A referência externa é um campo de conferência **manual**, não sincronização. Editar preços de produtos não altera pedidos anteriores.

## Fotografias pessoais e privacidade

O bucket `lotus-romance-private` é privado. O upload aceita JPG, PNG e WebP de até 3 MiB, com validação no navegador/API, assinatura binária e limite no Storage. No máximo seis fotos pendentes por usuário. Paths aleatórios são associados ao usuário e à solicitação. Não há credencial privilegiada no navegador, URL pública permanente ou dados pessoais no localStorage. O sessionStorage guarda somente o identificador opaco da solicitação.

A leitura exige sessão viva do titular ou administrador; a API emite URLs assinadas de 120 segundos, com respostas privadas sem cache. Como em qualquer URL assinada, quem receber o endereço pode lê-lo durante essa curta validade. Não compartilhe links pessoais. O proprietário vê apenas os pedidos autorizados; o logout limpa a interface administrativa. Remoção de rascunhos pertence ao titular; fotos vinculadas não podem ser removidas por ele como simples rascunho.

Após concluir ou cancelar a preparação, o administrador dispõe de **Excluir fotografias pessoais deste pedido**, com confirmação. A operação remove os arquivos pelo Storage oficial e só então apaga os metadados, preservando valores e histórico da reserva. É repetível em caso de falha parcial. Não há rotina automática de retenção nem prazo comercial/legal inventado: o proprietário deve definir o prazo de guarda e executar a exclusão conforme sua política. Fotos pendentes de outras solicitações podem ser removidas pelo próprio usuário na retomada. Cadastros pessoais ficam sujeitos às permissões e à política de privacidade da pousada; a implementação não substitui essa definição operacional.

## HQBeds e pagamento

Não existe conector HQBeds/HQBooking nem gateway contratado/configurado neste projeto. O motor próprio e as confirmações manuais continuam ativos. Veja [o levantamento oficial](integracao-hqbeds.md). O fluxo foi preparado para registrar uma referência externa manual, sem inventar endpoints ou declarar sincronização.

O fornecedor documenta link/widget e venda de adicionais pelo motor oficial; isso não comprova API para um checkout próprio. Credenciais, contrato, documentação técnica e homologação ainda são necessários para automatizar disponibilidade, reservas, adicionais, cobranças ou reconciliação externa. Não vender estoque simultaneamente em dois sistemas independentes sem uma única fonte operacional definida.

## Arquivos principais

- Rota: `src/app/experiencias/decoracao-romantica/route.ts`.
- API: `src/app/api/romance/[operation]/route.ts`, `src/lib/romance-api.ts`.
- Interface: `romance-experience.js`, `romance-experience.css`, com estilos limitados a `.romance-page`.
- Administração: `admin-romance.js`, `admin-romance.css`; integrações condicionais em `admin.js`, `conta.js`, `guest-bookings.ts` e `supabase-api.ts`.
- Migração: `supabase/migrations/20261029112902_romantic_experience.sql`.
- Idiomas: mecanismo existente em `site-language.js` e `site-translations.json`, com português, inglês, espanhol e hebraico/RTL na nova interface. Textos antigos sem versão espanhola preservam o português; não se declara tradução integral de todo o conteúdo editorial antigo.

## Verificação reproduzível, sem dados reais

`npm run typecheck` e `npm run build` verificam compilação e rastreamento da rota. `python3 scripts/test-romance-database.py` inicializa as migrações reais em PostgreSQL 17 isolado no container `lotus-romance-test`, sem rede ou portas externas, e executa o contrato SQL em rollback. `python3 scripts/test-romance-races.py` verifica concorrência em clone local. `node scripts/test-romance-flow.mjs` usa o Next compilado, navegador Chromium e as funções nativas do mesmo PostgreSQL; apenas os provedores Auth e a transferência binária de Storage são adaptadores locais de teste. Os metadados e as políticas de Storage são SQL real. Não comprova comunicação com serviços externos em produção.

A cobertura inclui nova aba, hero, calendário, capacidade/tarifa de criança, disponibilidade, quantidades, upload/remoção privada, titular versus outro hóspede/administrador, quatro idiomas/RTL, cotação, finalização, repetição idempotente, atribuição e confirmação nativas, preparação, preços históricos, exclusão autorizada de fotos e preservação do histórico. Contrato SQL verifica ainda estoque, concorrência, consentimento, valores adulterados, sessão revogada, RLS e cancelamento. Verificações anteriores do card/galeria/pacotes: `node scripts/test-site-editor.mjs --romance-only`. Traduções existentes: `python3 scripts/test-site-language-browser.py`.

## Ordem segura de publicação

1. Revisar esta documentação e a migração, obter autorização explícita para alterações permanentes no banco e nas políticas de acesso/Storage.
2. Aplicar a migração canônica pelo fluxo oficial Supabase; não semear produtos ou dados de testes em produção.
3. Conferir políticas, bucket privado e funções; então publicar o código pelo push autorizado para `origin/main`.
4. Verificar somente leituras e navegação públicas, autenticação e painel. Testes de gravação permanecem em ambiente isolado, salvo nova autorização específica.
5. O proprietário cadastra produtos e preços reais antes de disponibilizar a contratação. Não declarar HQBeds ou pagamento como integrados.

### Resultados efetivamente obtidos em 28/10/2026

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; nova rota e API incluídas no artefato Next.
- `python3 scripts/test-romance-database.py`: aprovado, migrações reais e contrato em rollback no PostgreSQL local; inclui cancelamento, exclusão privada autorizada e histórico preservado.
- `python3 scripts/test-romance-races.py`: aprovado, uma única reserva/pedido para solicitações repetidas simultâneas e proteção da última unidade de estoque.
- `node scripts/test-romance-flow.mjs`: aprovado, Next compilado + navegador + funções nativas SQL; inclui quatro idiomas/RTL, cotação real local, identidade, fotos privadas, atribuição/confirmação, preparação e exclusão de fotografias após conclusão.
- `python3 scripts/test-site-language-browser.py`: aprovado, idiomas existentes, teclado, RTL, controles e valores preservados.
- `node scripts/test-site-editor.mjs --romance-only`: aprovado, conteúdo anterior, ativação, upload/recorte, principal, prévia/publicação simuladas, galeria, card e enquadramento 320–1920 px. A consulta do card agora abre a nova rota; o WhatsApp das demais áreas continua existente.
- `npm run test:supabase-api` e `npm run test:guest-auth`: aprovados nos adaptadores HTTP locais; não são testes de conexão com produção.
- `git diff --check` e verificações de sintaxe dos novos scripts: aprovados.

Os testes usaram dados sintéticos exclusivamente locais. Fotografias reais do Storage não puderam ser baixadas porque o domínio do projeto está bloqueado pela política de rede; não se declara revisão visual do enquadramento dessas fotos nem correção das fotos 10 e 16. Nenhum checkout de pagamento, conector HQBeds ou deploy da nova experiência foi validado/ativado em produção.

### Publicação em 29/10/2026

Migração `romantic_experience`, versão remota `20261029112902`, aplicada com sucesso após autorização explícita do proprietário. Conferência em produção: RLS nas quatro tabelas, bucket privado de 3 MiB, MIME restrito, políticas de leitura/escrita/remoção, trigger de cancelamento e ausência de acesso direto às tabelas privadas. A API do catálogo retornou lista vazia, motor nativo e nenhuma integração HQBeds/pagamento declarada. Advisors sem novos avisos; proteção contra senhas comprometidas permanece uma configuração preexistente desativada.

Publicação acionada por push para `origin/main`; acompanhar status no GitHub/Vercel antes de declarar o deploy finalizado. O conector Vercel desta sessão não possui acesso ao escopo `zilter-pacheonis-projects`; o status de build é consultado pelo check oficial Vercel associado ao commit no GitHub. A rede ainda não permite acessar os hosts públicos do site/Supabase para uma nova inspeção HTTP/navegador em produção. As validações locais anteriores permanecem aprovadas; não confundir aprovação do build com nova validação visual de produção.

Persistem pendências externas: acesso às fotografias 10 e 16 para ajustar os recortes; documentação/credenciais e homologação de API HQBeds; contratação/configuração de um gateway caso o proprietário queira pagamento automático. Nenhuma dessas capacidades foi declarada ativa.
