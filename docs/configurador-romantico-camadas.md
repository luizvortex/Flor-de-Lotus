# Configurador visual por camadas — 29/10/2026

## Estado da entrega

Implementação integrada ao repositório, **sem deploy e sem alterações no banco**. Controles, carrinho, camadas, filtros, comparador, miniaturas, modal, mensagem, upload privado e resumo são funcionais. A incorporação da imagem escolhida pelo usuário está pendente do **arquivo original**. Não declarar que a fotografia foi instalada ou que o enquadramento real foi validado.

O TXT enviado pede uma foto de banco e menciona um mockup que não veio como arquivo. Depois, o proprietário escolheu uma imagem de quarto com cama clara e vista para o mar, exibida na conversa (1920 × 764). Essa referência passa a ser a base pretendida. O ambiente disponibilizou apenas o TXT em `/workspace/attachments`; não disponibilizou o arquivo dessa imagem. Não há bytes originais a copiar/converter. Não foi feita uma reprodução por IA nem substituição por uma imagem de outra pousada.

A autorização de rede foi concedida pelo usuário e o perfil de rede da sessão foi autorizado, mas o proxy continuou respondendo HTTP 403 ao download oficial Unsplash. A lista efetiva de domínios do ambiente não foi alterada para incluir Unsplash. Não foram usados proxies alternativos, remoção de proxy ou outro serviço para contornar o bloqueio.

## Arquitetura preservada

Next.js App Router/TypeScript, HTML server-rendered da mesma rota e módulos JS/CSS leves, conforme o projeto existente. Continua havendo um único estado de carrinho e um único fluxo de reserva.

- Categorias, hóspedes, datas, andar, tarifas e disponibilidade vêm dos mesmos endpoints nativos.
- `/api/romance/*`, Google obrigatório nas operações privadas, validação de preços/estoque, idempotência, pedidos pendentes e controle de acesso permanecem intactos.
- Fotos pessoais usam o upload e o armazenamento privados existentes; suas URLs assinadas são reutilizadas apenas para a visualização na própria página. Não há envio de imagens a IA ou a novo serviço.
- HQBeds não possui sincronização ativa neste projeto; não foi criado nem anunciado um conector.
- Não foram adicionados produtos, preços, categorias de quartos, tabelas, migrações ou dependências.

## Componentes e arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `romantic-room-preview.js` | Componente reutilizável `RomanticRoomPreview`; cenas, camadas, comparador, galeria, modal, estado visual independente do carrinho |
| `romantic-room-preview.config.js` | Base, fallback, origem, metadados, aliases de produtos e coordenadas; perfil preliminar para a imagem fornecida pelo usuário |
| `romantic-room-preview.css` | Layout 35/65, filtros, comparação e resumo, exclusivo sob `.romance-page` |
| `images/romantic/*.svg` | Esquema de quarto, pétalas e arranjo vetoriais originais |
| `images/romantic/ASSETS.md` | Origem, licença e situação real dos arquivos |
| `src/app/experiencias/decoracao-romantica/route.ts` | Mesmo endereço; integração à etapa Sua surpresa e carregamento dos assets |
| `romance-experience.js` | Ponte com carrinho, filtros e resumo financeiro existentes |
| `scripts/prepare-public.mjs` | Publicação dos módulos como assets locais; pasta images já usa o fluxo existente |
| `site-translations.json` | Novas traduções no mecanismo local, preservando as existentes |
| `scripts/test-romance-flow-browser.py` | Cobertura integrada do configurador e das reservas |

## Funcionamento visual

Desktop: catálogo à esquerda (35%) e imagem/comparador à direita (65%). Mobile/tablet: apresentação, prévia/galeria, filtros, catálogo e resumo. Não foi mantido um painel lateral financeiro que comprimisse a nova composição; a revisão e a finalização originais continuam ao final da página, com a barra móvel existente.

Os filtros Todos os itens, Decoração, Romance, Memórias e Mensagens atuam sobre o catálogo carregado, sem limpar o carrinho. Bebidas e delícias ficam em Romance, itens de decoração em Decoração e itens com fotos em Memórias. Um produto reconhecido como Cartão aparece em Mensagens, mesmo que sua categoria administrativa seja uma das categorias já suportadas.

A prévia associa nomes/aliases configurados a pétalas, flores e cartão; produtos que exigem fotos também são reconhecidos como memórias. Fotografias pessoais só entram em molduras quando já foram enviadas pelo fluxo privado. A composição acompanha os produtos comerciais selecionados, enquanto cada miniatura pode mostrar um elemento isolado como demonstração. O estado da miniatura/comparador não muda o pedido nem inclui produtos.

As seis miniaturas são visões reais da base com camadas em escala reduzida: composição, original, pétalas, flores, fotografias e cartão. O comparador começa em 50%, usa o mesmo enquadramento nos dois lados e aceita range nativo por teclado/mouse/toque e arraste do marcador. O modal nativo preserva estado, permite fechar por botão/Escape e restaura foco. Não há controle 360° sem conteúdo.

As transições têm 300 ms e respeitam movimento reduzido. A mensagem aparece no cartão e em uma prévia maior, sem interpretar HTML. O texto completo continua sendo enviado nas instruções existentes, respeitando os limites já implementados.

## Catálogo e contratação

