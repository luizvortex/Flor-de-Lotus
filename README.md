# Pousada Flor de Lótus

Site, reservas e painel em português brasileiro. A API agora roda em **Next.js 16.4.2 / TypeScript 7.0.2**, com **Supabase Postgres e Auth**. Não precisa do Python para o deploy na Vercel. As telas ainda usam os templates HTML/JavaScript preservados; a conversão visual para componentes React continua pendente.

## Executar e publicar

Requer Node.js 24:

```bash
npm --cache /workspace/shared/npm-cache ci --no-audit --no-fund
npm run dev
# Produção:
npm run build
npm run start
```

Rotas: `/`, `/reservas`, `/admin` e `/avaliacoes`; URLs `.html` também funcionam. Em desenvolvimento, Next.js usa a porta 3000. `predev`/`prebuild` preparam `public/` selecionando somente fotos, CSS e JavaScript; edite os originais, não a pasta gerada.

O projeto Supabase escolhido é `asojfispuomhbfapqdmi` (`database-projetos`, conexão MCP Zilter2). URL e chave **publishable**, sem privilégios administrativos, estão em `src/lib/supabase-config.ts`. Podem ser substituídas por `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no servidor. Nenhuma service-role key ou senha de banco é necessária na aplicação. Não use uma chave secreta como publishable.

`vercel.json` seleciona Next.js; `next.config.ts` inclui os quatro templates nas funções. Um push na branch de produção dispara o deploy se a integração Git estiver ativa. A aplicação acessa diretamente as APIs HTTPS Supabase, sem depender de `127.0.0.1`, SQLite ou processo Python. O deploy da Vercel precisa conseguir alcançar o Supabase.

## Acesso administrativo e transferência

A conta inicial autorizada é `zilterpacheoni17@gmail.com`. A senha temporária foi gerada e guardada somente no arquivo privado `work/acesso-inicial-admin.txt`, ignorado pelo Git. Não publique esse arquivo nem mostre a senha em logs. Após entrar, use **E-mail e senha** no painel para trocar a senha ou transferir o e-mail ao proprietário. A alteração exige a senha atual. Novas senhas devem ter pelo menos 12 caracteres. A troca de e-mail segue a confirmação do Supabase Auth; até confirmar, o endereço atual continua válido.

Em Supabase → Authentication → URL Configuration, configure Site URL como `https://flor-de-lotus-three.vercel.app` e permita `https://flor-de-lotus-three.vercel.app/admin` entre os redirects. `APP_URL` pode substituir esse endereço na aplicação. O envio/confirmação de troca de e-mail também depende da configuração de e-mail e dos limites do projeto Supabase. O app não envia mensagens ao configurar a conta inicial.

A autorização está em `lotus_private.admin_users`, vinculada ao UUID do usuário Auth. Ela acompanha a troca do e-mail da mesma conta. Cadastrar outro usuário Auth não concede acesso administrativo. Para conceder acesso a uma conta adicional, um operador autorizado deve inserir seu UUID nesta tabela pelo SQL Editor/MCP. Metadados editáveis de usuários não conferem permissão.

Tokens Auth ficam em cookies HttpOnly, SameSite=Strict e Secure em produção. O servidor renova tokens expirados; o banco exige uma sessão Auth existente e verifica seu prazo, além da autorização administrativa. Logout revoga a sessão corrente e limpa os cookies. O Supabase Auth aplica os limites de tentativas; configure-os e habilite proteções adicionais conforme a hospedagem.

## Reservas e dados

- Cadastre cada quarto físico com nome/número único, tipo, capacidade, diária em reais e disponibilidade para venda. Tipos: solteiro, casal, casal + 1 e família. A quantidade deriva dos cadastros; não há quartos ou tarifas fictícias.
- Pacotes têm janela de datas, quantidade de **noites** e preço total por quarto. Por exemplo, 5 dias podem corresponder a 4 noites. A estadia deve ter exatamente as noites do pacote e caber na janela.
- Solicitações públicas ficam **pendentes** e bloqueiam imediatamente as noites. Só o administrador confirma ou cancela. Cancelamento libera as noites. Não há pagamento nem confirmação automática; pendências não expiram sozinhas.
- Entrada inclusiva e saída exclusiva: uma saída e uma entrada podem ocorrer no mesmo dia. A constraint de exclusão PostgreSQL impede sobreposição de reservas pendentes, confirmadas e bloqueios, inclusive sob concorrência e reconfirmação de reservas canceladas.
- O banco calcula o total em centavos e preserva o valor na reserva após alterações de tarifas. A criação trava o quarto durante a transação, serializando alterações de capacidade e preço. Datas são validadas no fuso de Itacaré (`America/Bahia`).
- Reservas de WhatsApp/telefone precisam ser registradas no painel; mensagens não são reservas automáticas. Bloqueios de manutenção são cadastrados pela gestão e têm total zero.
- Dados de hóspedes ficam no schema privado `lotus_private`, com RLS e políticas explícitas de negação de acesso direto. `anon` e `authenticated` não recebem privilégios nas tabelas. A RPC pública `lotus_api` é um wrapper invoker; a função privilegiada no schema privado valida todos os dados e a autorização de cada operação. Catálogo/disponibilidade públicos não retornam nomes ou contatos de hóspedes. A chave publishable não permite ignorar essas verificações.

As tabelas locais `.local/lotus.db` foram preservadas. **Seus registros não foram importados para o Supabase**. A importação de dados reais exige mapeamento de IDs e verificação de conflitos; não reutilize bancos de teste como dados da pousada.

## Schema e verificação

As migrações foram aplicadas via MCP ao projeto autorizado:

- `20261022200433_lotus_reservations`
- `20261022201313_lotus_explicit_deny_direct_access`

`database/lotus-schema.sql` é uma cópia reproduzível do schema final para um banco novo, não uma migração idempotente para reaplicar neste projeto. O provisionamento inicial da conta não está no schema nem contém senha versionada. A CLI Supabase não instalou neste ambiente; o histórico remoto foi verificado pelo MCP.

```bash
npm run build
npm run typecheck
npm run test:supabase-api
# Contrato do legado, com bancos temporários:
npm test
npm run test:next
```

`test:supabase-api` executa um servidor Next.js real na porta 3108, conectado a um mock HTTP local de Auth/PostgREST. Verifica cookies, autenticação, renovação, logout, troca de acesso, CSRF e validação do transporte. Não equivale a um login real no Supabase.

`database/test-reservations.sql` foi executado pelo MCP no PostgreSQL real e verifica valores, pacotes, capacidade, cancelamento, checkout, bloqueios, autorização e privacidade. Fixtures, inclusive usuários/sessões sintéticos, ficam numa transação com rollback. Um teste adicional com duas transações simultâneas confirmou uma única reserva criada e uma rejeição PT409; seus registros foram removidos pela identificação única do teste.

O build, o TypeScript e os testes não confirmam o deploy remoto. A política de rede deste ambiente bloqueia chamadas HTTP diretas ao Supabase e ao domínio Vercel; o login real e a confirmação de e-mail precisam de validação em uma rede permitida. O MCP continua acessível.

O advisor não encontrou problemas nas permissões das tabelas/funções. Resta o aviso de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), configuração do Auth. O índice de pacotes ainda sem uso é esperado num banco novo.

## Legado preservado

`server.py`, os testes Python, fotos e arquivos originais continuam como referência. Para executar somente o legado: configure `ADMIN_PASSWORD` de forma privada e rode `python3 server.py`. Ele usa `.local/lotus.db` e não compartilha dados nem autenticação com Supabase.

A ponte HTTP antiga só é ativada explicitamente com `LOTUS_BACKEND=legacy` fora da Vercel, usando `LEGACY_API_ORIGIN` (padrão `http://127.0.0.1:8000`). `test:next` usa esse modo com senha e banco temporários, sem tocar em `.local/`. Não configure o modo legado para produção Vercel.


## Blocos públicos de quartos editáveis

