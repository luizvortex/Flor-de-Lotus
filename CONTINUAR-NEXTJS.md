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

## Supabase integrado em 22/10/2026

O usuário autorizou o projeto `asojfispuomhbfapqdmi` (`database-projetos`) pela conexão MCP **Zilter2**. A API padrão agora é Next.js/TypeScript + Supabase Postgres/Auth, sem dependência do Python em produção. O legado permanece apenas para referência e testes com `LOTUS_BACKEND=legacy` (desabilitado na Vercel).

Schema privado `lotus_private`: quartos, pacotes, reservas, autorização administrativa. RLS, negação de acesso direto e RPC com verificação de sessão/administrador. Constraint de exclusão impede sobreposição inclusive concorrente. A chave publishable versionada é pública e não concede acesso privilegiado. Não é necessária service-role key na aplicação.

Conta inicial solicitada: `zilterpacheoni17@gmail.com`, com senha gerada privadamente em `work/acesso-inicial-admin.txt` (fora do Git). O usuário pediu transferência futura ao proprietário: opção **E-mail e senha** implementada no painel, com senha atual obrigatória e confirmação de troca de e-mail pelo Auth. Não divulgar senha no chat/logs.

Migrações remotas via MCP: `20261022200433_lotus_reservations` e `20261022201313_lotus_explicit_deny_direct_access`. Fonte final em `database/lotus-schema.sql`. Regras verificadas em Postgres com rollback por `database/test-reservations.sql`; concorrência real verificada por duas chamadas MCP e dados sintéticos limpos. Dados reais em `.local/` não foram importados.

Pendente: validar login real/deploy em rede com acesso HTTPS aos domínios Supabase/Vercel; configurar Site URL e redirects de confirmação do Auth (instruções no README); proteção contra senhas vazadas está desativada no projeto. O projeto Vercel não apareceu na conta MCP conectada. A conversão dos templates HTML para componentes React continua pendente.

## Paleta visual unificada

O usuário aprovou as cores do painel/reservas e pediu o mesmo tom para o site público. `tema.css` centraliza a paleta (creme, verde profundo, texto escuro, bordas claras) e as fontes DM Sans/Playfair Display. `main.css` e `painel.css` importam esse arquivo; `prepare-public.mjs` precisa copiá-lo para `public/`. Site principal e avaliações usam cabeçalhos claros, botões verdes, cards brancos e sombras suaves. Imagens, conteúdo e fluxos de reserva foram preservados. Fundos e ondas inline usam variáveis; o CSS próprio de avaliações é carregado após o Bootstrap.

Verificação no Chromium: desktop 1440px e celular 390px sem overflow horizontal; menu móvel abre; Bootstrap e fontes carregam, sem erros JavaScript na página principal. Cores computadas do site e reservas coincidem. Screenshots de revisão ficam em `work/`, fora do Git.

## Nova abertura baseada no vídeo do usuário

Referência: vídeo WhatsApp de 15 segundos enviado pelo usuário. Página inicial atualizada com abertura breve de marca centralizada, cortina revelando a foto de baixo para cima, carrossel em tela cheia com crossfade e zoom sutil, cabeçalho transparente (menu à esquerda, marca central, reserva à direita) e atalhos de seções no desktop. Identidade verde/creme e imagens da pousada preservadas; sem copiar estrelas, prêmios ou datas da marca de referência.

`inicio.css` e `inicio.js` são específicos da home e preparados em `public/` pelo script de assets. O menu usa dialog nativo em tela cheia, com fechamento por Escape, contenção de foco e links de seções. Hero tem controles anterior/próximo, pausa, contador e swipe horizontal. Autoplay para em aba oculta, durante interação e com menu aberto. Respeita movimento reduzido. Sem JavaScript, a primeira imagem, título e link de reserva permanecem visíveis; intro tem fallback para nunca cobrir indefinidamente a página. Animação GSAP antiga que encolhia o hero foi removida; galerias internas preservadas.

Verificado em Chromium: intro e hero desktop 1440px, menu mobile 390px, setas/contador/pausa, Escape, navegação de âncoras, swipe por eventos de toque, crossfade automático, movimento reduzido e conteúdo básico sem JavaScript. Sem erros JS ou overflow horizontal nos caminhos testados. Screenshots e script de QA em `work/video-intro` e `work/check-intro.py` (ignorados).

## Refinamentos de navegação e paginação do carrossel

Hambúrguer visível somente até 767px; em notebook/desktop, marca centralizada e links abaixo dela. Menu móvel com tipografia menor e sem contorno no botão ao abrir por toque; foco de teclado continua visível. Ao redimensionar para desktop, um menu aberto fecha e libera a rolagem.

