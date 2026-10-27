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

O seletor compartilhado separa adultos (18+) e crianças (0–17) por quarto e exige as idades na entrada. **Decisão explícita:** crianças de até 5 anos não pagam, mas TODAS contam na lotação. A tarifa usa adultos + crianças a partir de 6 anos. Nunca subtrair crianças isentas da capacidade física. Dados autoritativos passam pelo JSON `party`; o servidor recalcula total, lotação e pagantes. Múltiplos quartos são reservados atomicamente e vinculados por `booking_group`, com atribuição de cada unidade pelo proprietário. Fonte: `database/party-bookings.sql`; testes sintéticos em rollback: `database/test-party-bookings.sql`.

## Galeria e ícones de comodidades

As galerias da home e do catálogo usam `room-modal.css` e o catálogo local de SVGs em `room-amenities.js`. O proprietário escolhe os destaques (`features`, até 16) e as comodidades (`amenities`, até 32) em **Conteúdo dos quartos**. São listas independentes por apresentação; uma lista vazia é intencional e não deve ser reposta por fallback. `amenities=null` mantém a leitura dos detalhes antigos. Fotos, miniaturas e indicadores usam o álbum real, sem opções de refeições ou taxas de café. O usuário confirmou café da manhã incluso, adicionado uma vez aos destaques pela migração `database/room-amenity-icons.sql`. Ícones de elevador, aquecimento e outros ficam disponíveis para escolha, sem presumir que estejam presentes em todos os quartos.

## Idiomas públicos

`site-language.js` / `site-language.css` e `site-translations.json`: português padrão, inglês e hebraico (`he`). O widget Google Translate foi substituído por traduções locais após falhar no site público. Não reintroduzir a dependência, os cookies ou as permissões de CSP do Google Translate. A home tem seletor à direita de Contato/abaixo de Minha Conta e no menu móvel; `legacy-page.ts` injeta os assets nas outras páginas públicas, exceto `/admin` e `/minha-conta`. Preferência local `lotus-language`; dicionário carregado do próprio site; retorno ao português sem reload. Novos textos editoriais precisam receber versões no JSON; na ausência delas, preservar o português. A tradução não grava no CMS nem altera valores dos formulários. A aplicação observa conteúdo dinâmico, guarda os originais e mantém RTL em hebraico. Teste com traduções reais, sem provedor simulado: `scripts/test-site-language-browser.py`.

## Reservas em lote

A aba Reservas tem seleção múltipla em `admin-bulk-bookings.js`, carregado antes de `admin.js`. A seleção persiste nas atualizações; o refresh automático pausa enquanto há uma ação em andamento. `POST /api/bookings/bulk` / `database/bulk-bookings.sql` permitem confirmar somente pendentes com unidade atribuída e excluir definitivamente somente canceladas, até 100 IDs. A exclusão é iniciada pelo proprietário no painel, com confirmação; não executar sobre dados reais como teste. Toda a operação é atômica e exige `lotus_private.is_admin()` com sessão válida. Testes de banco sempre em rollback e fixtures sintéticas.

## Filtro do catálogo público

Antes de buscar, mostrar todas as apresentações. Após uma consulta válida, `reservas.js` mostra somente categorias com oferta retornada para datas/andar/composição. Família aparece nas buscas somente a partir de cinco pessoas no mesmo quarto; cinco ou seis pessoas exibem apenas Família; a lotação usa adultos + todas as crianças, por quarto (não a soma da solicitação). Sem correspondências, mostrar somente o aviso de indisponibilidade, sem cartões incompatíveis. Testes: `scripts/test-room-filters-browser.py` e `scripts/test-category-booking-browser.py`.

## Conta Google nas reservas

O usuário removeu a vinculação manual do painel administrativo. Não reintroduzir “Vincular conta Google”, o diálogo ou orientações para o proprietário fazer esse vínculo. Reservas públicas exigem autenticação e já vinculam a conta Google na mesma transação de criação. Preservar os vínculos existentes e esse fluxo automático.

## Organização do histórico de reservas

Na aba Reservas, manter três painéis nesta ordem: pendentes, confirmadas e canceladas. As confirmadas são ordenadas pelo número no nome do quarto (ordem numérica, inclusive nomes como “Quarto 2”), depois nome/entrada/ID; unidades ainda não atribuídas ficam ao final. Usar cópias das listas, sem alterar o estado recebido. Seleção global e seleção de cada tabela são independentes e preservam seleções nos outros painéis. Bloqueios permanecem disponíveis em uma seção recolhível identificada, sem contar como reservas confirmadas. Testes: `scripts/test-booking-panels-browser.py` e `scripts/test-bulk-bookings-browser.py`.

## Excursões e relatórios

`/grupos` é a exceção explícita à reserva por categoria: o organizador escolhe quartos físicos dos dois andares e informa participantes por quarto. Não alterar a regra das reservas individuais. `database/excursions.sql` cria solicitações atômicas pendentes com vínculo Google, idempotência e capacidade/cotação autoritativas. Nomes acessíveis somente ao organizador com sessão viva ou administrador; não persistir dados pessoais no localStorage. A aba Grupos e excursões confirma/cancela grupos e gera lista privada para impressão/PDF somente após confirmação.

`database/reports.sql` e `admin-reports.js` separam valor das reservas confirmadas (por entrada) de recebimentos manuais (pela data do dinheiro recebido). Registrar recebimento não cobra nem confirma a reserva. Anulação preserva histórico; reservas com recebimentos vinculados são preservadas por FK. Início da operação é configurável, não remove testes; nenhum dado existente foi apagado. Testes SQL sempre BEGIN/ROLLBACK. Estudo HQBeds em `docs/integracao-hqbeds.md`: API ainda não validada, nenhuma sincronização ativa.

## Andares dos quartos físicos

Distribuição confirmada pelo usuário: térreo 1–7 e 16–19; superior 8–15. O quarto 19 permanece desativado. Correção em `database/correct-room-floors.sql`, inclusive os rótulos de andar das excursões ativas já vinculadas às unidades, preservando valores, datas, capacidade e atribuição. A interface lê esse cadastro; não usar faixas antigas nem inferir o andar pelo ID do banco.