Somente variantes reais do catálogo entram no carrinho e no cálculo. Pétalas e porta-retrato já cadastrados têm visualização integrada. Flores e cartão físico ainda precisam ser cadastrados pelo proprietário, com nome/variante, preço real, disponibilidade e demais dados no painel **Decoração e adicionais**. O configurador não os cadastrou nem inventou preços.

Quando falta um item, sua apresentação é explicitamente **Apenas demonstração visual / ainda não disponível para contratação**. O botão Visualizar exemplo muda somente a imagem; não há ID de produto, checkbox comercial, variante ou linha de cobrança fictícia. A mensagem livre continua disponível para instruções à equipe e não promete um cartão físico incluído.

O resumo azul mostra itens/valores reais de decoração e identifica separadamente a hospedagem. Continuar minha surpresa usa a mesma navegação: solicita primeiro uma hospedagem válida, depois segue para fotos quando necessárias ou para revisão. A finalização mantém a revalidação real no servidor e a reserva pendente.

## Fotografia, assets e substituição

**Fotografia incorporada nesta revisão: nenhuma.** O estado atual utiliza ilustração esquemática local, com legenda explícita. Isso mantém os controles testáveis sem representar um desenho como foto real.

Os SVGs foram preparados originalmente para o projeto e estão documentados como CC0 1.0 exclusivamente para esses arquivos. Não são camadas extraídas de outro quarto e não são fotografias reais. As fotos pessoais dos hóspedes não fazem parte dessa licença e nunca foram gravadas nos assets.

Antes da escolha enviada pelo usuário, foi identificada a candidata Unsplash [White bed linen on bed — Point3D Commercial Imaging Ltd.](https://unsplash.com/photos/white-bed-linen-on-bed-5BV56SdvLmo), cujo resultado oficial a identifica sob a [Unsplash License](https://unsplash.com/license). Ela não foi baixada nem utilizada; sua referência fica apenas no histórico de origem. A imagem escolhida depois pelo usuário não recebeu uma licença externa inventada. Seu uso foi solicitado na conversa, sempre como referência ilustrativa e não fotografia oficial da pousada.

Para incorporar a imagem escolhida:

1. Receber o arquivo original como JPG/PNG/WebP ou ZIP; conferir visualmente e otimizar sem mudar a composição.
2. Salvar como `images/romantic/user-room-reference.webp`.
3. Em `romantic-room-preview.config.js`, trocar `activeProfile` de `schematic` para `userReference`. O componente aplica base/aspect-ratio 1920/764 e mescla coordenadas por camada, mantendo assets e aliases.
4. Conferir/ajustar individualmente x/y/width/rotation/scaleY/zIndex para a cama e a mesa lateral. As coordenadas atuais do perfil são preliminares, baseadas na imagem visível na conversa, e não uma calibração visual final.
5. Executar preparação de assets, build, testes e inspeção visual com o original em desktop/mobile/modal. Manter a legenda de imagem ilustrativa e registrar a origem correta.

Uma fotografia oficial futura também deve ter seu próprio perfil e coordenadas; trocar a base não exige reescrever o componente ou o fluxo de reserva. Não substituir a fotografia do hero ou das categorias automaticamente.

## Verificações realizadas

- `node --check` dos três módulos JS: aprovado.
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: aprovado, incluindo TypeScript e a rota existente.
- `node scripts/test-romance-flow.mjs`: aprovado com Next compilado e PostgreSQL nativo isolado; Auth e transporte binário de Storage são adaptadores locais. Não foram utilizadas contas ou reservas reais.
- Cobertura adicionada: pétalas ligadas ao item comercial; flores/cartão em demonstração sem cobrança; fotos privadas na moldura; mensagem escapada; remover camadas; filtros sem perder a quantidade; totais; comparador por teclado e touch real; valor inicial 50%; modal/Escape/foco; galeria/original; layout com prévia antes do catálogo no mobile; 360/375/390/430/768/1024/1440 px sem rolagem horizontal.
- A mesma jornada verifica datas, hóspedes/crianças, seleção de quarto, upload/remoção/validação, revisão, pedido pendente, repetição idempotente, isolamento entre hóspedes/admin e preparação administrativa.
- Capturas do componente em desktop e mobile foram inspecionadas. São da base esquemática, não da fotografia real ainda indisponível.
- `git diff --check`: aprovado. O projeto não possui um script lint; não foi anunciado lint inexistente. A verificação de sintaxe e o TypeScript/build foram executados.

## Pendências

- Arquivo original da imagem enviada na conversa e calibração final sobre ele.
- Cadastro comercial de flores e cartão físico, se a pousada quiser vendê-los.
- Mockup de layout mencionado no TXT não foi anexado como arquivo; foi seguida a descrição escrita 35/65.
- Não houve validação visual da fotografia real, login Google externo ou HQBeds em produção.
- Deploy não autorizado por este pedido: manter esta implementação local até nova instrução explícita, preservando a restrição mais recente de não publicar automaticamente.

Verificação final adicional: a falha simulada no carregamento do módulo visual deixa o catálogo, os filtros comerciais e o fluxo de reserva disponíveis; controles de demonstração são omitidos nessa situação. O teste completo foi reexecutado com esse cenário e aprovado. A mensagem também possui uma prévia maior fora da imagem e não é traduzida/interpretrada como HTML quando preenchida pelo hóspede.