Paginação do hero substitui setas/contador por barra verde no slide ativo e pontos para os demais, conforme imagem do usuário. Pontos são botões acessíveis; pausa explícita permanece. Progresso usa Web Animations e relógio com tempo restante, pausando/retomando com hover, foco, menu e visibilidade da aba. Movimento reduzido mantém indicador estático. Em telas menores que 360px, a localização duplicada no rodapé do hero é ocultada para manter os controles centralizados.

Verificação Chromium: 1440/1024/768px sem hambúrguer, logo central, navegação abaixo; celular 390/320px sem overflow dos controles; toque sem contorno e Tab com indicador; fechamento ao redimensionar; progresso, pausa/retomada, avanço automático e escolha por pontos. Sem erros JS nos caminhos testados.


## Ajuste dos indicadores

A pedido do usuário, o fundo branco da paginação foi removido (agora transparente), assim como o botão de pausa. Permanecem a barra de progresso, pontos clicáveis, avanço automático e suspensão por interação, aba oculta e preferência de movimento reduzido.

## Reservas no celular

Corrigido o overflow do formulário público: colunas minmax com min-width zero, campos de data contidos, uma coluna até 600px, campos de texto com 16px no celular e botão dentro do painel. Cabeçalho pode quebrar linha em telas pequenas. Alterações CSS restritas a `.reservas-page`; painel e home não foram alterados. Somente o subtítulo da marca em reservas agora é `Itacaré-Bahia`.

Layout verificado em Chromium nas larguras 320,375,390,430,768,1024,1440px: sem overflow, sem sobreposição do cabeçalho e controles dentro do painel. Consulta com datas exercitada com mock somente de leitura. WebKit/Safari nativo não está instalado neste ambiente; regras específicas para dimensionamento de date no WebKit foram incluídas.


## Blocos públicos de quartos editáveis

A home renderiza os três blocos de `lotus_private.room_showcases` via RPC `lotus_showcase_api`, com fallback para os textos/fotos originais em `src/lib/showcase-defaults.ts` se o serviço falhar. A seção mantém foto principal e duas miniaturas, álbum “Ver fotos”, descrição original, comodidades e link para tarifas. CSS/JS específicos: `quartos.css` e `quartos.js`.

Em `/admin`, a aba **Conteúdo dos quartos** edita título, tópico opcional, descrição, fotos (3–12), ordem e ícones/textos das comodidades. Fotos JPG/PNG/WebP até 3 MB são enviadas ao bucket público `lotus-showcase`, somente para administradores autorizados. Fotos enviadas são públicas; não usar documentos ou dados de hóspedes. A revisão impede sobrescrita silenciosa entre editores. Cadastro físico, preços e reservas são independentes.

Fonte da alteração remota aplicada: `database/room-showcases.sql`. Contrato real de banco validado com rollback em `database/test-room-showcases.sql`: leitura pública, escrita restrita, revisão e validação de conteúdo. API HTTP validada com backend simulado pelo `npm run test:supabase-api`, incluindo envio de imagem e bloqueio de arquivo inválido. Layout/álbum/editor conferidos em Chromium em 320/390/1024/1440px; chamadas do painel simuladas para não alterar conteúdo real. Upload HTTPS direto ao Supabase não pôde ser exercitado neste ambiente, cujo proxy bloqueia esse domínio.

## Minha Conta (visitantes)

Desktop: Reservar à esquerda, logo central, Minha Conta à direita; no mobile a conta fica no menu. Login Google preparado com SDK oficial Supabase SSR + PKCE e cookies independentes `lotus_guest_auth`, sem conceder admin. Nome/foto verificados pelo Auth e renderizados pelo `conta.js`; sem histórico de reservas nesta etapa. Ativação Google **pendente**: usuário informou que ainda não configurou credenciais; seguir passo a passo e URLs exatas em README.md. O botão detecta o provedor, fica desabilitado e explica indisponibilidade enquanto não ativado. Testes com Auth simulado; não afirmar OAuth Google real testado. Galerias dos quartos agora avançam a cada 3 segundos.


## Galeria clara com detalhes dos quartos

A janela de “Ver fotos” agora segue a referência clara: no celular, imagem no topo, contador sobreposto, miniaturas, título, destaques e grupos de informações; no desktop, fotos e informações lado a lado. Cabeçalho de fechamento e rodapé de tarifas ficam acessíveis enquanto o conteúdo rola. As setas permanecem sem fundo circular; teclado, Escape, swipe e seleção por miniaturas continuam disponíveis. Galerias da home mantêm três imagens e autoplay de 3 segundos.

