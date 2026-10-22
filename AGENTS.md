# Flor de Lótus — instruções para continuar

## Decisão do usuário

A stack escolhida para a próxima fase é **Next.js com TypeScript**, usando React e App Router. O usuário pretende melhorar bastante o site e o painel em novos chats. Não retome a proposta de Django/Python como stack principal. A migração completa ainda não foi implementada: os arquivos HTML/JS/CSS e o servidor Python atuais são referência funcional a preservar durante a transição.

Leia `CONTINUAR-NEXTJS.md` antes de alterar a arquitetura. Use o checkout existente; tarefas Codex já são isoladas. Não crie um Git worktree sem solicitação explícita. Há alterações e arquivos novos ainda não commitados de trabalhos anteriores: inspecione `git status`, preserve-os, não execute reset/clean e não sobrescreva dados em `.local/`.

## Requisitos de negócio já definidos

- Site e administração em português brasileiro, valores em reais.
- Cadastrar cada quarto físico (nome/número único), tipo, capacidade, diária e disponibilidade para venda. A quantidade de quartos deriva dos cadastros.
- Tipos: solteiro, casal, casal + 1 e família.
- Administrador cadastra pacotes (Réveillon, Carnaval, Natal etc.) com período, quantidade de noites e preço total por quarto. Diferenciar dias e noites; 5 dias podem significar 4 noites. Não inventar valores reais.
- **Decisão explícita:** administrador confirma as reservas; reservas pendentes já bloqueiam as datas. Cancelamento libera as noites. Não adicionar confirmação automática/pagamento sem nova decisão do usuário.
- Calendário dinâmico por quarto. Entrada inclusiva, saída exclusiva: saída e nova entrada podem ocorrer no mesmo dia.
- Impedir sobreposição no servidor/banco inclusive com solicitações simultâneas. O total deve ser calculado no servidor e preservado na reserva após alterações de tarifas.
- Banco compartilhado e persistente, autenticação administrativa e dados de hóspedes protegidos. Não tratar localStorage como banco de reservas.
- Reservas pelo WhatsApp/telefone precisam ser registradas no sistema para afetar o calendário; envio de mensagens não é reserva automática.

## Ambiente

Node.js 24 e npm estão disponíveis. Cache npm gravável: `/workspace/shared/npm-cache`; use `npm --cache /workspace/shared/npm-cache ...` nesta máquina, pois o cache padrão em `/home/agent/.npm` não foi gravável.

Uma aplicação de verificação **separada do site** está em `/workspace/shared/flor-de-lotus-next-check`, com Next.js/React/TypeScript e lockfile. Consulte esse diretório e o documento de continuidade para os comandos e versões. Ela comprova a ferramenta; não é o site migrado. Caso não exista numa nova máquina, siga as instruções salvas do ambiente para recriá-la.

No projeto migrado, use versões explícitas e lockfile, `npm ci` para reprodução e scripts de desenvolvimento, build e typecheck. Não use instalação global como dependência do projeto. Não introduza um provedor de banco ou autenticação pago/external sem necessidade; escolha e documente persistência conforme a hospedagem real, sem inventar credenciais.

Nunca publique segredos em código, logs ou chat. `ADMIN_PASSWORD` é requisito somente do servidor Python legado enquanto ele for usado. Não use `NEXT_PUBLIC_` para segredos. Publicar o ambiente Codex não publica um site na internet.
