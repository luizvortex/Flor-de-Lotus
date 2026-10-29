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

Distribuição confirmada pelo usuário: térreo 1–7 e 16–19; superior 8–15. O quarto 19 foi reativado pelo usuário (térreo, até 5 pessoas); agora são 19 quartos ativos. A ativação posterior está em `database/activate-room-19.sql`. Correção em `database/correct-room-floors.sql`, inclusive os rótulos de andar das excursões ativas já vinculadas às unidades, preservando valores, datas, capacidade e atribuição. A interface lê esse cadastro; não usar faixas antigas nem inferir o andar pelo ID do banco.

Capacidades atuais: quartos 1–14 até 3 pessoas; 15 e 19 até 5; 16 e 17 até 2; 18 até 4. Total 60 vagas, 19 quartos ativos. Excursões permitem até 19 unidades na mesma solicitação. `database/update-room-capacities.sql` preserva reservas já existentes e suas cotações. Capacidade maior exige consulta pelo WhatsApp, sem permitir exceder automaticamente o cadastro.

## Calendário administrativo por apartamento

`admin-calendar.js` / `admin-calendar.css` implementam a aba **Calendário de reservas**: datas em colunas e unidades em linhas com ordem numérica, número e andar (Standard/térreo ou superior). Abre em hoje, no horário da Bahia, por 14 dias; mês e período inclusivo configuráveis até 93 dias, qualquer mês passado/futuro. Noites da reserva continuam com saída exclusiva. Confirmadas verdes, pendentes amarelas, períodos encerrados vermelhos (`end <= hoje`), bloqueios cinza; canceladas não aparecem. Unidades provisórias de reservas ainda não atribuídas são identificadas por tracejado e “A definir”, sem apresentar isso como atribuição final. Clique abre detalhes e o fluxo existente de Definir quarto. Atualização automática usa o `/api/admin` privado existente a cada 15 segundos e preserva filtros, edições e rolagem. Não persistir nomes de hóspedes no armazenamento do navegador. Teste com API sintética: `scripts/test-admin-calendar-browser.py`.

## Ordem do menu administrativo e controles do editor

`admin-menu.js` oferece **Organizar menu ↕**, com números de posição e setas para os 14 tópicos. Move os botões existentes para preservar seus eventos e salva a ordem compartilhada no banco privado `lotus_private.admin_ui_settings`; `/api/admin-menu` GET/PUT exige administrador, revisão e sessão válida. Não usar armazenamento local como única persistência. Migração `database/admin-menu-order.sql`; contrato em rollback `database/test-admin-menu-order.sql`, navegador `scripts/test-admin-menu-browser.py`. Novos tópicos exigem atualizar a lista permitida no dispatcher. Restauração padrão é rascunho até Salvar ordem.

O usuário removeu os botões **Histórico de publicações** e **Descartar alterações e recarregar** de Editar site. Não reintroduzir esses controles. Preservar histórico automático no servidor, publicação, prévia e rascunhos. Teste direcionado: `node scripts/test-site-editor.mjs --editor-controls-only`.

Em 27/10/2026 o usuário autorizou explicitamente a limpeza das reservas de teste: foram removidas 26 reservas e 1 excursão, com vínculos, participantes e notificações. Quartos, tarifas, contas e conteúdo foram preservados. Não reintroduzir essas reservas nem executar novas limpezas sem novo pedido explícito; testes continuam sintéticos e em rollback.

## Seis categorias por andar

Ordem pública e do editor: `duplo` (Standard/térreo), `triplo` (Standard Superior, slug legado preservado), `triplo-standard`, `triplo-superior`, `familia` (térreo) e `familia-superior`. `database/six-room-categories.sql` amplia os blocos editoriais, mantém mídia/conteúdo existente, cria as variantes superiores com mídia atual como ponto de partida e separa o matching por andar/capacidade. As variantes compartilham o estoque físico e a constraint de exclusão; não criar unidades ou tarifas duplicadas. As duas famílias aparecem na busca apenas a partir de 5 pessoas por quarto. Novos ícones, fotos e descrições ficam editáveis em Conteúdo dos quartos. A home continua com os dois destaques Standard; o catálogo exibe seis opções antes da busca. Preservar os slugs antigos para vínculos e reservas; famílias superiores ativas antigas são migradas para o slug específico sem mudar cotação/unidade/datas. Contrato SQL em rollback: `database/test-six-room-categories.sql`.

## Decoração romântica

`romance` no documento editorial aparece somente em `/quartos#decoracao-romantica` e `/reservas`, após as acomodações. Não renderizar na home. A prévia do painel abre a página de quartos. Posições antigas de romance na ordem da home são retiradas na leitura, preservando o cadastro e as fotos; blocos extras antigos após romance passam para após rooms. `romance-content.ts`, `romance.css` e `romance.js` exibem a experiência somente com `visible=true` e pelo menos uma foto cadastrada. Nunca reaproveitar fotos comuns nem gerar decoração fictícia para preencher esse bloco. O cadastro inicial está desativado e vazio; publicações anteriores são ampliadas em memória sem sobrescrever conteúdo. Primeira foto = principal; botão **Usar como principal** e ordem reutilizam a lista do CMS. WhatsApp deriva de branding e mantém a mensagem editável. Sem nova categoria, unidade, tarifa ou regra de reserva. Teste isolado: `node scripts/test-site-editor.mjs --romance-only`.