Por orientação do usuário, nomes públicos: **Quarto Duplo Standard**, **Quarto Duplo Superior** e **Quarto Família**. Os identificadores internos `duplo`, `triplo`, `familia` são preservados por compatibilidade; não representam os tipos físicos do estoque. Dados fornecidos nas imagens da Booking foram transcritos para os dois duplos: 17 m², 1 cama de casal, banheiro privativo com chuveiro, produtos de banho, toalhas/papel, varanda, vista para o jardim, ar-condicionado, roupa de cama, TV de tela plana e proibição de fumar. Não copiar preço, nota, número de avaliações ou comodidades da referência de outra hospedagem. Não inferir camas/novas comodidades para o Família. Fotos remotas preservadas.

Detalhes salvos na coluna `lotus_private.room_showcases.details`, validados pela RPC existente; fonte da migração remota aplicada em `database/room-detail-modal.sql`. O editor administrativo ganhou campos opcionais e listas por linha em “Informações em Ver fotos”. Editores antigos que omitem `details` preservam os dados. Os quatro destaques públicos continuam independentes das listas completas. Novas informações não alteram quartos físicos, tarifas ou reservas.

Verificação: build/typecheck e contratos HTTP; contrato Postgres real com rollback (`database/test-room-showcases.sql`) cobre validação, autorização e preservação dos detalhes/fotos. Chromium em 320/390/430/768/1024/1440px: álbum claro, informações por categoria, setas, miniaturas, Escape, CTA, rolagem sem overflow e editor com API simulada. WebKit nativo não instalado. Auditoria não apresentou novos alertas; permanece o aviso anterior de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Inclinação das galerias com scroll

Referência do usuário: vídeo `20261023-1019-43.2611128.mp4`. As três galerias começam levemente inclinadas à direita e se alinham progressivamente conforme entram na tela; o movimento acompanha também a rolagem inversa. `quartos.js` mede o artigo sem transformação e atualiza a galeria por requestAnimationFrame, sem dependência adicional. No celular a inclinação é menor. Movimento reduzido e foco nos controles mantêm a galeria alinhada. Carrossel de 3 segundos, miniaturas e janela de detalhes preservados. Conferência Chromium em 1440/1024/768/390/320px sem overflow.

Os textos dos quartos também acompanham a rolagem: blocos à direita entram pela direita e o bloco à esquerda entra pela esquerda, com opacidade gradual. No layout empilhado, o deslocamento é menor e usa a posição do próprio texto como referência. Foco de teclado e movimento reduzido mostram o conteúdo alinhado e visível; sem JavaScript o texto permanece normal. A seção recorta apenas o excesso horizontal da animação.

## Faixa de fotos abaixo de Sobre a pousada

Referência: vídeo `20261023-1135-11.7706897.mp4`. Nova seção `#galeria-pousada` entre Sobre e Quartos, com dez fotos existentes de jardim, quartos, café da manhã, piscina e lazer. Três imagens contíguas no desktop; no celular, uma com prévia da seguinte. Somente esta faixa ocupa toda a largura da tela, sem margens laterais; as demais seções mantêm o limite de 1120px. Assets próprios `galeria-pousada.css/js`, copiados no prepare-public. Avança uma foto a cada 3000ms com transição de 800ms e clones nas extremidades para loop contínuo. Continua com mouse sobre as fotos e após usar as setas; pausa somente em aba oculta, fora da tela e durante toque. Com movimento reduzido, troca a foto sem deslizamento; setas transparentes, teclado e swipe disponíveis. Fotos e ordem editadas nos figures do index (mínimo quatro para loop). Sem mudança de banco, quartos ou cabeçalho. Verificado Chromium em 1440/1024/768/390/320px, ciclo completo e relógio real para autoplay/pausa.

## Hero substituído por vídeo

A pedido do usuário, a abertura agora usa o vídeo enviado de praia/stand-up em looping, em vez do carrossel de seis imagens. MP4 otimizado H.264, 8 s, 960×538, sem áudio, em `media/abertura-praia.mp4`; poster `media/abertura-praia.jpg`. Ambos entram em public pela lista explícita do prepare-public. HTML autoplay/muted/loop/playsinline; JS pausa quando oculto/fora da tela/menu e usa poster com movimento reduzido ou falha de reprodução. Pontos e lógica do antigo carrossel de abertura removidos. Intro, navegação, conta, textos e outros carrosséis preservados. Teste de reprodução/loop real no Chromium e build/typecheck passaram; detalhes em README.
