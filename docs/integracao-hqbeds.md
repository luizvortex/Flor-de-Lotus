# Integração com HQBeds / HQBooking — levantamento técnico

Sistema identificado pelo logotipo enviado pelo proprietário: **HQBeds**.

## Fontes oficiais verificadas em 28/10/2026

O acesso falhou no levantamento inicial de 26/10; a pesquisa posterior permitiu consultar as páginas oficiais abaixo. Elas comprovam recursos do produto, sem comprovar acesso de integração do plano da pousada.

- [Integrar o motor HQBooking ao site](https://ajuda.hqbeds.com.br/pt-br/como-integrar-o-motor-de-reservas-hqbookings-com-o-seu-site): link de venda em Propriedade → Setup → hqbookings → Principal e gerador em Setup → Widget. O endereço específico da pousada deve ser fornecido pelo proprietário.
- [Anúncios de produtos e serviços no HQBooking](https://ajuda.hqbeds.com.br/pt-br/como-criar-an%C3%BAncios-de-servi%C3%A7os-ou-produtos-para-vendas-no-hqbookings): cadastro de anúncios vinculados a produtos do estoque, com preço, limite de compra, escopo, tradução, fotografia e ativação. Adicionais são discriminados na revisão/email e vinculados à operação do HQBeds. O artigo informa restrição de atributos/variantes à Loja Virtual; não presumir suporte equivalente por API no motor.
- [Taxas extras e formas de pagamento](https://ajuda.hqbeds.com.br/pt-br/como-configurar-taxas-extras-e-formas-de-pagamento-no-motor-hqbookings): HQpagamentos permite PIX/cartão quando contratado; depósito manual mantém a reserva sujeita à confirmação. Não há credenciais ou gateway contratado/configurado neste projeto.
- [Apresentação do motor](https://www.hqbeds.com/booking-engine) e [integrações](https://www.hqbeds.com.br/integracoes): confirmam ofertas de integração, pagamentos e adicionais, mas não estabelecem endpoints, autenticação ou um contrato de API para checkout próprio.

Nenhuma API pública oficial compatível com o fluxo personalizado foi validada. Não confundir **HQBeds** com **Hotelbeds**, outro fornecedor. Nenhuma sincronização ou cobrança externa está ativa no site.

## Caminho recomendado

Manter bancos separados e sincronizar por interfaces oficialmente suportadas. Acesso direto ao banco do fornecedor exige autorização e suporte explícitos e não deve ser presumido. Antes de desenvolver o conector, escolher qual sistema será a fonte principal de disponibilidade, preços, reservas e pagamentos. Para a operação da pousada, é razoável propor HQBeds como fonte principal, sujeito às funções da API.

Solicitar ao fornecedor, pelo proprietário:

> Utilizamos um site próprio em Next.js, com reservas em Postgres/Supabase. Queremos integrar disponibilidade, tarifas por ocupação, criação/alteração/cancelamento de reservas e atribuição de quartos físicos. O HQBeds possui API oficial para integrações de terceiros? Nosso plano permite esse acesso? Podem fornecer documentação, ambiente de testes, autenticação, limites de uso, custos e contato técnico? Há webhooks de reservas, alterações, cancelamentos e pagamentos? O motor de reservas de vocês pode ser incorporado ou aberto por link, recebendo datas, adultos, crianças/idades e categoria? Há suporte a grupos e lista de hóspedes por unidade?

Não enviar senhas pessoais. Credenciais de integração devem ser específicas, limitadas e mantidas apenas no servidor.

## Se houver API compatível

1. Mapear os 19 quartos ativos, seus identificadores nos dois sistemas, categorias, andares, capacidades e tarifas por pagante. Não presumir que número do quarto é ID técnico. Preservar crianças de até 5 anos sem cobrança, mas contando na lotação.
2. Validar regras de pré-reserva, bloqueio de estoque e confirmação manual. A reserva pendente do site já bloqueia noites; confirmar como representar isso no HQBeds antes de vender em ambos.
3. Consultar disponibilidade e preço autoritativos, criar a reserva uma única vez com identificador externo/idempotência e persistir o ID do fornecedor. Tratar falhas parciais: nunca mostrar sucesso sem saber se a reserva foi criada.
4. Receber eventos autenticados, tratar duplicações, cancelamentos e mudanças de quarto. Usar fila de reprocessamento e reconciliação periódica; registrar divergências no painel sem expor dados de hóspedes em logs.
5. Testar em homologação: reservas simultâneas, estadias adjacentes (saída exclusiva), alteração de datas/valores, crianças, grupos nos dois andares, cancelamento, interrupção de conexão e repetição de eventos.
6. Migrar o estoque inicial e ativar em uma janela combinada. Até a sincronização ser confiável, manter uma única fonte operacional para evitar venda duplicada.

## Alternativas se não houver API

- Motor oficial por link ou incorporação, se oferecido: o site continua apresentando a pousada e o fluxo de reserva usa o estoque do HQBeds. Exige validar como manter grupos e conta do hóspede.
- Conector ou channel manager oficialmente compatível, com custos e escopo confirmados pelo fornecedor.
- Importação/exportação suportada: adequada para migração e relatórios, mas não garante disponibilidade em tempo real.
- iCal somente se disponível e documentado: normalmente transmite bloqueios de datas, sem equivalência de tarifas, pagamentos e lista de hóspedes. Avaliar latência e risco de sobreposição antes de usar.

## Impacto nos relatórios

O site distingue valor de reservas confirmadas de recebimentos efetivamente registrados. Caso o HQBeds já tenha financeiro, definir a origem dos lançamentos antes de importar; cada pagamento externo deve ter ID único para impedir contagem em dobro. A lista de participantes de excursões é privada e só deve ser sincronizada se a API e as permissões autorizarem.

## Experiência romântica do site

A implementação preparada em outubro utiliza o motor nativo da pousada e pedidos complementares ligados ao ID real da reserva nativa, com valores históricos e estados operacional/financeiro separados. Uma referência HQBeds pode ser registrada para conferência manual, mas não representa sincronização. Ainda é necessário obter do fornecedor documentação e autorização para disponibilidade, tarifas, criação/cancelamento, cobranças, identificadores externos, idempotência e webhooks. Veja [implementação e pendências](experiencia-romantica.md).

Alternativa comprovada pelo fornecedor: usar o link/widget oficial e os anúncios de adicionais no próprio HQBooking, após validar o plano e a configuração da pousada. Isso exigiria adaptar a jornada, o retorno da reserva, os uploads privados e a lista de grupos; não basta juntar bancos. Para um checkout próprio, dependemos de API oficial homologada. Adicionais que não possam ser lançados no HQBeds precisam permanecer em pedidos vinculados ao identificador externo real, com reconciliação, sem dupla contagem financeira.
