# Flor de Lótus — instruções para continuar

## Decisão do usuário

O usuário autorizou fazer push das alterações concluídas deste site para `origin/main`, inclusive nas correções seguintes, sem pedir nova confirmação. O push aciona a publicação automática na Vercel; execute as verificações apropriadas antes de enviar. Preserve alterações remotas e não faça force-push.

A stack escolhida para a próxima fase é **Next.js com TypeScript**, usando React e App Router. O usuário pretende melhorar bastante o site e o painel em novos chats. Não retome a proposta de Django/Python como stack principal. A migração completa ainda não foi implementada: os arquivos HTML/JS/CSS e o servidor Python atuais são referência funcional a preservar durante a transição.

Leia `CONTINUAR-NEXTJS.md` antes de alterar a arquitetura. Use o checkout existente; tarefas Codex já são isoladas. Não crie um Git worktree sem solicitação explícita. Há alterações e arquivos novos ainda não commitados de trabalhos anteriores: inspecione `git status`, preserve-os, não execute reset/clean e não sobrescreva dados em `.local/`.

## Requisitos de negócio já definidos

- Site e administração em português brasileiro, valores em reais.
- Cadastrar cada quarto físico (nome/número único), tipo, capacidade, diária e disponibilidade para venda. A quantidade de quartos deriva dos cadastros.
- Tipos: solteiro, casal, casal + 1 e família.
- Administrador cadastra pacotes (Réveillon, Carnaval, Natal etc.) com período, quantidade de noites e preço total por quarto. Diferenciar dias e noites; 5 dias podem significar 4 noites. Não inventar valores reais.
- **Decisão explícita:** administrador confirma as reservas; reservas pendentes já bloqueiam as datas. Cancelamento libera as noites. Não adicionar confirmação automática/pagamento sem nova decisão do usuário.
- Calendário dinâmico por quarto. Entrada inclusiva, saída exclusiva: saída e nova entrada podem ocorrer no mesmo dia.
- Impedir sobreposição no servidor/banco inclusive com solicitações simultâneas. O total deve ser calculado no servidor e preservado na reserva após alterações de tarifas.
- Banco compartilhado e persistente, autenticação administrativa e dados de hóspedes protegidos. Não tratar localStorage como banco de reservas.
- Reservas pelo WhatsApp/telefone precisam ser registradas no sistema para afetar o calendário; envio de mensagens não é reserva automática.

## Ambiente

Node.js 24 e npm estão disponíveis. Cache npm gravável: `/workspace/shared/npm-cache`; use `npm --cache /workspace/shared/npm-cache ...` nesta máquina, pois o cache padrão em `/home/agent/.npm` não foi gravável.

Uma aplicação de verificação **separada do site** está em `/workspace/shared/flor-de-lotus-next-check`, com Next.js/React/TypeScript e lockfile. Consulte esse diretório e o documento de continuidade para os comandos e versões. Ela comprova a ferramenta; não é o site migrado. Caso não exista numa nova máquina, siga as instruções salvas do ambiente para recriá-la.

No projeto migrado, use versões explícitas e lockfile, `npm ci` para reprodução e scripts de desenvolvimento, build e typecheck. Não use instalação global como dependência do projeto. Não introduza um provedor de banco ou autenticação pago/external sem necessidade; escolha e documente persistência conforme a hospedagem real, sem inventar credenciais.

Nunca publique segredos em código, logs ou chat. `ADMIN_PASSWORD` é requisito somente do servidor Python legado enquanto ele for usado. Não use `NEXT_PUBLIC_` para segredos. Publicar o ambiente Codex não publica um site na internet.

## Atualização: Supabase autorizado

O usuário escolheu o projeto Supabase `asojfispuomhbfapqdmi` na conexão MCP Zilter2. A API padrão agora usa Supabase Postgres/Auth; não retorne à ponte Python como backend de produção. Leia o estado mais recente em README.md e CONTINUAR-NEXTJS.md. A conta administrativa inicial é autorizada pelo UUID em `lotus_private.admin_users`; a senha não está versionada. Preserve os dados locais e remotos. Não trate o Supabase Auth como permissão administrativa automática. Execute as verificações de banco com rollback ou dados sintéticos identificados, sem limpar tabelas inteiras de produção.

## Conteúdo editável do site

