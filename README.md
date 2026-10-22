# Pousada Flor de Lótus

Site da pousada, reservas e painel administrativo em português. Requer **Python 3.10+**, sem pacotes externos. O servidor Python substitui o servidor estático: as páginas agora precisam da API para reservas compartilhadas.

## Next.js — primeira etapa da migração

A entrada do site agora pode ser executada em **Next.js 16.4.2, TypeScript 7.0.2 e App Router**, com Node.js 24. As rotas `/`, `/reservas`, `/admin` e `/avaliacoes` preservam temporariamente o HTML e JavaScript existentes; os endereços `.html` continuam funcionando. Ainda não são componentes React. Esta é uma ponte de compatibilidade, não a migração completa.

```bash
npm --cache /workspace/shared/npm-cache ci --no-audit --no-fund
# Terminal 1, com ADMIN_PASSWORD configurada conforme abaixo:
npm run dev:api
# Terminal 2:
npm run dev
```

O Next.js usa a porta 3000; a API Python usa 8000, ligada apenas a `127.0.0.1` pelo script acima. A API é encaminhada pelo Next.js na mesma origem, incluindo cookies de sessão e proteção contra requisições de outra origem. `LEGACY_API_ORIGIN` é uma variável exclusiva do servidor, opcional (padrão `http://127.0.0.1:8000`). Não exponha a porta da API.

`predev` e `prebuild` preparam `public/` com uma seleção de fotos, CSS e JavaScript. Esse diretório é gerado e ignorado pelo Git; edite os arquivos originais. HTML, banco, fontes de servidor e segredos não são copiados. O Next.js lê somente os quatro templates HTML permitidos.

```bash
npm run build
npm run typecheck
npm test
npm run test:next
# Após o build, mantendo a API em execução:
npm run start
```

`test:next` executa o contrato de reservas através do servidor Next.js de produção na porta 3107, com API interna, senha gerada e banco temporário. Não altera `.local/`. A execução atual requer os templates e o servidor Python no checkout; não é um pacote standalone nem uma aplicação pronta para hospedagem serverless. As restrições de persistência e instância única abaixo continuam válidas.

Próximas etapas: converter cada tela para componentes React/TypeScript; substituir a API Python com testes equivalentes; definir hospedagem e persistência de produção antes de trocar o banco. Nenhum serviço pago, pagamento ou confirmação automática foi introduzido.

## Executar o legado diretamente

Configure `ADMIN_PASSWORD` com uma senha forte no ambiente do processo. Não coloque a senha no Git, no JavaScript, em URLs ou nas instruções de inicialização. Em um terminal local, sem mostrar a senha:

```bash
cd /workspace/Flor-de-Lotus
read -rsp 'Senha do administrador: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
python3 server.py
```

Acesse `/` para o site, `/reservas.html` para reservas e `/admin.html` para gestão. Sem `ADMIN_PASSWORD`, o servidor funciona, mas o login administrativo fica desabilitado. Não existe uma senha padrão. Alterar a senha requer reiniciar o processo e encerra as sessões. A sessão dura oito horas. O login tem limitação de tentativas.

Variáveis opcionais: `PORT` (8000), `HOST` (0.0.0.0), `LOTUS_DB` (caminho do banco; padrão `.local/lotus.db`), `COOKIE_SECURE=1` (obrigatório ao publicar com HTTPS). Use apenas **um processo servidor**: sessões e limites de login são mantidos em memória. A senha precisa ser uma variável real do processo, não um placeholder de credencial de proxy HTTPS.

## Configuração inicial e uso

1. Entre no painel e cadastre **cada quarto físico**: nome/número único, tipo (solteiro, casal, casal + 1, família), capacidade e diária. A quantidade total de quartos é calculada pelos cadastros; não há estoque fictício pré-cadastrado. Desative um quarto para retirar da venda, preservando o histórico.
2. Cadastre pacotes com nome, tipo de quarto, janela de datas, quantidade de noites e preço total **por quarto**. Por exemplo: 5 dias / 4 noites. O hóspede deve reservar exatamente a quantidade de noites dentro dessa janela. Sem pacote selecionado, vale a diária padrão. Pacotes não substituem automaticamente a tarifa padrão e não garantem vagas.
3. Na página pública, o hóspede consulta as datas e informa nome e telefone. A solicitação fica **pendente**, bloqueando imediatamente as noites. O administrador confirma ou cancela; cancelar libera as noites. Não há cobrança, e-mail nem confirmação automática.
4. Registre também reservas recebidas pelo WhatsApp/telefone no painel. Mensagens externas não atualizam o calendário sozinhas. Use **Disponibilidade → Bloquear período** para manutenção ou indisponibilidade; cancele o bloqueio em Reservas para liberar as noites.

A entrada está incluída e a saída não ocupa uma noite. É possível uma saída e uma nova entrada no mesmo dia. Pendências **não expiram automaticamente**; cancele as que não forem concluídas. A disponibilidade atualiza a cada 15 segundos nas páginas abertas e é verificada novamente, dentro de uma transação SQLite, ao reservar. Duas solicitações simultâneas não podem ocupar o mesmo quarto/período. Valores são calculados no servidor em centavos e preservados na reserva mesmo depois de alterar tarifas. O calendário público não expõe nomes/telefones dos hóspedes.

## Dados e publicação

O SQLite fica em `.local/lotus.db`, ignorado pelo Git. Esse diretório deve ficar em um **volume persistente compartilhado pelo único servidor**. Todos os visitantes precisam acessar essa mesma instância; GitHub Pages e hospedagens somente estáticas não executam esta API. Em produção, use um proxy HTTPS, `COOKIE_SECURE=1`, restrinja acesso ao banco e configure backups consistentes (API de backup do SQLite; não copie apenas o `.db` enquanto o WAL estiver ativo). A publicação do ambiente Codex não é a publicação pública do site. Dados novos gravados depois de um snapshot exigem persistência/backups próprios.

As páginas públicas e o painel funcionam com o mesmo servidor; fontes Google são opcionais. O site original usa Bootstrap, jQuery e GSAP via cdn.jsdelivr.net. Não rode `python3 -m http.server`: ele não protege os arquivos internos nem oferece a API. Não exponha este servidor em produção antes de configurar senha, HTTPS, armazenamento persistente e backups. O servidor stdlib é para desenvolvimento/instância pequena; para uso público de maior escala, migre o transporte para um servidor de aplicação apropriado.

## Validação

```bash
python3 -m unittest discover -s tests -v
node --check main.js
node --check admin.js
node --check reservas.js
```

## Deploy na Vercel

O repositório inclui `vercel.json` para usar Next.js e `next.config.ts` para incluir os templates HTML nas funções. Um push na branch de produção dispara o deploy se a integração Git estiver conectada.

**O push sozinho não habilita a administração e reservas em produção.** Esta etapa depende de uma API Python externa com armazenamento persistente; `127.0.0.1:8000` na Vercel não aponta para o ambiente Codex. Configure `LEGACY_API_ORIGIN` no servidor Vercel apenas quando houver uma API hospedada. A API precisa usar HTTPS, `COOKIE_SECURE=1`, senha administrativa e armazenamento persistente conforme os requisitos acima. Alternativamente, conclua a migração da API e banco para uma arquitetura compatível com a Vercel. Não use SQLite no filesystem efêmero das funções para reservas reais.
