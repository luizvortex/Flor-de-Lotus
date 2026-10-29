# Configurador por camadas retirado

A pedido do proprietário, a simulação introduzida em `038d817` e calibrada em `25a7b87`/`f3733d4` foi removida seletivamente. A referência de restauração é `558d8e6`, que já preservava o redesign premium, quatro etapas, mensagens, upload opcional e revisão.

Removidos scripts, estilos, configurações, demos, comparador, fotografia demonstrativa e SVGs exclusivos da composição, após busca de dependências. Nenhuma dependência npm havia sido adicionada exclusivamente à simulação.

Substituição: galeria “Sua surpresa está ganhando vida”, alimentada pelo mesmo catálogo, carrinho e cotação. Exibe apenas itens selecionados, variante, quantidade, preço e foto cadastrada. Sem fotografia, apresenta aviso textual. O proprietário pode cadastrar fotos reais no editor existente de Produtos e variantes.

Preservados banco, autenticação, API, reservas, tarifas, uploads privados, resumo financeiro e finalização. Nenhuma migração ou publicação deve ser realizada nesta revisão.

## Validação desta restauração

- `node --check romance-experience.js`: aprovado.
- `npm run build`: aprovado, incluindo TypeScript.
- `node scripts/test-romance-flow.mjs`: aprovado com PostgreSQL isolado, adaptadores locais de Auth/Storage e servidor Next compilado. Cobertura: quatro idiomas/RTL, calendário, capacidade, variantes, quantidades, galeria selecionada, valores, navegação/persistência, upload privado/remoção, revisão, envio, repetição idempotente e operação administrativa. Nenhuma escrita em produção.
- Responsividade: 360, 375, 390, 430, 768, 1024 e 1600 px; controles e galeria também em 1440 px, sem rolagem horizontal.
- `git diff --check`: aprovado.

Fotografias reais externas e login do provedor Google não foram homologados em produção. As fotos usadas pelo teste são fixtures locais; não foram publicadas nem cadastradas no ambiente real. Esta revisão não foi publicada.

## Autorização posterior

Após a validação, o proprietário solicitou “publique”, autorizando o envio desta revisão pelo fluxo Git/Vercel. Nenhuma migração é necessária.