O painel `/admin` tem a aba **Editar site**, implementada em `admin-site.js`. O conteúdo é persistido no documento privado `lotus_private.site_content` (API pública de leitura editorial `lotus_site_api`) e aplicado no servidor por `src/lib/site-content.ts`, com validação descrita em `site-content-schema.ts`. O JSON `site-content-defaults.json` é somente o conteúdo inicial/fallback; após a primeira publicação, editar apenas textos/imagens de `index.html` não substitui o conteúdo salvo no painel. Preserve as publicações e o histórico; não resemeie nem sobrescreva o documento com os defaults. As imagens/vídeos enviados pelo editor ficam no bucket público `lotus-site`, com escrita administrativa por URL assinada. Os quartos continuam no editor e banco próprios. Veja README.md e `database/site-content.sql` para persistência, limites e testes.

## Reserva por categoria e preços por ocupação

O hóspede escolhe categoria, datas, hóspedes e andar obrigatório (térreo/superior). Não escolhe unidade física. Novas reservas por categoria fazem um bloqueio de estoque provisório e privado; o proprietário atribui a unidade pelo botão **Definir quarto**, antes de confirmar. Não mostrar esse bloqueio como uma escolha do hóspede. Preservar a constraint de exclusão e o total originalmente cotado.

O preço público agora vem de `lotus_private.occupancy_rates`, por andar, 1–6 hóspedes e período, editável em **Diárias e temporadas**. Não voltar a usar `rooms.price` como tarifa pública. O usuário autorizou preços iniciais ativos de R$ 100 por pagante/noite: single R$ 100, duplo R$ 200, triplo R$ 300, quádruplo R$ 400, quíntuplo R$ 500 e seis pessoas R$ 600, inicialmente nos dois andares. O proprietário pode alterar por andar e período em Diárias e temporadas. A aplicação inicial está em `database/initial-occupancy-starting-prices.sql` e preserva preços reais que o proprietário já tiver alterado. O catálogo mostra “a partir de” e explica variação por temporada/ocupação/andar. Não inventar os outros preços. Fontes: `database/occupancy-rates.sql`, `database/category-bookings.sql`.

## Adultos, crianças e quartos

O seletor compartilhado separa adultos (18+) e crianças (0–17) por quarto e exige as idades na entrada. **Decisão explícita:** crianças de até 6 anos não pagam, mas TODAS contam na lotação. A tarifa usa adultos + crianças a partir de 7 anos. Nunca subtrair crianças isentas da capacidade física. Dados autoritativos passam pelo JSON `party`; o servidor recalcula total, lotação e pagantes. Múltiplos quartos são reservados atomicamente e vinculados por `booking_group`, com atribuição de cada unidade pelo proprietário. Fonte: `database/party-bookings.sql`; testes sintéticos em rollback: `database/test-party-bookings.sql`.

## Galeria e ícones de comodidades

As galerias da home e do catálogo usam `room-modal.css` e o catálogo local de SVGs em `room-amenities.js`. O proprietário escolhe os destaques (`features`, até 16) e as comodidades (`amenities`, até 32) em **Conteúdo dos quartos**. São listas independentes por apresentação; uma lista vazia é intencional e não deve ser reposta por fallback. `amenities=null` mantém a leitura dos detalhes antigos. Fotos, miniaturas e indicadores usam o álbum real, sem opções de refeições ou taxas de café. O usuário confirmou café da manhã incluso, adicionado uma vez aos destaques pela migração `database/room-amenity-icons.sql`. Ícones de elevador, aquecimento e outros ficam disponíveis para escolha, sem presumir que estejam presentes em todos os quartos.

## Idiomas públicos

`site-language.js` / `site-language.css`: português padrão, inglês e hebraico (`he` na interface, `iw` no Google Translate). Home tem seletor à direita de Contato/abaixo de Minha Conta e no menu móvel. `legacy-page.ts` injeta os assets nas outras páginas públicas; nunca em `/admin` ou `/minha-conta`. Preferência local `lotus-language`; Google só é carregado para traduzir. Preservar a atribuição e a barra do fornecedor e os domínios específicos da CSP. O conteúdo publicado no painel segue em português; a tradução não grava nem sobrescreve o CMS. Teste de integração simulado: `scripts/test-site-language-browser.py`.

## Reservas em lote

A aba Reservas tem seleção múltipla em `admin-bulk-bookings.js`, carregado antes de `admin.js`. A seleção persiste nas atualizações; o refresh automático pausa enquanto há uma ação em andamento. `POST /api/bookings/bulk` / `database/bulk-bookings.sql` permitem confirmar somente pendentes com unidade atribuída e excluir definitivamente somente canceladas, até 100 IDs. A exclusão é iniciada pelo proprietário no painel, com confirmação; não executar sobre dados reais como teste. Toda a operação é atômica e exige `lotus_private.is_admin()` com sessão válida. Testes de banco sempre em rollback e fixtures sintéticas.
