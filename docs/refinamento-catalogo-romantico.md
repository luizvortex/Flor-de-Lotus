# Refinamento do catálogo e resumo romântico

A página existente mantém o hero, navegação de quatro etapas, disponibilidade nativa, catálogo `/api/romance/catalog`, autenticação Google, upload privado e envio autoritativo. Nenhuma API, tabela ou integração foi modificada.

Prioridade desta revisão: cartões de produto com foto cadastrada, indicação dourada de seleção, enquadramento sem cortes (`contain`), variantes compactas e quantidades; mosaico de produtos selecionados com remoção direta e subtotal separado da hospedagem. A revisão final reutiliza a mesma galeria sem controles de remoção. Prévia da mensagem independente das imagens, nunca sobreposta a quarto, e sem prometer cartão físico.

Catálogo pequeno: manter categorias reais em vez de acrescentar filtros. Fotos ausentes continuam com aviso textual; cadastre fotografias reais em Decoração e adicionais > Produtos e variantes. Sem novos produtos, preços ou imagens ilustrativas. Skeleton discreto durante carregamento; falha/vazio/retry preservados. Cores e estilos isolados em `.romance-page`; quatro idiomas locais preservados. Fotos privadas mantêm sequência de upload existente, sem mudança no contrato de persistência.

Pedido atual proíbe publicação automática. Não fazer push desta revisão sem autorização posterior.

Durante a validação, a mensagem de erro de upload podia ficar invisível quando o observador de rolagem mudava a etapa ativa; o upload agora informa seu erro diretamente na área de fotografias, preservando validação e armazenamento existentes.

## Verificação executada

- Sintaxe JS e `git diff --check`: aprovados.
- `npm run build`: compilação e TypeScript aprovados.
- `node scripts/test-romance-flow.mjs`: aprovado com Next compilado, PostgreSQL isolado e adaptadores locais de Auth/Storage. Testes incluem galeria, remoção direta, quantidades/variantes, totais, persistência entre etapas, mensagem, estados de catálogo vazio/erro/retry, calendário, upload e remoção privada, revisão/envio, idempotência e operação administrativa. Nenhuma escrita em produção.
- Verificação de largura sem overflow em 360, 375, 390, 430, 768, 1024 e 1600 px; galeria também em 1440 px. Capturas da galeria inspecionadas em 390 e 1440 px, usando fixture local identificada no teste. Sem cadastro/publicação de imagens de teste.
- Quatro idiomas e RTL passam no fluxo existente. Serviços externos Google/HQBeds/pagamento não homologados nesta revisão; contratos preservados.

Nenhum deploy realizado.

## Autorização posterior de publicação

O proprietário autorizou publicar esta revisão e reafirmou que as próximas alterações concluídas e verificadas devem ser enviadas diretamente para main, sem nova confirmação. Essa instrução substitui a restrição anterior de deploy. Build e teste completo já aprovados.
