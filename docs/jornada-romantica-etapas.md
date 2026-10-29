# Experiência romântica por etapas

Implementação incremental sobre a página existente, sem novas rotas ou contratos de API. Estado, catálogo real, disponibilidade, tarifa, Google, fotos privadas e idempotência preservados.

- Apenas a etapa ativa fica visível; as demais mantêm seus campos e valores no DOM.
- Seleção do quarto permanece na primeira tela até o visitante avançar explicitamente.
- Voltar/próxima etapa funcionam em desktop e celular; timeline permite revisar uma etapa diretamente.
- Fotografias continuam opcionais somente quando nenhum adicional exige fotos; não pular silenciosamente essa tela.
- Após a revisão, abrir o resumo financeiro em diálogo centralizado com fechamento e foco por teclado. O envio real continua exclusivo do botão “Enviar minha solicitação especial”.
- Manter o direcionamento para requisitos incompletos e o comprovante de sucesso separado, sem dois modais abertos.
- A navegação não recarrega a página nem grava informações pessoais em armazenamento local.

Os testes integrados exercitam apenas uma etapa visível, avanço explícito, retorno e preservação de dados, fotos obrigatórias/opcionais, valores, revisão antes do envio e os fluxos privados existentes.

## Validações executadas

- Build Next.js e TypeScript aprovados.
- Sintaxe de JavaScript e `git diff --check` aprovados.
- `node scripts/test-romance-flow.mjs` aprovado com Next compilado, PostgreSQL isolado e adaptadores locais de Auth/Storage; sem gravações em produção.
- Testadas as quatro telas, avanço manual após escolher o quarto, retorno preservando escolhas/mensagem/fotos, etapas opcionais/obrigatórias, indicação de campos incompletos, modal de revisão antes de qualquer criação de reserva, fechamento e reabertura, envio real e idempotência, fotos privadas, checklist de Minha conta e operação administrativa.
- Sem rolagem horizontal em 360, 375, 390, 430, 768, 1024 e 1600 px, além do modal em 1440 px. Capturas do modal mobile e da etapa Surpresa desktop inspecionadas com fixtures locais.
- Quatro idiomas/RTL preservados. Login externo Google, HQBeds e pagamentos não foram homologados nesta revisão; não houve alteração dessas integrações.
