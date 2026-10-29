# Reformulação premium da experiência romântica

Estado em 29/10/2026: **implementada, validada localmente e autorizada para publicação pelo proprietário após a entrega**. O pedido inicial vedava deploy automático; a instrução posterior “pode publicar” autoriza a publicação desta versão. Nenhuma migração ou escrita em banco de produção foi executada nesta reformulação.

## Auditoria da arquitetura

A aplicação usa Next.js App Router e TypeScript. Esta página é uma rota GET server-rendered que reaproveita conteúdo editorial e o calendário compartilhado de `reservas.html`, com JavaScript e CSS próprios. Não foi convertida para outro framework nem criada uma página paralela.

| Arquivo / serviço | Responsabilidade preservada |
| --- | --- |
| `src/app/experiencias/decoracao-romantica/route.ts` | HTML semântico, CMS, fotografia principal, metadados, links, calendário e estrutura da jornada |
| `romance-experience.js` | Estado em memória, hóspedes/categoria/andar, disponibilidade, carrinho, cotação, uploads privados, autenticação e solicitação |
| `romance-experience.css` | Estilos exclusivos sob `.romance-page`, fontes e movimento reduzido |
| `/api/catalog` e `/api/availability` | Categorias reais, inventário e tarifas do sistema nativo |
| `/api/romance/*` | Catálogo, cotação, solicitação, arquivos privados e pedidos autorizados |
| `/api/guest/session` e `/auth/google` | Identidade Google e sessão existentes |
| `stay-picker.js` / `stay-picker.css` | Seleção nativa de intervalo, validações e idiomas do calendário |
| `site-language.js` / `site-translations.json` | Único mecanismo local de idiomas e RTL |

HQBeds não possui conector ativo neste projeto. Não foi criada disponibilidade paralela, integração fictícia, pagamento automático ou confirmação automática. A solicitação continua pendente e os preços são recalculados no servidor; idempotência, bloqueio de estoque e controle de acesso permanecem no backend existente.

## Melhorias implementadas

- Paleta azul profundo/médio, areia, creme, dourado discreto e oliva nos estados concluídos. Playfair Display/Poppins preservadas. Hero com fotografia real já cadastrada, overlay azul e CTA **Criar minha surpresa**. Na ausência de foto, a superfície editorial permanece sem imagem externa fictícia.
- Navegação horizontal com quatro etapas, ícones SVG leves, marcação ativa, indicação acessível de conclusão e barra de progresso. Etapa ativa acompanha a rolagem; clicar em uma etapa ou em Editar não recria o formulário nem limpa as escolhas.
- Mobile com indicação compacta, total e botão Continuar/Revisar. A etapa de fotos é dispensável quando os itens não exigem imagens. A barra respeita safe-area, espaço reservado e se oculta durante digitação para reduzir obstrução pelo teclado.
- Calendário e regras nativos preservados. Não foram inventados bloqueios por dia sem uma fonte oficial de disponibilidade. Cartões de quarto valorizam fotografia, descrição, capacidade, andar, comodidades cadastradas e preço do período. Seleção com borda dourada e confirmação textual.
- Opções de rádio e quantidade compartilhada continuam compactas, conforme o modelo anterior do proprietário. As fotos de produto só aparecem quando cadastradas.
- Campo **Uma mensagem especial para quem você ama**, até 600 caracteres, com resumo escapado. A mensagem e as instruções das fotos (até 1.300 caracteres) seguem identificadas no campo de instruções existente, dentro do limite total de 2.000 validado no servidor. A equipe recebe tudo no pedido original, sem outra tabela ou sistema de reservas.
- Catálogo com estados de carregamento, sucesso, vazio, erro e tentativa novamente. O cliente encerra chamadas do catálogo/cotação com limite de tempo, evitando carregamento indefinido.
- Upload por seleção/galeria e arrastar e soltar. Mesmos limites de quantidade, JPG/PNG/WebP e 3 MiB; mesmos endpoints, bucket privado, autorização e URLs assinadas. Remoção permanece explícita e fotos que ficaram sem um item associado continuam visíveis para remoção. A revisão mostra miniaturas privadas e pode renovar um link expirado mediante a mesma autorização.
- Revisão dividida em hospedagem, surpresa/mensagem, memórias e financeiro. Atalhos Editar, valores separados de hospedagem/adicionais e CTA **Enviar minha solicitação especial**. Nenhuma indicação de cobrança ou confirmação automática.
- Configuração de quarto, itens e mensagem pode ser feita antes do login. Google continua obrigatório para enviar fotos e finalizar. A janela de login e o retorno ao estado atual foram preservados; dados pessoais não foram levados para localStorage.
- Novos textos integrados ao mesmo dicionário português/inglês/espanhol/hebraico; traduções anteriores preservadas. CSS do seletor de idiomas limitado à página para retirá-lo da área da barra móvel.