## Pescadores e grupos de pesca

`fishing` no documento editorial alimenta `#pescadores` na home por `fishing-content.ts` e `fishing.css`. Só renderizar com `visible=true` e fotos próprias cadastradas; não usar imagens genéricas/geradas nem fotos de outras seções. Primeira foto é principal, com o mesmo upload/recorte e botão **Usar como principal** do CMS. Default após quartos, junto do destaque de grupos; ordem editável. WhatsApp deriva de branding, mensagem editável; Organizar meu grupo aponta para `/grupos`. Diferencial confirmado: freezer para guardar os peixes durante a estadia. Não inventar capacidade, exclusividade, preço, limpeza/preparo/transporte, passeios ou equipamentos. Sem alterações nas reservas. Teste: `node scripts/test-site-editor.mjs --fishing-only`.

## Faixa de pacotes e decoração

No catálogo, `#catalog-offers` agrupa pacotes à esquerda e decoração à direita, em largura total (grid-column 1/-1) após `#rooms`. `catalog-offers.css` é carregado depois de romance.css para definir o enquadramento. Abaixo de 901 px os painéis se empilham; se um estiver ausente/oculto, o outro ocupa toda a faixa. Sem conteúdo, a faixa desaparece por CSS :has. Preservar os IDs usados por reservas.js e romance.js e o carregamento dinâmico de pacotes. Teste: `node scripts/test-site-editor.mjs --romance-only`.

A vitrine `#catalog-offers` agora usa cabeçalho centralizado e cards equivalentes (desktop >1024 px), com imagens principais 3:2, fontes Playfair/Poppins, superfície areia e microinterações locais. `catalog-offers.js` revela a seção por IntersectionObserver com fallback e reduced-motion. Os pacotes mantêm dados, consulta e Ver mais; não há campo de imagem por pacote no modelo atual, portanto preservar as fotos reais já usadas. Textos padrão antigos de romance são atualizados na leitura apenas se coincidirem exatamente com os defaults anteriores; textos personalizados e fotos permanecem preservados.

## Redesign editorial de excursões e pescadores

`#group-experiences` contém `#grupos-excursoes` e `#pescadores` juntos após quartos, com cabeçalho central e composição alternada. Estilos novos em fishing.css são limitados ao wrapper; não alterar a página de organização de grupos. O CTA de excursões agora consulta WhatsApp com mensagem própria; o link secundário Organizar meu grupo mantém `/grupos`. Não copiar números fixos. Fotos reais preservadas; fishing continua condicionado a fotos/visible. Defaults antigos exatos de fishing são atualizados na leitura, preservando personalizações. `group-experiences.js` não usa bibliotecas e respeita reduced-motion. Teste de referência: `--fishing-only`.

## Experiência romântica personalizada

Leia `docs/experiencia-romantica.md` antes de continuar. Nova rota `/experiencias/decoracao-romantica`, API `/api/romance/[operation]`, catálogo/variantes/pedidos/fotos privadas na migração `supabase/migrations/20261029112902_romantic_experience.sql`. Reutiliza `party_guest_dispatch` nativo e a mesma transação para hospedagem e adicionais; `bookings.total` é total combinado, snapshots preservam parcelas. Sem novo gateway ou conector HQBeds; confirmação continua manual, fotos somente reais. Administração aberta na aba Reservas sem novo tópico no menu. Interface usa o mecanismo local de idiomas com espanhol adicional e fallback português no editorial antigo.

**Atualização em 29/10/2026:** o usuário autorizou explicitamente a aplicação da migração, resolvendo o bloqueio anterior. A migração foi aplicada com sucesso pelo Supabase `apply_migration`, nome `romantic_experience`. Não reaplicar. Verificados RLS nas quatro tabelas, bucket privado 3 MiB/JPG/PNG/WebP, ausência de acesso direto de anon/authenticated às tabelas e catálogo vazio. Advisors sem novos avisos; permanece a configuração preexistente de proteção contra senhas comprometidas desativada no Auth. Publicação autorizada por Git para main. Os testes `scripts/test-romance-database.py`, `scripts/test-romance-races.py` e `scripts/test-romance-flow.mjs` usam PostgreSQL isolado no Docker `lotus-romance-test`, sem dados de produção.

Solicitação adicional pendente: corrigir somente o enquadramento das fotos 10 e 16 do carrossel da home; demais fotos devem ficar idênticas. O domínio `asojfispuomhbfapqdmi.supabase.co` está bloqueado pela política de rede. Já solicitada liberação ao usuário. Não houve ajuste nas fotos nem publicação. Os arquivos url e urlSource de cada uma têm bytes idênticos; não assumir que a origem contém enquadramento diferente. Inspecionar pixels antes de alterar o recorte, preservar revisão editorial e todos os demais campos.
