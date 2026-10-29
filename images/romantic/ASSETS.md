# Assets do configurador

## Imagem base ativa

`user-room-reference.jpg` foi fornecida pelo proprietário em um arquivo ZIP na conversa e incorporada em 29/10/2026. JPEG de 1920 × 764, 144.931 bytes. O conteúdo foi extraído sem redimensionamento, recompressão ou alteração visual.

SHA-256: `e45a825860063f8e4f006a3285e3c9b196a271377ab7a7351f19708cfdebd8a4`.

Origem de uso: imagem ilustrativa fornecida pelo usuário para este configurador. Não foi apresentada como fotografia oficial da pousada, como registro de um quarto reservado ou como imagem licenciada pelo Unsplash. A origem externa/licença original da imagem não foi informada; não atribuir licença CC0 a esse JPEG. Manter a legenda de imagem ilustrativa e a identificação de referência, conforme o pedido.

## Vetores e fallback

`room-layout-placeholder.svg`, `petals.svg` e `flowers.svg` são vetores originais preparados para este projeto. São ilustrações, não fotografias nem registros da pousada. Os SVGs originais deste diretório são disponibilizados sob CC0 1.0 para uso e adaptação: https://creativecommons.org/publicdomain/zero/1.0/ . Essa declaração não abrange o JPEG, fotografias pessoais de hóspedes, imagens de terceiros ou o restante do código da aplicação.

O esquema de quarto permanece somente como fallback para falha de carregamento da base. A imagem ativa é o JPEG fornecido pelo usuário.

## Histórico de pesquisa

Antes de o usuário escolher a imagem enviada, foi identificada a candidata **White bed linen on bed**, de **Point3D Commercial Imaging Ltd.**, https://unsplash.com/photos/white-bed-linen-on-bed-5BV56SdvLmo . O resultado oficial consultado em 29/10/2026 a identifica como gratuita sob a Unsplash License: https://unsplash.com/license . Ela NÃO foi baixada nem utilizada: o proxy bloqueou o download com HTTP 403, mesmo após autorização de rede. Não foi usado outro serviço para contornar o bloqueio. A imagem enviada posteriormente pelo usuário resolveu a dependência do arquivo.

## Substituição e calibração

Configuração central: `romantic-room-preview.config.js`. `activeProfile='userReference'` ativa a base local, proporção 1920/764, texto de referência e os placements conferidos sobre a cama/mesa lateral. O perfil mantém os assets e aliases de cada camada.

Para substituir a imagem, envie o novo arquivo à pasta de assets e altere `userReference.image`, `aspectRatio` e origem. Recalibre `x`, `y`, `width` (frações do enquadramento), `rotation`, `scaleY` e `zIndex` individualmente para cada camada. Não há necessidade de reescrever o componente ou o fluxo de reservas. Preserve a legenda de referência enquanto a base não for uma fotografia oficial identificada/autorizada.

Validação visual isolada: `python3 scripts/test-romantic-reference-layout.py`. A imagem pessoal da moldura nessa fixture é um pixel neutro sintético, não uma foto real de hóspede; todos os dados desse teste são locais.

## Bebidas, chocolates e balões

As camadas adicionais `champagne.svg`, `champagne-rose.svg`, `wine.svg`, `wine-white.svg`, `wine-rose.svg`, `chocolates.svg` e `balloons.svg` são vetores originais do projeto, sob a mesma licença CC0 aplicada aos outros SVGs. São representações ilustrativas e não fotografias ou reproduções de embalagens/marcas. A escolha de Rosé/Branco altera o asset da bebida; o preço continua vindo da variante real do catálogo. A autorização de uso/licença do JPEG base permanece separada e não foi alterada.