## Problemas encontrados e tratados

O catálogo não oferecia uma recuperação clara de falha/vazio. O resumo era predominantemente financeiro, sem uma revisão completa da mensagem/fotografias. O seletor global de idioma ficava fixo sobre o espaço usado pela nova barra inferior: nesta página, ele foi integrado ao cabeçalho. A área de fotos agora explica visualmente quando é opcional. Conteúdo livre é exibido como texto, sem interpretar HTML; o teste inclui entradas com tags para conferir a preservação segura.

## Arquivos alterados / componentes

- `src/app/experiencias/decoracao-romantica/route.ts`: hero, navegação de etapas, mensagem, dropzone, revisão e barra móvel.
- `romance-experience.js`: progresso, navegação, revisão, mensagem no envio existente, carregamento/retry e dropzone.
- `romance-experience.css`: identidade e componentes responsivos exclusivos da rota.
- `site-translations.json`: novas traduções, preservando as entradas existentes.
- `scripts/test-romance-flow-browser.py`: cobertura dos novos estados e interações.
- Documentação e instruções de continuidade.

Não foram alterados endpoints, rotas, dependências, tabelas, políticas de acesso ou componentes de outras páginas. Não há nova biblioteca de animação, calendário, upload ou idiomas.

## Verificações efetivamente realizadas

- `node --check romance-experience.js`: aprovado.
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: aprovado, incluindo TypeScript e a rota existente.
- `node scripts/test-romance-flow.mjs`: aprovado. O navegador usa Next compilado e funções nativas reais de PostgreSQL em clone isolado; Auth e transporte binário de Storage são adaptadores locais, não credenciais/serviços de produção.
- Cobertura: calendário, capacidade incluindo criança isenta, disponibilidade/tarifa, categorias, opções/quantidades, cálculos, catálogo com erro/vazio/recuperação, navegação e dados preservados, configuração antes do login, autenticação obrigatória para operações privadas, upload por drop e galeria, formato inválido, remoção, experiência sem fotos, mensagem segura, revisão, solicitação, repetição idempotente, propriedade dos arquivos, atribuição/confirmação nativas, preparação administrativa e preços históricos.
- Larguras 360, 375, 390, 430, 768, 1024 e 1600 px: sem rolagem horizontal; capturas de hero e revisão geradas localmente. Capturas mobile do hero, opções e revisão foram inspecionadas. Movimento reduzido e navegação por teclado são utilizados no teste; quatro idiomas/RTL conferidos no fluxo.
- `python3 scripts/test-site-language-browser.py`: aprovado, incluindo restauração do português, controles dinâmicos, campos preservados, teclado, RTL e preferência entre páginas.
- `git diff --check`: aprovado.

As imagens sintéticas das capturas são fixtures locais de layout e **não** fotografias publicadas ou cadastradas da pousada. A rede deste ambiente continua bloqueando o domínio real das fotografias; o enquadramento das imagens reais não foi revalidado visualmente em produção. A autenticação Google do provedor, pagamento e HQBeds não foram homologados com serviços externos nesta revisão. A publicação desta revisão utiliza o fluxo Git/Vercel existente, após autorização explícita do proprietário.

## Pendências / publicação

Não há alteração de banco a autorizar para este redesign. A autorização posterior “pode publicar” foi recebida em 29/10/2026 e permite enviar esta versão validada para main. Conferir a conclusão do check oficial da Vercel associado ao commit antes de anunciar a publicação.

Não foi acrescentada ordenação manual de fotos: o contrato atual utiliza a sequência de upload. Validar e persistir uma ordem diferente seria uma extensão do serviço, desnecessária para este refinamento visual. As limitações externas de HQBeds, gateway e acesso às imagens reais permanecem as documentadas anteriormente.