A home renderiza os três blocos de `lotus_private.room_showcases` via RPC `lotus_showcase_api`, com fallback para os textos/fotos originais em `src/lib/showcase-defaults.ts` se o serviço falhar. A seção mantém foto principal e duas miniaturas, álbum “Ver fotos”, descrição original, comodidades e link para tarifas. CSS/JS específicos: `quartos.css` e `quartos.js`.

Em `/admin`, a aba **Conteúdo dos quartos** edita título, tópico opcional, descrição, fotos (3–12), ordem e ícones/textos das comodidades. Fotos JPG/PNG/WebP até 3 MB são enviadas ao bucket público `lotus-showcase`, somente para administradores autorizados. Fotos enviadas são públicas; não usar documentos ou dados de hóspedes. A revisão impede sobrescrita silenciosa entre editores. Cadastro físico, preços e reservas são independentes.

Fonte da alteração remota aplicada: `database/room-showcases.sql`. Contrato real de banco validado com rollback em `database/test-room-showcases.sql`: leitura pública, escrita restrita, revisão e validação de conteúdo. API HTTP validada com backend simulado pelo `npm run test:supabase-api`, incluindo envio de imagem e bloqueio de arquivo inválido. Layout/álbum/editor conferidos em Chromium em 320/390/1024/1440px; chamadas do painel simuladas para não alterar conteúdo real. Upload HTTPS direto ao Supabase não pôde ser exercitado neste ambiente, cujo proxy bloqueia esse domínio.

## Conta do visitante com Google

O cabeçalho desktop mantém a marca central, `Reservar` à esquerda e `Minha Conta` à direita. No celular, a conta está no menu. `conta.js` consulta `/api/guest/session`, abre um dialog e exibe nome, e-mail e foto Google verificados pelo Auth. Se a foto falhar, mantém ícone neutro. Sem tokens em localStorage. Não há integração de histórico de reservas nesta etapa.

As rotas `/auth/google` (POST da mesma origem), `/auth/callback`, `/api/guest/session` e `/api/guest/logout` usam os SDKs oficiais `@supabase/ssr` e `@supabase/supabase-js` com versões fixas, PKCE e cookies HttpOnly/Secure/SameSite=Lax. O namespace `lotus_guest_auth` é independente de `lotus_access`/`lotus_refresh` da administração. Qualquer login Google não concede permissão administrativa. Perfil é obtido com `getUser()` no servidor e somente fotos HTTPS de `*.googleusercontent.com` são aceitas. Respostas privadas não são cacheadas; callback ignora destinos arbitrários. O avanço das galerias dos quartos agora usa 3 segundos (hero de abertura independente).

**Ativação pendente pelo proprietário:** o usuário informou que ainda não criou as credenciais Google. Não há ferramenta de configuração Auth do Supabase/Google Cloud nesta conexão; nenhum segredo foi solicitado ou versionado. O site consulta o estado real do provedor em `/auth/v1/settings` e informa “disponível em breve” enquanto desativado; um erro de conexão tem mensagem própria. Não afirmar login real validado antes da ativação.

