# Auditoria do editor e das páginas públicas

Revisão de 3 de novembro de 2026. A conferência usa os renderizadores reais e documentos sintéticos: não altera textos, fotografias, reservas ou publicações existentes do proprietário.

## Correções

- O campo **Texto do freezer** passa a alimentar a home e `/pescadores`, substituindo o texto fixo que ignorava o painel.
- Em Pescadores, saem do formulário os campos sem consumo público: subtítulo, descrição, observação, texto do link antigo de grupos e mensagem antiga do WhatsApp. Título, texto do freezer, botão da home, exibição e fotos permanecem editáveis.
- Em Decoração romântica, saem o subtítulo e a mensagem antiga do WhatsApp, que não eram usados. O campo do botão recebe o nome correto: abre a experiência romântica, não o WhatsApp.
- Em Conteúdo dos quartos, saem as listas antigas de banheiro e vista. As comodidades continuam editáveis na lista atual com ícones; valores históricos são preservados na estrutura existente ao salvar.
- Na ordenação da home, Pescadores deixa de ter setas independentes sem efeito: acompanha Quartos, junto de Excursões. Os blocos extras configurados após Pescadores passam a acompanhar esse conjunto.
- A orientação do editor de Contato foi corrigida: o formulário atual usa nome e datas, não telefone.
- Testes antigos que ainda procuravam links removidos ou a quantidade antiga de seções foram atualizados.

Os campos aposentados deixam de aparecer no formulário, mas são preservados na estrutura interna para compatibilidade e histórico. Não há limpeza de dados reais.

## Conferência por seção

| Editor | Conteúdo conectado ao público |
| --- | --- |
| Identidade e contatos | Marca, logo, descrição para mecanismos de busca, endereço, redes, mapas e WhatsApp |
| Cabeçalho e vídeo | Título, textos, localização, convite, vídeos, capa, alternativa animada e parâmetros de reprodução |
| Sobre a pousada | Textos, fotos, legenda, botões, localização e lista de comodidades |
| Carrossel da pousada | Título, fotos, descrições, ordem e intervalos |
| Apresentação dos quartos | Título e descrição da seção, texto dos botões; fotos e detalhes individuais ficam em Conteúdo dos quartos |
| Conteúdo dos quartos | Fotos, descrições, camas, política de fumantes, destaques e comodidades com ícones |
| Pescadores e grupos de pesca | Título, freezer, botão e álbum; foto 1 na home, álbum completo na página dos pescadores |
| Decoração romântica | Título e descrição da página de quartos, fotos, observação e convite para a experiência |
| Área de lazer | Título, introdução, orientação, fotos, opções e detalhes abertos pelo visitante |
| Instagram | Textos, botão e três imagens fixas do container |
| Praias e passeios | Prévia da home, capa e textos do guia, destinos, fotos e passeios |
| Avaliações | Apresentação, notas das plataformas, fontes, datas e depoimentos publicados |
| Contato | Títulos, textos, formulário, mensagem padrão e rótulos de endereço/redes |
| Página de quartos e reservas | Capa e títulos do catálogo, pacotes, localização e políticas |
| Ordem e blocos extras | Ordem efetiva das seções e conteúdo/posição dos blocos adicionais |
| Políticas da pousada | Cadastro próprio, usado nas políticas públicas |
| Configuração e pendências | Contato/privacidade públicos e quatro controles operacionais administrativos |

Campos opcionais ou condicionais continuam disponíveis quando têm função: depoimentos não publicados, seções desativadas, imagens alternativas, detalhes de lazer, preços/pacotes e passeios sem foto. Não se confundem com campos abandonados. Identificadores e versão de estrutura já não são exibidos no formulário editorial.

## Limites de edição atuais

Alguns textos funcionais continuam definidos em código: navegação, mensagens de validação, chamadas e títulos fixos da página dos pescadores, legendas decorativas e capacidades informativas. Não foi criado um novo editor para esses elementos nesta revisão.

O título específico **Quarto Triplo Superior** na home continua sendo a exceção solicitada pelo proprietário para o destaque alimentado pelo cadastro `triplo-standard`. O título desse cadastro permanece editável no catálogo de quartos; a substituição da home é explícita em `legacy-page.ts`.

## Verificação

`node --experimental-vm-modules scripts/audit-site-editor.mjs` altera individualmente 161 campos representativos, incluindo itens de listas, e confere consumo em oito renderizações públicas e na página de pescadores. São 157 campos públicos e quatro controles administrativos intencionais, sem campo editorial visível sem consumidor. Inclui o posicionamento dos blocos após Pescadores. É uma conferência de conexão de dados, não uma prova de ausência de todo defeito visual ou de todas as integrações externas.

Os testes de navegador e do editor usam servidor Next.js real com Auth/PostgREST/Storage simulados, além dos fluxos de publicação, fotos, prévias e exibição responsiva. Nenhuma reserva real é criada e nenhum conteúdo do proprietário é sobrescrito por testes.
