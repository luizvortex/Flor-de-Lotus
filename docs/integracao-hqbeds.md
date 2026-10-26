# Integração com HQBeds — levantamento inicial

Sistema identificado pelo logotipo enviado pelo proprietário: **HQBeds**.

## O que foi verificado em 26/10/2026

A pesquisa web deste ambiente falhou. A tentativa de acessar `https://hqbeds.com.br` foi bloqueada pelo proxy (HTTP CONNECT 403); esse endereço é uma tentativa de localização, não uma fonte oficial validada. A pesquisa pelo Google exigiu uma etapa de acesso e não disponibilizou resultados utilizáveis. Não foi possível verificar documentação oficial, API, parceiros, valores ou funcionalidades do plano da pousada. Não há integração implementada ou ativa.

## Caminho recomendado

Manter bancos separados e sincronizar por interfaces oficialmente suportadas. Acesso direto ao banco do fornecedor exige autorização e suporte explícitos e não deve ser presumido. Antes de desenvolver o conector, escolher qual sistema será a fonte principal de disponibilidade, preços, reservas e pagamentos. Para a operação da pousada, é razoável propor HQBeds como fonte principal, sujeito às funções da API.

Solicitar ao fornecedor, pelo proprietário:

> Utilizamos um site próprio em Next.js, com reservas em Postgres/Supabase. Queremos integrar disponibilidade, tarifas por ocupação, criação/alteração/cancelamento de reservas e atribuição de quartos físicos. O HQBeds possui API oficial para integrações de terceiros? Nosso plano permite esse acesso? Podem fornecer documentação, ambiente de testes, autenticação, limites de uso, custos e contato técnico? Há webhooks de reservas, alterações, cancelamentos e pagamentos? O motor de reservas de vocês pode ser incorporado ou aberto por link, recebendo datas, adultos, crianças/idades e categoria? Há suporte a grupos e lista de hóspedes por unidade?

Não enviar senhas pessoais. Credenciais de integração devem ser específicas, limitadas e mantidas apenas no servidor.

## Se houver API compatível

1. Mapear os 18 quartos ativos, seus identificadores nos dois sistemas, categorias, andares, capacidades e tarifas por pagante. Não presumir que número do quarto é ID técnico. Preservar crianças de até 5 anos sem cobrança, mas contando na lotação.
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