1. No [Google Auth Platform](https://console.cloud.google.com/auth/overview), configurar a tela de consentimento e criar um cliente OAuth do tipo **Aplicativo da Web**. Escopos de perfil: `openid`, `email`, `profile`. Em modo de teste, adicionar as contas de teste à audiência; para hóspedes em geral, publicar a aplicação conforme os requisitos do Google.
2. Origem JavaScript autorizada: `https://flor-de-lotus-three.vercel.app`. URI de redirecionamento autorizado: `https://asojfispuomhbfapqdmi.supabase.co/auth/v1/callback`.
3. Em [Supabase → Google](https://supabase.com/dashboard/project/asojfispuomhbfapqdmi/auth/providers?provider=Google), habilitar o provedor e inserir o Client ID e o Client Secret diretamente no painel. Manter a verificação de nonce ativada. **Não inserir o Secret no código ou chat.**
4. Em [Supabase → URL Configuration](https://supabase.com/dashboard/project/asojfispuomhbfapqdmi/auth/url-configuration), Site URL: `https://flor-de-lotus-three.vercel.app`; adicionar à lista Redirect URLs o endereço exato `https://flor-de-lotus-three.vercel.app/auth/callback`. O retorno de OAuth é diferente do retorno de confirmação de e-mail administrativo; preservar URLs já usadas.
5. Abrir Minha Conta → Continuar com Google, concluir consentimento e conferir nome/foto, recarregar e sair. A ativação do provedor é detectada sem novo deploy. Não usar wildcard de domínio em produção.

Verificação: `npm run test:guest-auth` exercita rotas reais + SDK contra Auth HTTP simulado (PKCE, verificador ausente, cookies seguros, bloqueio de origens externas, perfil/foto, saída e isolamento do admin). Teste não autentica uma conta Google real. Layout e estados da janela conferidos em Chromium em 1920/1440/1024/768/390/320px com API simulada. Login administrativo/API existente conserva testes próprios. Auditoria Supabase continua com o aviso preexistente de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sem alteração de schema/RLS nesta tarefa.


## Galeria clara com detalhes dos quartos

A janela de “Ver fotos” agora segue a referência clara: no celular, imagem no topo, contador sobreposto, miniaturas, título, destaques e grupos de informações; no desktop, fotos e informações lado a lado. Cabeçalho de fechamento e rodapé de tarifas ficam acessíveis enquanto o conteúdo rola. As setas permanecem sem fundo circular; teclado, Escape, swipe e seleção por miniaturas continuam disponíveis. Galerias da home mantêm três imagens e autoplay de 3 segundos.

Por orientação do usuário, nomes públicos: **Quarto Duplo Standard**, **Quarto Duplo Superior** e **Quarto Família**. Os identificadores internos `duplo`, `triplo`, `familia` são preservados por compatibilidade; não representam os tipos físicos do estoque. Dados fornecidos nas imagens da Booking foram transcritos para os dois duplos: 17 m², 1 cama de casal, banheiro privativo com chuveiro, produtos de banho, toalhas/papel, varanda, vista para o jardim, ar-condicionado, roupa de cama, TV de tela plana e proibição de fumar. Não copiar preço, nota, número de avaliações ou comodidades da referência de outra hospedagem. Não inferir camas/novas comodidades para o Família. Fotos remotas preservadas.

Detalhes salvos na coluna `lotus_private.room_showcases.details`, validados pela RPC existente; fonte da migração remota aplicada em `database/room-detail-modal.sql`. O editor administrativo ganhou campos opcionais e listas por linha em “Informações em Ver fotos”. Editores antigos que omitem `details` preservam os dados. Os quatro destaques públicos continuam independentes das listas completas. Novas informações não alteram quartos físicos, tarifas ou reservas.

Verificação: build/typecheck e contratos HTTP; contrato Postgres real com rollback (`database/test-room-showcases.sql`) cobre validação, autorização e preservação dos detalhes/fotos. Chromium em 320/390/430/768/1024/1440px: álbum claro, informações por categoria, setas, miniaturas, Escape, CTA, rolagem sem overflow e editor com API simulada. WebKit nativo não instalado. Auditoria não apresentou novos alertas; permanece o aviso anterior de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

A seção `#galeria-pousada`, entre Sobre e Quartos, é uma faixa com dez fotos reais existentes, três visíveis no desktop e uma com prévia da próxima no celular. Troca a cada 3 segundos em sequência contínua, com navegação manual e preferência de movimento reduzido. Fotos/ordem estão nos figures do `index.html`; estilos/comportamento em `galeria-pousada.css/js` (incluídos no preparo de assets). Somente essa faixa ocupa toda a largura da tela, sem margens laterais; as demais seções conservam suas larguras.

## Vídeo de abertura

O carrossel do cabeçalho foi substituído pelo MP4 enviado pelo usuário (`flor_de_lotus_ondas_naturais_loop (1).mp4`), convertido de MPEG-4 Part 2 para H.264/yuv420p com faststart e sem áudio. Arquivos publicados explicitamente: `media/abertura-praia.mp4` (8 s, 960×538, cerca de 1,9 MB) e `media/abertura-praia.jpg` (poster). Não copiar o arquivo-fonte de attachments para public. O script prepare-public copia somente esses dois arquivos de mídia.

HTML usa autoplay/muted/loop/playsinline. `inicio.js` mantém navegação/intro e controla reprodução ao abrir menu, sair da tela, ocultar aba e mudar preferência de movimento reduzido; poster permanece disponível se autoplay for bloqueado ou houver falha. Movimento reduzido usa imagem estática. Os pontos/temporizador/swipe do antigo hero foram removidos; galerias de fotos e quartos continuam independentes. Marca, texto e navegação foram preservados.

Verificado em Chromium sem forçar a política de autoplay: reprodução, reinício real do loop, atributos de mídia, menu mobile, pausa fora da tela, poster, Range HTTP 206, ausência de erros JS/overflow e layouts 1440/1024/390/320px. H.264 foi escolhido para compatibilidade; Safari nativo não está instalado neste ambiente. Build e typecheck passaram.

## Consulta de quartos e conteúdo editável

A home apresenta somente **Quarto Standard** e **Quarto Superior**. “Ver mais quartos” e “Ver tarifas” abrem a consulta de entrada, saída e hóspedes para um quarto. Ao consultar, o visitante segue para `/quartos` com as datas preservadas. `/reservas` continua funcionando como alias da mesma página, incluindo URLs `.html` e parâmetros `start`, `end`, `guests` e `package_id`.

O catálogo usa fotos e textos da própria pousada, apresenta todas as acomodações editoriais e consulta vagas/valores dos quartos físicos. Sem quartos cadastrados ou sem disponibilidade, não exibe preços ou vagas inventados. Os cartões indisponíveis continuam permitindo conhecer fotos e detalhes; reservas só são solicitadas para quartos retornados pela consulta. A criação continua pendente, com total e bloqueio de datas calculados pelo banco; a pousada confirma depois.

No painel:

- **Conteúdo dos quartos:** títulos, descrições, fotos, ordem das fotos, ícones e informações detalhadas. Standard/Superior aparecem na home e no catálogo; as demais apresentações aparecem no catálogo.
- **Quartos:** nome/número físico, capacidade, diária, disponibilidade para venda e **Fotos e descrição no catálogo**, que associa o quarto à apresentação editorial. “Padrão do tipo de acomodação” usa o tipo cadastrado. Selecione Superior explicitamente para quartos dessa categoria.
- **Pacotes / Disponibilidade / Reservas:** mesmas regras de períodos, valores, bloqueios e confirmação administrativa já existentes.

A migração remota `lotus_room_catalog` está reproduzida em `database/room-catalog.sql`. O vínculo é privado, com RLS e acesso direto negado. A nova RPC `lotus_room_catalog_api` complementa as operações de catálogo/admin/consulta/cadastro de quarto; delega as validações, autorização e regras de reserva ao dispatcher anterior. Salvar a diária e sua apresentação é atômico. A API antiga continua disponível; operações de reservas não foram substituídas.

Validação: `npm run build`, `npm run test:supabase-api` (25 cenários HTTP com backend simulado) e `database/test-room-catalog.sql` no Postgres real com rollback. Navegador: fluxo home → datas → catálogo → opções → solicitação pendente; erros de conexão, falta de vagas, cancelamento da consulta, edição administrativa refletida e larguras 320/390/430/768/1024/1440px. Nenhuma reserva de teste foi criada em produção. O carrossel de fotos avança a cada **2 segundos no celular** e **3 segundos no computador**.

### Localização e políticas na página de quartos

`/quartos` (também `/reservas`) inclui o mesmo Google Maps da página inicial, em Localização. As políticas ficam em **Administração → Políticas da pousada**: horários, pets, internet, estacionamento, crianças/camas extras, pagamentos, cancelamento, confirmação de reserva e outras informações. Campos vazios ficam ocultos. São textos informativos; não mudam cálculos de tarifas nem o fluxo de confirmação de reservas.

Persistência: `database/property-policies.sql` (`lotus_property_policies`, aplicada ao projeto autorizado), tabela privada com RLS e RPC `lotus_policy_api`. Leitura pública; escrita exige administrador com sessão ativa, validação de campos e revisão para evitar sobrescrever edições concorrentes. `GET/PUT /api/policies` reutiliza cookies administrativos e a proteção de origem. Testes de banco: `database/test-property-policies.sql`, transação revertida. A política de cancelamento começa vazia até ser definida pela pousada.

O login administrativo também aceita o usuário `admin`, resolvido no servidor para o e-mail da conta administrativa existente. `ADMIN_LOGIN_EMAIL` permite atualizar esse destino se o e-mail da administração mudar; o padrão é a conta inicial autorizada acima. O e-mail continua aceito no formulário. O alias não concede privilégios: a sessão Supabase e a autorização no banco continuam obrigatórias. A senha foi atualizada a pedido do proprietário e não é armazenada no repositório; o acesso temporário inicial mencionado acima foi substituído.

### Minha conta: reservas e lembretes

A conta Google agora tem acesso a `GET /api/guest/bookings`: próximas estadias, histórico (incluindo cancelamentos), detalhes e avisos. A propriedade de cada reserva fica em `lotus_private.booking_guest_links`; o banco verifica UUID, identidade Google, e-mail confirmado e sessão Auth ativa. Nome, telefone ou um ID enviado pelo navegador nunca permitem consultar reservas de terceiros. `PATCH /api/guest/bookings` marca apenas avisos da própria conta como lidos, com proteção de origem e limite de corpo.

Reservas feitas com a conta Google conectada são vinculadas na mesma transação da criação; continuam pendentes até confirmação administrativa. O painel não oferece mais vinculação manual à conta Google; o vínculo das reservas feitas pelo site é automático, usando a conta autenticada do hóspede. Não há associação automática por nome/telefone. O painel público não oferece cancelamento nem altera status. O horário do servidor determina a passagem de uma estadia para o histórico após o check-out.

`database/guest-bookings.sql` registra as tabelas e RPC `lotus_guest_booking_api`. Migrações remotas: `lotus_guest_bookings_and_reminders`, `lotus_guest_booking_email_resolution` e `lotus_guest_booking_server_time`. O SQL consolidado contém as correções. `database/test-guest-bookings.sql` testa isolamento entre duas contas, vínculo administrativo, sessão revogada, histórico, reserva pendente, confirmação, cancelamento e agendamento idempotente, com rollback.

Os dois lembretes são agendados no banco para **10 dias** e **24 horas** antes do check-in às **14:00, America/Bahia**, somente em reservas confirmadas. Avisos futuros ficam ocultos até o horário; a conta aberta atualiza os avisos a cada minuto. A exclusão/cancelamento ou a troca de dono/data retira os avisos inválidos e cancela as entregas pendentes. Novas reservas feitas após o horário de um lembrete não geram envio retroativo desse lembrete.

**WhatsApp e e-mail ainda não enviam mensagens.** O proprietário informou que ainda não tem provedores e deixou essa conexão para depois. `guest_reminder_deliveries` prepara as duas entregas por aviso no estado `awaiting_setup`, sem marcar como enviado. Não há worker de envio ativo. Para ativar depois, conectar um número à API oficial do WhatsApp Business, aprovar os modelos de mensagem e configurar um provedor de e-mail com remetente verificado. Implementar então o worker autenticado com deduplicação, rechecagem de status/datas/proprietário e política de expiração; habilitar as entregas somente após configurar os serviços e validar o fluxo. Não tratar um número de telefone simples como integração de envio, não usar automação do WhatsApp Web e nunca armazenar tokens/chaves no código ou em campos públicos do painel. Se o horário de check-in mudar, atualizar o agendamento estruturado e os testes; o texto livre da política sozinho não altera o horário usado pelo lembrete.

A área do hóspede agora fica na página exclusiva **`/minha-conta`** (`minha-conta.html`, renderizada pela mesma camada de rotas permitidas). Os links da página inicial e do catálogo abrem uma nova aba com `noopener`; o antigo modal foi removido. O retorno do Google, inclusive erros, segue para essa página. Ali ficam perfil, reservas, histórico e avisos. As respostas autenticadas continuam privadas e sem cache; o HTML da página não inclui informações pessoais. `conta.js` mantém o avatar no cabeçalho das outras páginas e carrega o painel completo somente em Minha conta.

### Login obrigatório e vitrine de pacotes

Reservas públicas agora exigem login Google antes de finalizar. A API retorna 401 sem a sessão do hóspede; o banco também rejeita chamadas diretas anônimas a `lotus_api('book')`. Toda criação pública com Google vincula a reserva ao UUID da sessão na mesma transação. A confirmação final continua com a administração. Registros feitos pela equipe no painel mantêm o fluxo administrativo. Migração: `database/require-google-booking.sql` (`lotus_require_google_for_public_booking`), após as migrações de conta do hóspede.

Na página de quartos, os pacotes ficam centralizados e são exibidos até três cartões. Com mais de três, “Ver mais” abre `/pacotes` em nova aba. A página exclusiva mostra todos os pacotes ativos, sem os vencidos, e permite consultar cada um no catálogo de quartos com período e tarifa preenchidos. Os cadastros continuam na aba Pacotes da administração.

## Editor do site no painel administrativo

Acesse `/admin` e escolha **Editar site**. As onze áreas do editor cobrem identidade e contatos; cabeçalho/vídeo; Sobre a pousada; carrossel; apresentação dos quartos; lazer; praias e passeios; avaliações em destaque; contato; página de quartos; ordem das seções e blocos extras.

- **Pré-visualizar** mostra o conteúdo ainda não publicado, com opções de computador e celular. A prévia é visual, com scripts e formulários desativados.
- **Publicar alterações** salva o documento no Supabase; novos acessos ao site já recebem o conteúdo. Não exige novo deploy.
- Fotos: JPG/PNG/WebP até 3 MB. Vídeos: MP4 (H.264 recomendado) ou WebM até 50 MB, enviados diretamente para o Storage por URL assinada após autorização administrativa. A troca do vídeo principal também o aplica no celular, gera uma capa quando possível e limpa o vídeo móvel/animação antigos. O editor permite ajustar velocidade e duração do trecho; o padrão atual mantém os cinco segundos iniciais a 0,65×.
- Carrosséis e listas permitem adicionar, remover e ordenar itens. Seções podem ser ocultadas e reordenadas. Blocos extras usam modelos de texto, imagem e botão, com fundo claro/areia e imagem à esquerda/direita; não aceitam HTML ou JavaScript livre.
- **Histórico de publicações** permite restaurar até 30 versões anteriores do conteúdo deste editor. Fotos e arquivos antigos são preservados para que o histórico continue funcionando. Os rascunhos editoriais são guardados automaticamente no navegador, não são publicados automaticamente e podem ser recuperados depois de reabrir o editor; há aviso antes de sair. Se a revisão publicada tiver mudado, o painel permite baixar o rascunho em vez de sobrescrever a publicação concorrente.
- Fotos, textos e ícones de cada quarto permanecem em **Conteúdo dos quartos**. Valores/inventário, pacotes, reservas e políticas mantêm suas abas e regras independentes.

Persistência: `database/site-content.sql`; tabelas privadas com RLS, escrita e histórico restritos a administrador com sessão ativa, revisão otimista e bucket público `lotus-site` para mídia editorial. O documento público nunca contém dados de hóspedes. A renderização valida URLs e escapa textos. O conteúdo inicial em `src/lib/site-content-defaults.json` preserva o site antes da primeira publicação e serve como fallback em falhas temporárias de leitura.

Verificações: `npm run typecheck`, `npm run build`, `node scripts/test-site-editor.mjs` (HTTP Next.js real + Supabase isolado simulado + Chromium; requer Playwright Python e `/usr/bin/chromium`) e `database/test-site-content.sql` (transação com rollback no banco). O teste do editor exercita permissões HTTP, validação, URLs assinadas, upload de foto/vídeo, prévia sem escrita, publicação, conflito de revisão, histórico, restauração, preservação do rascunho e layout móvel. `npm run test:supabase-api` verifica também o contrato das rotas já existentes.

### Guia de Itacaré

A seção de praias da página inicial mostra até três destinos (priorizando os marcados como destaque) e abre `/itacare` em nova aba. O guia reúne todas as fotos cadastradas, filtros de praia/cachoeira, busca sem diferenciação de acentos, álbuns acessíveis e passeios com consulta pelo WhatsApp configurado na pousada. Os roteiros iniciais são 4 praias + cachoeira; Jeribucaçu com Usina e Arruda; e observação de baleias em agosto e setembro. O passeio das baleias usa uma ilustração decorativa até haver uma foto real cadastrada.

Em **Editar site → Praias e passeios**, edite capa, introduções, destinos, fotos, tópicos, destaques, passeios e temporadas. As publicações antigas são complementadas em memória apenas nos campos recém-adicionados, preservando os textos, imagens e a ordem já salvos; o histórico continua válido. Não é necessária alteração no banco para adicionar esses campos editoriais.

`itacare.html`, `itacare.css`, `itacare.js` e `src/lib/itacare-content.ts` implementam o guia. As imagens locais usam o otimizador nativo do Next.js: cartões em 828 px e galeria ampliada em 1200 px. As próximas fotos são pré-carregadas e decodificadas antes do clique; a galeria aproveita a prévia disponível enquanto prepara a versão maior. A fila prioriza cliques e limita downloads paralelos; o cache de imagens preparadas também tem limite de memória por quantidade de fotos. `scripts/test-itacare-browser.py`, executado por `scripts/test-site-editor.mjs`, verifica abertura em nova aba, filtros, busca, fotos por teclado, retorno de foco, links de contato e layout em desktop/celular. O teste do editor também verifica que a capa textual e a temporada dos passeios publicadas no painel aparecem no guia.

No guia, a seta sobre cada cartão com várias fotos avança uma imagem por clique, com contador e sem passagem automática. “Ver N fotos” abre o álbum na imagem que estiver em destaque. A capa e as fotos maiores também acompanham suavemente o mouse com deslocamento e inclinação leves, somente em desktop com mouse; o efeito volta ao centro ao sair e respeita movimento reduzido.

O teste do guia verifica também duas trocas de foto com a rede desligada após o pré-carregamento, no desktop e na largura de celular, com seta sempre habilitada e sem avanço automático.

O menu principal do painel também oferece **Praias e passeios**, com acesso direto em `/admin#praias-passeios`. A área usa o mesmo documento e histórico de **Editar site**, sem duplicar dados. Os grupos **Capa e apresentação**, **Praias e cachoeiras** e **Passeios** tornam os campos mais fáceis de localizar. O atalho **Editar fotos do passeio das baleias** abre o roteiro de tipo baleias; em **Fotos → + Adicionar**, é possível enviar imagens ou escolher as já existentes. A primeira foto publicada substitui automaticamente a ilustração e se torna a capa. Subtítulos opcionais de destinos e passeios também são editáveis. Os campos expandidos permanecem abertos após o upload.

### Avaliações dos hóspedes

A aba **Avaliações** (`/admin#avaliacoes`) edita a apresentação, as notas por plataforma e os depoimentos que alimentam a página inicial e `/avaliacoes`. A inicial exibe até três avaliações publicadas, priorizando as marcadas como destaque. É possível adicionar, ocultar, reordenar e editar as transcrições, informar fonte/link e datas reais, e pré-visualizar antes de publicar. Textos longos têm expansão acessível; a página completa oferece busca, filtros de origem e lotes de seis comentários.

As notas são manuais, com escala individual de 5 ou 10; a nota geral não é calculada pelos comentários cadastrados. Quantidade zero significa não informada e não é exibida. Links e datas desconhecidos ficam vazios, sem alegação de sincronização automática ou selo de hóspede verificado. A coleta de novas avaliações pela conta do hóspede não faz parte desta etapa.

A migração editorial em `upgradeReviewContent` preserva os três depoimentos da inicial e os 14 da antiga página completa, incluindo as notas numéricas existentes. As estrelas decorativas dos três destaques não são convertidas em notas Booking. O marcador `schemaVersion` impede reintroduzir comentários removidos após a primeira publicação no novo editor; versões antigas continuam legíveis. Nenhum comentário é deduplicado apenas pelo nome.

`reviews.css`, `reviews.js` e `src/lib/review-content.ts` implementam a apresentação. `scripts/test-reviews-browser.py`, executado pelo teste do editor, verifica busca, paginação, publicação, ocultação, rascunhos, prévia, fontes/escalas separadas e layout móvel. O teste HTTP cobre também migração de publicações antigas e rejeição de notas, escalas, datas e URLs inválidas.


## Melhorias de operação e publicação — outubro de 2026

- **Configuração e pendências** reúne instruções e links para Google OAuth, Silbeck, WhatsApp Business, e-mail, domínio próprio, Search Console e backups. Dados públicos e conferências ficam no grupo editorial de mesmo nome. Não há campos de segredo: tokens e credenciais continuam exclusivos dos provedores/servidor. Marcar uma conferência não ativa uma integração. Serviços externos podem depender de plano e configuração adicional.
- `/privacidade` informa o tratamento de dados e usa nome empresarial/e-mail configuráveis, com WhatsApp como contato alternativo. `/condicoes` mostra as políticas reais, sem inventar cancelamento ou regras para crianças. Links ficam no rodapé e junto à solicitação de reserva.
- **Horários estruturados**: aplicar `database/property-hours.sql` após as migrações anteriores. Os campos de hora na aba Políticas atualizam a apresentação, as datas/horas retornadas para Minha conta e os lembretes futuros; observações do texto são preservadas. A migração não altera os horários atuais (14h/12h), tarifas, status ou noites de reservas. Mudar o horário depois cancela entregas antigas ainda não enviadas e agenda os novos avisos elegíveis. Contratos e permissões são verificados com rollback em `database/test-property-hours.sql`, `test-property-policies.sql` e `test-guest-bookings.sql`.
- A visão geral mostra entradas/saídas confirmadas do dia no horário da Bahia e destaca solicitações pendentes há mais de 24h. Não existe cancelamento/expiração automática: a gestão continua responsável pela confirmação ou cancelamento. Reservas externas precisam ser registradas até existir sincronização oficial com Silbeck.
- Imagens JPG/PNG enviadas pelo editor são reduzidas para até 1920px e WebP quando isso gera um arquivo menor. WebP é preservado para não destruir animações. O editor alerta para vídeos acima de 8 MB, mantendo o limite de upload existente.
- Vídeos publicados: `jardim-otimizado-desktop.mp4` (1920×1080, 5 s, aproximadamente 5,9 MB) e `jardim-otimizado-mobile.mp4` (1280×720, 5 s, aproximadamente 2,5 MB), com a mesma velocidade de reprodução aprovada. Alternativa animada otimizada em WebP, 800×450/12fps. Fontes antigas preservadas no repositório, sem serem copiadas para public. A introdução agora aparece uma vez por sessão e dura cerca de 1,2 s; movimento reduzido continua respeitado.
- Metadados próprios por página, URLs canônicas (incluindo `/reservas` → `/quartos`), Open Graph, Twitter Card, dados estruturados da pousada e `/sitemap.xml` + `/robots.txt`. Administração, conta, API e OAuth usam sinalização para não indexação. `APP_URL` define a origem canônica e o retorno OAuth em produção; ao mudar de domínio, configure também hospedagem e provedores. Sitemap é gerado no build: refaça o deploy depois de mudar APP_URL.
- Cabeçalhos CSP, proteção contra incorporação externa, MIME sniffing e política de referenciador. A CSP mantém inline scripts/estilos necessários ao legado e autoriza os destinos OAuth. O preview administrativo continua permitido na mesma origem; fontes, mapas e uploads usam os serviços já existentes. Loopback é permitido apenas no build fora da Vercel para testes isolados.
- Leitura editorial pública usa cache de até 60s com invalidação ao publicar/restaurar. Erros de atualização não são gravados no cache como conteúdo inicial; há último conteúdo válido em memória e log sem dados pessoais. Sem qualquer publicação disponível, o fallback inicial permanece. Disponibilidade, preços consultados, autenticação e dados de hóspedes continuam sem cache compartilhado.

Validação: `npm run build`, `npm run typecheck`, `npm run test:supabase-api`, `npm run test:guest-auth`, `node scripts/test-site-editor.mjs`. Este último inclui `test-professional-browser.py`: configuração, recuperação após reload, publicação, links legais, metadados e layouts 320/390/768/1440px. Testes HTTP/Chromium usam provedores isolados; não comprovam consentimento Google real, Safari/iPhone, entrega de mensagens ou sincronização Silbeck. Essas etapas ficam documentadas no painel para a pousada.


## Contato simplificado pelo WhatsApp

A seção Fale Conosco usa `contato.css/js`, sem depender de jQuery/Inputmask para validar o formulário. Nome, entrada, saída, quantidade de hóspedes e informação sobre pet são obrigatórios; ao levar pet, o porte também é solicitado; mensagem é opcional e não há campos de e-mail ou telefone. A entrada aceita datas a partir de hoje no fuso da pousada e a saída deve ser posterior. O botão abre um rascunho no WhatsApp configurado em Identidade e contatos; não envia mensagens automaticamente nem cria uma reserva. Nome/período/hóspedes/pet/mensagem não são salvos pela aplicação nem enviados a uma API de contato. O visitante confirma o envio no WhatsApp; se a janela não abrir, um link permite tentar novamente sem perder o preenchimento.

Editar site → Seção de contato permite alterar título, subtítulo, introdução, botão e a mensagem padrão usada quando o visitante deixa o texto vazio. Publicações anteriores recebem apenas os campos novos ausentes, preservando títulos e dados existentes. Endereço, mapa, WhatsApp e redes sociais continuam na configuração compartilhada. `scripts/test-contact-browser.py`, executado pelo teste integrado do editor, confere validação, mensagem opcional, codificação de caracteres, destino configurado, proteção da nova janela, recuperação por link e layouts 320–1440px, sem abrir nem enviar mensagens reais.


## Apresentação Sobre a Pousada

`sobre.css` e `src/lib/about-content.ts` apresentam a seção com foto principal, segunda foto opcional sobreposta, textos em parágrafos e uma faixa de comodidades com ícones SVG. O link Conheça os quartos usa o deslocamento/foco acessível da navegação existente, respeitando movimento reduzido. A seção é responsiva e preserva a largura das demais áreas. Fotos existentes da pousada foram reutilizadas.

Editar site → Sobre a pousada permite editar as duas imagens e descrições, o texto acima do título, a frase de destaque, a legenda, os rótulos dos botões e as comodidades (uma por linha; o ícone acompanha palavras como Wi-Fi, café, estacionamento, varanda e piscina, com ícone neutro para outras). Campos novos são preenchidos apenas quando ausentes em publicações antigas, preservando textos/imagens personalizados. A nova descrição inicial evita duplicar a nota das avaliações, que continua sendo gerenciada na seção própria.

Verificação: build, TypeScript, `node scripts/test-site-editor.mjs` e teste focado `node scripts/test-site-editor.mjs --about-only`. O teste de navegador cobre imagens, ícones, ausência de overflow de 320 a 1900px e navegação para quartos; a API cobre compatibilidade editorial e escape de texto. Provedores externos são simulados; conteúdo publicado e reservas não são alterados pelos testes.


## Envio de fotos grandes no editor

O editor geral não oferece mais a lista de imagens já usadas no site. As fotos são escolhidas no dispositivo. Não existe limite de tamanho aplicado ao arquivo original de uma foto JPG/PNG/WebP antes da otimização: o navegador decodifica e prepara uma versão com até 1920px e até 3 MB para armazenamento. Esse tamanho final é um limite interno do envio, sem exigir que o administrador reduza previamente sua foto. O processamento pode depender da memória e dos formatos suportados pelo dispositivo; arquivos corrompidos recebem erro específico. WebP animado pequeno é preservado; animação acima do limite interno não é convertida silenciosamente em foto estática. Vídeos mantêm a regra existente de 50 MB.

`node scripts/test-site-editor.mjs --upload-only` valida uma foto de origem acima de 50 MB, otimização antes da validação final, envio por URL assinada e publicação refletida em Sobre a pousada, com backend/Storage isolados. Não envia fotos ou publicações ao banco real.


## Dimensionamento automático do carrossel

Fotos enviadas em Editar site → Carrossel da pousada são preparadas em 4:3, até 1600×1200px, com recorte central para preencher todo o quadro sem esticar nem acrescentar faixas. O carrossel mantém imagens do mesmo tamanho, contíguas, usando `object-fit: cover`; celular mantém foto central e prévias laterais, com os intervalos existentes. A experiência anterior com imagem inteira e fundo claro foi retirada a pedido do proprietário. Outras imagens do editor mantêm sua proporção e a otimização existente. Teste focado: `node scripts/test-site-editor.mjs --gallery-only` (retrato, panorama, preenchimento sem faixas, proporção, alturas iguais, quadros adjacentes e publicação com backend isolado).


## Qualidade da capa do guia de Itacaré

A capa inicial conhecida (miranteitacarezinho1.jpg, 2268×3014) usa variantes locais com qualidade 90 em 828/1200/1920px, mais o arquivo original de 2268px para telas maiores/densas. O navegador escolhe pelo tamanho da tela, sem gerar uma versão ampliada artificialmente. A sombra lateral da paisagem foi suavizada no desktop, preservando o contraste da navegação e dos textos. Capas personalizadas continuam usando o arquivo escolhido no painel sem declarar dimensões desconhecidas. Teste focado: `node scripts/test-site-editor.mjs --guide-only`.


## Brilho dourado nos comentários

Os cartões de avaliação da página inicial e de `/avaliacoes` têm um brilho radial discreto acompanhando a posição do mouse dentro do cartão. Usa requestAnimationFrame, variáveis CSS e camada com pointer-events:none, sem alterar o cursor ou impedir seleção, links e expansão dos relatos. O efeito existe apenas em telas a partir de 768px com hover/mouse preciso e sem preferência de movimento reduzido. Sai imediatamente ao deixar o cartão, trocar filtros, redimensionar, ocultar a aba ou perder foco. Durante a rolagem, só permanece enquanto a posição do cursor ainda estiver dentro do cartão. Teste focado: `node scripts/test-site-editor.mjs --glow-only`.

O editor de imagens oferece **Ajustar enquadramento**: arraste, use as setas do teclado e ajuste o zoom antes de publicar. O carrossel mantém 4:3; outras fotos oferecem formatos horizontal, panorâmico, quadrado e vertical. As novas fotos guardam uma origem otimizada junto ao recorte no conteúdo versionado, permitindo reajustes após recarregar o painel. Fotos antigas só podem recuperar áreas que ainda existam no arquivo salvo; envie o original novamente para recuperar partes já cortadas. Nenhum recorte é publicado até clicar em Publicar alterações. O brilho de avaliações é discreto (32 px), exclusivo para mouse no computador e respeita movimento reduzido.

## Instagram na página inicial

A seção Instagram fica entre Área de Lazer e Praias de Itacaré. Em Editar site → Instagram da pousada, cadastre fotos, títulos e descrições, ordene as fotos, ajuste o enquadramento 4:3 e os intervalos de reprodução. O link do perfil usa Identidade e contatos → Instagram. As fotos são enviadas manualmente pelo administrador; não há importação ou sincronização com a API do Instagram. Sem fotos cadastradas, a seção mostra o convite e o link do perfil, sem quadros vazios. As duas faixas fotográficas têm controles e reprodução independentes, com três fotos no computador e vizinhas parcialmente visíveis no celular. Publicações anteriores recebem a seção após lazer sem sobrescrever o conteúdo existente.

## Consulta e conclusão da solicitação de reserva

A página de quartos inicia a consulta com hoje/amanhã, preservando datas informadas na URL. Quando uma categoria não comporta os hóspedes da busca, ela informa a capacidade cadastrada e mantém a diária de referência identificada; esse valor não é uma cotação nem indica disponibilidade. O total da estadia só aparece como tal para opções retornadas pelo servidor. No administrador, cada unidade identifica sua apresentação no site para facilitar a conferência de capacidade e tarifa.

Escolher uma unidade abre a solicitação, exige login Google e oferece acesso explícito a Minha conta; ao voltar à aba, a sessão é atualizada, com atualização manual disponível. Após o servidor registrar a solicitação, uma confirmação centralizada abre imediatamente, antes da atualização de disponibilidade. Ela pode ser fechada por Entendi, pelo botão de fechar ou Escape; o comprovante continua na página. O envio retorna um comprovante da solicitação com número, acomodação/unidade, datas, hóspedes, total e links para Minha conta e WhatsApp. O WhatsApp abre um rascunho para acompanhamento; não finaliza outra reserva. A solicitação bloqueia a unidade e aguarda confirmação e pagamento combinados pela pousada. Erros de disponibilidade têm mensagem visível e consultas têm limite de espera de 15 segundos. Não há integração Silbeck ou cobrança online ativada.

`scripts/test-booking-flow-browser.py` testa esse percurso e os estados de capacidade insuficiente, login, sucesso, conflito e indisponibilidade do serviço, com respostas sintéticas sem criar reservas reais. Os contratos HTTP e Google/PKCE são verificados separadamente por `npm run test:supabase-api` e `npm run test:guest-auth`.

## Estoque por quarto físico e andar

`database/room-inventory.sql` estende o estoque existente com andar, aptidão para família, configuração quádrupla e o andar registrado em cada reserva. O filtro de andar é validado no banco e aplicado à disponibilidade; no envio, a unidade é bloqueada individualmente e o andar é conferido novamente sob o lock existente. Reservas pendentes, confirmadas e bloqueios continuam sujeitos à exclusão de noites sobrepostas por **room_id**, nunca por categoria inteira. O histórico guarda o andar da unidade no momento da solicitação. A autorização Google, a vinculação da conta e as políticas privadas continuam no dispatcher instalado.

`database/provision-19-rooms.sql` é uma preparação **única**, autorizada pelo proprietário, e não deve ser reexecutada para não sobrescrever configurações futuras: 19 unidades inicialmente duplas, 1–11 no térreo e 12–19 no superior (numeração provisória editável). Preserva IDs de quartos existentes, reservas, vínculos de contas, valores das reservas e diárias já cadastradas; novas unidades começam com a diária de duplo previamente cadastrada (R$ 200,00 na configuração aplicada), editável pelo proprietário. A preparação aborta caso reservas futuras existentes exijam mais de duas pessoas. Um hash interno dos registros existentes foi conferido antes/depois, sem expor dados dos hóspedes.

Em Administração → Quartos → Editar quarto, o proprietário define andar, Single/Duplo/Triplo/Quádruplo/Família, capacidade máxima atual, diária, apresentação e disponibilidade para venda. Até duas unidades podem ser marcadas como aptas para família; os números não foram presumidos e devem ser indicados pelo proprietário. Os quartos de família usam o mesmo estoque físico, sem duplicar vagas entre configurações. As apresentações sem unidade ativa vinculada não são exibidas no catálogo. O cliente escolhe datas, hóspedes e andar e recebe opções por unidade; andar e quantidade de hóspedes acompanham confirmação, Minha conta e WhatsApp.

`database/test-room-inventory.sql` foi executado com a alteração de esquema e o provisionamento dentro de uma transação revertida: conferiu estoque 11/8, duas reservas em quartos diferentes no mesmo período, rejeição de conflito na mesma unidade, configuração quádrupla, limite de dois quartos de família, andar da reserva e autenticação. `node scripts/test-site-editor.mjs --inventory-only` verifica busca, estoque após reservar, edição administrativa e layout móvel via rotas Next e SDK de autenticação com serviços de teste isolados.


O fluxo público de reserva abre um diálogo de login Google ao escolher uma unidade sem sessão. O botão de solicitar continua acionável e reapresenta o login, em vez de ficar desativado sem orientação. O botão Google envia o formulário por POST para `/auth/google` em uma janela dedicada, preservando a unidade, período e campos na aba de reserva. Após a autenticação, a página Minha conta reconhece somente a janela de login marcada nesta sessão, avisa a aba original e fecha a janela; a aba original sempre verifica novamente `/api/guest/session`, sem receber tokens por mensagens. Nenhuma reserva é enviada automaticamente ao entrar: o hóspede confere os dados e solicita. Cancelamento permite nova tentativa; o link Minha conta e a verificação manual atendem bloqueadores de janela. PKCE, cookies HttpOnly, exigência de Google no backend e associação da reserva à conta permanecem inalterados.

A distribuição foi corrigida para 11 unidades no térreo e 8 no superior em `database/correct-room-floors.sql`, alterando apenas o andar das unidades provisórias 10 e 11, sem reservas futuras nessas unidades. Os registros de reservas foram preservados.

## Avisos de novas solicitações para a equipe

Aplique `database/admin-booking-alerts.sql` uma vez. Cada **nova** reserva pendente gera um único evento privado e um registro WhatsApp `awaiting_setup` na mesma transação da reserva. Reservas anteriores à ativação continuam no painel normal e não são importadas como novos avisos. Confirmar não duplica eventos; cancelar remove o aviso da contagem e cancela a entrega externa ainda não enviada. Leituras são guardadas por administrador e não alteram o status da reserva. Tabelas privadas têm RLS, acesso direto revogado e funções com sessão administrativa validada; os avisos não incluem nome ou telefone do hóspede.

No botão **Avisos** do administrador, ative o som por uma ação do usuário e autorize notificações do navegador. O título da aba mostra `(N)` com os avisos não lidos; há aviso visual, sino de três notas suaves e notificações do sistema em segundo plano, conforme suporte/permissão. A consulta independente ocorre aproximadamente a cada 10 segundos (15 em segundo plano), preservando rascunhos do editor. O primeiro carregamento apresenta o contador sem tocar avisos antigos. IDs vistos são compartilhados por navegador e conta; Web Locks reduz duplicação entre abas. O contador é atualizado ao voltar ao navegador. Notificações exigem painel aberto e logado; suspensão da aba, economia de energia e repouso do computador podem pausar execução e som. O painel orienta a exceção de desempenho do Chrome, sem prometer avisos com a máquina suspensa.

O destinatário dos alertas WhatsApp pode ser salvo no diálogo de Avisos e fica em configuração **privada**, não no conteúdo público do site. Salvar o número não ativa o envio. A API Business, remetente e modelo precisam ser conectados e validados em etapa posterior; não há credenciais, provedor ou worker de envio configurados nesta implementação, e nenhum WhatsApp foi enviado. As pendências também estão explicadas em Configuração e pendências. Não colocar segredos no editor público.

Validação: `database/test-admin-booking-alerts.sql` executado com a instalação em transação revertida; verificou evento único, fila externa sem envio, leituras por administrador, cancelamento, telefone e acesso anônimo negado. `node scripts/test-site-editor.mjs --alerts-only` usa o Next real e serviços isolados para conferir contador 1/2, leitura, som, permissão, preservação de edição, destinatário privado, recarga, logout, CSRF e layout móvel. Som e notificações do sistema são simulados no teste; não disparam mensagens reais.


### Reservas por categoria, andar e ocupação

O catálogo mostra todas as apresentações. A consulta exige térreo ou piso superior. Standard usa estoque do térreo; Superior usa estoque do piso superior; Triplo Standard usa unidades térreas com capacidade mínima de três; Família usa unidades com capacidade mínima de cinco. As apresentações compartilham o estoque físico e nunca multiplicam vagas. O hóspede solicita uma categoria e andar, sem escolher uma unidade.

`database/category-bookings.sql` mantém um bloqueio interno provisório de estoque com a constraint de exclusão existente. A reserva aparece como “A definir pela pousada” até o administrador usar **Definir quarto**. A atribuição verifica andar, categoria, capacidade e conflitos; preserva o total e é obrigatória antes de confirmar novas solicitações. Reservas anteriores permanecem atribuídas.

**Diárias e temporadas** no painel cadastra valores por quarto/noite para cada andar e 1–6 hóspedes. Períodos substituem a diária padrão nas noites correspondentes (saída exclusiva), com proteção contra sobreposição e edições concorrentes. O catálogo informa “a partir de”; a consulta calcula as noites pela ocupação selecionada. Os preços iniciais autorizados são R$ 100 por pagante/noite (R$ 100 a R$ 600 para uma a seis pessoas), inicialmente nos dois andares. A fonte `database/initial-occupancy-starting-prices.sql` ativa os valores iniciais, preservando edições reais do proprietário e temporadas. O catálogo e os detalhes exibem “A partir de” em subtítulo e só o valor abaixo; a referência usa a diária padrão pela ocupação, enquanto o total da estadia continua calculado separadamente pelas noites e temporadas. Valores de reservas existentes não são recalculados.

Verificação: executar `database/test-category-bookings.sql` dentro de `BEGIN`/`ROLLBACK` depois das duas fontes SQL acima. `python3 scripts/test-category-booking-browser.py` testa o catálogo e painel em Chromium com APIs simuladas, sem reservas reais.


### Adultos, crianças e múltiplos quartos

Seletor compartilhado na home e catálogo em `stay-party.js`. Cada quarto tem pelo menos um adulto, número de crianças e idades na data da entrada (0–17). As idades são obrigatórias. A composição completa segue no parâmetro `party`, sem aceitar número de pagantes calculado pelo cliente.

`database/party-bookings.sql` separa total de pessoas, quantidade usada na capacidade e pagantes. Crianças de 0 a 5 anos são isentas; a partir de 6 anos entram na quantidade tarifada. Solicitações de vários quartos fazem bloqueios distintos em uma única transação, mantendo a atribuição física pelo proprietário. As idades e a composição ficam nos registros privados e no histórico autenticado. Preços ausentes ou demonstrativos não geram reservas. Verificações de dados sintéticos devem usar `database/test-party-bookings.sql` dentro de BEGIN/ROLLBACK.

**Regra confirmada:** todas as crianças contam na lotação, inclusive as de até 5 anos que não pagam. Assim, 4 adultos e uma criança precisam de capacidade para pelo menos 5 pessoas.


### Galeria clara e comodidades com ícones

Fotos da home (inclusive miniaturas) e “Mais detalhes e fotos” no catálogo abrem uma galeria centralizada com foto grande, setas circulares, miniaturas, destaques e lista de comodidades em duas colunas. A galeria mantém reserva e preços no catálogo, sem seleção de refeições ou tarifa extra de café da manhã. O café da manhã incluso foi confirmado pelo usuário.

Em **Conteúdo dos quartos**, o proprietário edita os destaques (0–16) e a lista completa de comodidades (0–32), escolhendo ícone e texto para cada item. Todos os ícones de referência são SVGs locais no catálogo `room-amenities.js`, sem dependência de fontes externas. A lista é persistida por apresentação em `lotus_private.room_showcases.amenities`; arrays vazios permanecem vazios, enquanto registros antigos sem esse campo usam seus detalhes existentes. O controle de revisão protege edições simultâneas e editores antigos preservam a nova lista. Fonte e teste em rollback: `database/room-amenity-icons.sql` e `database/test-room-amenity-icons.sql`.

### Idiomas nas páginas públicas

O seletor do cabeçalho da home (e do menu no celular) oferece Português, English e עברית, com bandeiras SVG locais. As demais páginas públicas recebem o mesmo seletor. Português é o idioma inicial; a preferência fica em `localStorage` (`lotus-language`). Hebraico usa `lang="he"` e `dir="rtl"`. Administração e Minha Conta não carregam o tradutor.

`site-language.js` carrega `/site-translations.json?v=2` do próprio site ao escolher inglês/hebraico. O antigo widget Google Translate foi removido, junto com suas permissões na CSP; a implantação anterior não traduzia de forma confiável. A troca utiliza traduções locais dos textos públicos atuais, incluindo descrições, comodidades, avaliações, políticas e mensagens dos seletores. Um observador aplica o idioma ao conteúdo dinâmico. Datas, hóspedes, crianças e campos preenchidos preservam seus valores. Voltar ao português restaura o texto original sem recarregar a página.

**Manutenção:** novas frases ou alterações editoriais no painel precisam ter versões em inglês e hebraico em `site-translations.json` (chave: texto em português; valor: `[inglês, hebraico]`). Textos ainda sem tradução permanecem no original; não há serviço de tradução automática. Formatos numéricos conhecidos, calendários e resumos dos hóspedes são tratados pelo cliente. Não usar traduções para alterar dados de reservas, URLs, preços numéricos ou conteúdo armazenado no CMS.

Verificação: `python3 scripts/test-site-language-browser.py` usa o dicionário real, sem simular um tradutor. Cobre textos em inglês/hebraico, conteúdo criado depois do carregamento, controles de crianças, retorno ao português, formulário preservado, navegação, teclado e celular. A build Next.js também foi testada em HTTP com CSP ativa e conteúdo editorial público em fixture, sem chamadas a um serviço de tradução externo.

### Ações em lote no histórico de reservas

Em **Reservas**, o histórico tem três painéis: pendentes, confirmadas e canceladas. As confirmadas ficam em ordem numérica de quarto (1, 2, 3… 18); reservas do mesmo quarto seguem pela entrada. A atribuição de quarto ou mudança de status atualiza a posição após o refresh. Selecione linhas, todas as reservas de um painel pelo cabeçalho da tabela ou todas as reservas pela barra de ações. **Confirmar selecionadas** inclui apenas pendentes com quarto definido; **Excluir selecionadas** inclui apenas canceladas e exige confirmação de exclusão definitiva. Os contadores dos botões mostram quantas reservas se aplicam à ação. A seleção é preservada nas atualizações automáticas e as ações aceitam até 100 reservas por lote.

`POST /api/bookings/bulk` chama `lotus_bulk_booking_api`, cujo acesso exige administrador com sessão válida. A função privada valida todos os IDs, bloqueia as linhas em ordem e executa a ação em uma transação; seleção desatualizada rejeita o lote inteiro. Confirmar reaproveita o caminho de status existente, preservando tarifas e notificações. Excluir remove reservas canceladas e seus vínculos/notificações dependentes por cascade. Nenhuma reserva real é removida pela implantação da função.

Fonte: `database/bulk-bookings.sql`. Verificações: `database/test-bulk-bookings.sql` dentro de BEGIN/ROLLBACK, `scripts/test-bulk-bookings-browser.py` com fixtures e `scripts/test-supabase-next.mjs` com servidor HTTP simulado.

### Grupos, excursões e relatórios

A home destaca grupos e direciona a `/grupos`. O organizador autenticado via Google informa datas, responsável e participantes por quarto físico, nos dois andares. Crianças até 5 anos não pagam e contam na capacidade. Solicitações são atômicas e pendentes, bloqueiam estoque e aparecem na aba **Grupos e excursões**. Após confirmação, organizador e equipe podem gerar lista por quarto para imprimir/salvar PDF. Cancelar libera estoque; nomes são privados.

A aba **Relatórios e recebimentos** oferece filtros de datas, últimos 12/24 meses e desde o início. Reservas confirmadas são contabilizadas por entrada; diárias representam suas estadias completas. Recebimentos são lançamentos manuais datados, independentes de confirmação e sem cobrança automática. Anular preserva o histórico. Configure o início da operação para limitar relatórios; testes existentes não são excluídos e testes com entrada posterior continuam aparecendo até gestão explícita pelo proprietário.

Aplicar `database/excursions.sql` após `party-bookings.sql` e `database/reports.sql`. Contratos em `database/test-excursions.sql` devem rodar dentro de BEGIN/ROLLBACK; navegador: `scripts/test-excursions-browser.py`. Estudo de integração externa e pendências do fornecedor: [HQBeds](docs/integracao-hqbeds.md).

Verificação de segurança após a migração: nenhuma advertência sobre tabelas/funções novas. Permanece o aviso preexistente de [proteção contra senhas comprometidas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) na configuração do Supabase Auth.

### Calendário administrativo por apartamento

Em **Calendário de reservas**, o proprietário vê datas no topo e os apartamentos em ordem numérica à esquerda, com a indicação de andar. A primeira consulta inicia hoje e cobre 14 dias; é possível selecionar um mês inteiro ou informar início/fim (até 93 dias por consulta), inclusive datas futuras. Confirmadas ficam verdes, pendentes amarelas e estadias encerradas vermelhas. Bloqueios são cinza; canceladas não ocupam a grade. A saída libera a noite para a próxima entrada. Reservas sem atribuição final mostram a unidade provisória de estoque com tracejado e permitem acessar **Definir quarto**.

As reservas aparecem automaticamente pelo estado administrativo autenticado, atualizado a cada 15 segundos. Filtros, campos em edição e rolagem são preservados nas atualizações; sair da conta limpa a grade. O calendário não muda status, datas, valores ou regras de estoque. Testes sintéticos sem escrita em produção: `scripts/test-admin-calendar-browser.py` (cores, períodos futuros, adjacência, filtros, atualização, atribuição, privacidade e celular) e `scripts/test-booking-panels-browser.py` (compatibilidade do histórico).

### Prioridade dos tópicos do painel

**Organizar menu ↕** abre a lista dos tópicos com setas e posição numérica. O número 1 aparece no topo; clique **Salvar ordem** para aplicar. A preferência fica no banco privado e é carregada nos outros dispositivos; cancelar não altera o menu. A revisão impede sobrescrever uma mudança de outra aba. A aba atual e seus eventos são preservados. O menu tem rolagem para manter todos os tópicos e a saída da conta acessíveis.

`database/admin-menu-order.sql` cria a configuração/RPC privada; testes de permissão e concorrência em `database/test-admin-menu-order.sql` com BEGIN/ROLLBACK. Testes de navegação: `scripts/test-admin-menu-browser.py`. Em Editar site foram removidos os botões de histórico/restauração e de descarte/recarregamento; o histórico interno, a prévia, os rascunhos e a publicação continuam preservados. Verificação direcionada: `node scripts/test-site-editor.mjs --editor-controls-only`.

### Catálogo com seis categorias

As opções aparecem em ordem: Standard, Standard Superior, Triplo Standard, Triplo Superior, Família e Família Superior. O andar é parte da elegibilidade de cada categoria; as duas opções Família são mostradas nas buscas somente para 5 ou mais pessoas por quarto, contando todas as crianças. As apresentações usam o mesmo estoque físico já cadastrado e os preços existentes por andar/ocupação. As novas variantes superiores começam com as fotos e comodidades atuais, editáveis em **Conteúdo dos quartos**; não foram criados quartos físicos adicionais. Migração `database/six-room-categories.sql`, verificação sintética em rollback `database/test-six-room-categories.sql`.

### Decoração romântica

Em **Editar site → Decoração romântica**, cadastre somente fotos reais da decoração, suas descrições alternativas e os textos. Use **Usar como principal** para levar uma foto à primeira posição; as setas ordenam as demais. Upload, otimização em 4:3 e recorte preservam a origem para novos ajustes. Ative **Exibir esta seção**, confira em **Pré-visualizar** e publique. Sem fotos, a seção permanece ausente nas duas páginas, mesmo com a exibição ativada.

O cadastro compartilhado `romance` alimenta o destaque da home e a galeria em `/quartos#decoracao-romantica` (também em `/reservas`). O botão da home leva à galeria; a consulta usa o WhatsApp de **Identidade e contatos** e a mensagem editável, sem tarifas fictícias ou promessa de itens inclusos. A primeira foto é a principal, até duas complementares aparecem na home e todas aparecem no catálogo, com ampliação em diálogo acessível. A ordem da home pode ser alterada em **Ordem e blocos extras**. As publicações anteriores recebem os campos novos na leitura, desativados e sem fotos, sem resemeadura do documento nem alteração de quartos, preços ou reservas. Não houve alteração de esquema ou permissões no banco.

Verificação com Next compilado e API/storage isolados: `node scripts/test-site-editor.mjs --romance-only`. Fotografias sintéticas usadas nesse teste ficam somente no serviço de teste em memória, nunca na publicação real.
