# Pousada Flor de Lótus

Site, reservas e painel em português brasileiro. A API agora roda em **Next.js 16.4.2 / TypeScript 7.0.2**, com **Supabase Postgres e Auth**. Não precisa do Python para o deploy na Vercel. As telas ainda usam os templates HTML/JavaScript preservados; a conversão visual para componentes React continua pendente.

## Executar e publicar

Requer Node.js 24:

```bash
npm --cache /workspace/shared/npm-cache ci --no-audit --no-fund
npm run dev
# Produção:
npm run build
npm run start
```

Rotas: `/`, `/reservas`, `/admin` e `/avaliacoes`; URLs `.html` também funcionam. Em desenvolvimento, Next.js usa a porta 3000. `predev`/`prebuild` preparam `public/` selecionando somente fotos, CSS e JavaScript; edite os originais, não a pasta gerada.

O projeto Supabase escolhido é `asojfispuomhbfapqdmi` (`database-projetos`, conexão MCP Zilter2). URL e chave **publishable**, sem privilégios administrativos, estão em `src/lib/supabase-config.ts`. Podem ser substituídas por `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no servidor. Nenhuma service-role key ou senha de banco é necessária na aplicação. Não use uma chave secreta como publishable.

`vercel.json` seleciona Next.js; `next.config.ts` inclui os quatro templates nas funções. Um push na branch de produção dispara o deploy se a integração Git estiver ativa. A aplicação acessa diretamente as APIs HTTPS Supabase, sem depender de `127.0.0.1`, SQLite ou processo Python. O deploy da Vercel precisa conseguir alcançar o Supabase.

## Acesso administrativo e transferência

A conta inicial autorizada é `zilterpacheoni17@gmail.com`. A senha temporária foi gerada e guardada somente no arquivo privado `work/acesso-inicial-admin.txt`, ignorado pelo Git. Não publique esse arquivo nem mostre a senha em logs. Após entrar, use **E-mail e senha** no painel para trocar a senha ou transferir o e-mail ao proprietário. A alteração exige a senha atual. Novas senhas devem ter pelo menos 12 caracteres. A troca de e-mail segue a confirmação do Supabase Auth; até confirmar, o endereço atual continua válido.

Em Supabase → Authentication → URL Configuration, configure Site URL como `https://flor-de-lotus-three.vercel.app` e permita `https://flor-de-lotus-three.vercel.app/admin` entre os redirects. `APP_URL` pode substituir esse endereço na aplicação. O envio/confirmação de troca de e-mail também depende da configuração de e-mail e dos limites do projeto Supabase. O app não envia mensagens ao configurar a conta inicial.

A autorização está em `lotus_private.admin_users`, vinculada ao UUID do usuário Auth. Ela acompanha a troca do e-mail da mesma conta. Cadastrar outro usuário Auth não concede acesso administrativo. Para conceder acesso a uma conta adicional, um operador autorizado deve inserir seu UUID nesta tabela pelo SQL Editor/MCP. Metadados editáveis de usuários não conferem permissão.

Tokens Auth ficam em cookies HttpOnly, SameSite=Strict e Secure em produção. O servidor renova tokens expirados; o banco exige uma sessão Auth existente e verifica seu prazo, além da autorização administrativa. Logout revoga a sessão corrente e limpa os cookies. O Supabase Auth aplica os limites de tentativas; configure-os e habilite proteções adicionais conforme a hospedagem.

## Reservas e dados

- Cadastre cada quarto físico com nome/número único, tipo, capacidade, diária em reais e disponibilidade para venda. Tipos: solteiro, casal, casal + 1 e família. A quantidade deriva dos cadastros; não há quartos ou tarifas fictícias.
- Pacotes têm janela de datas, quantidade de **noites** e preço total por quarto. Por exemplo, 5 dias podem corresponder a 4 noites. A estadia deve ter exatamente as noites do pacote e caber na janela.
- Solicitações públicas ficam **pendentes** e bloqueiam imediatamente as noites. Só o administrador confirma ou cancela. Cancelamento libera as noites. Não há pagamento nem confirmação automática; pendências não expiram sozinhas.
- Entrada inclusiva e saída exclusiva: uma saída e uma entrada podem ocorrer no mesmo dia. A constraint de exclusão PostgreSQL impede sobreposição de reservas pendentes, confirmadas e bloqueios, inclusive sob concorrência e reconfirmação de reservas canceladas.
- O banco calcula o total em centavos e preserva o valor na reserva após alterações de tarifas. A criação trava o quarto durante a transação, serializando alterações de capacidade e preço. Datas são validadas no fuso de Itacaré (`America/Bahia`).
- Reservas de WhatsApp/telefone precisam ser registradas no painel; mensagens não são reservas automáticas. Bloqueios de manutenção são cadastrados pela gestão e têm total zero.
- Dados de hóspedes ficam no schema privado `lotus_private`, com RLS e políticas explícitas de negação de acesso direto. `anon` e `authenticated` não recebem privilégios nas tabelas. A RPC pública `lotus_api` é um wrapper invoker; a função privilegiada no schema privado valida todos os dados e a autorização de cada operação. Catálogo/disponibilidade públicos não retornam nomes ou contatos de hóspedes. A chave publishable não permite ignorar essas verificações.

As tabelas locais `.local/lotus.db` foram preservadas. **Seus registros não foram importados para o Supabase**. A importação de dados reais exige mapeamento de IDs e verificação de conflitos; não reutilize bancos de teste como dados da pousada.

## Schema e verificação

As migrações foram aplicadas via MCP ao projeto autorizado:

- `20261022200433_lotus_reservations`
- `20261022201313_lotus_explicit_deny_direct_access`

`database/lotus-schema.sql` é uma cópia reproduzível do schema final para um banco novo, não uma migração idempotente para reaplicar neste projeto. O provisionamento inicial da conta não está no schema nem contém senha versionada. A CLI Supabase não instalou neste ambiente; o histórico remoto foi verificado pelo MCP.

```bash
npm run build
npm run typecheck
npm run test:supabase-api
# Contrato do legado, com bancos temporários:
npm test
npm run test:next
```

`test:supabase-api` executa um servidor Next.js real na porta 3108, conectado a um mock HTTP local de Auth/PostgREST. Verifica cookies, autenticação, renovação, logout, troca de acesso, CSRF e validação do transporte. Não equivale a um login real no Supabase.

`database/test-reservations.sql` foi executado pelo MCP no PostgreSQL real e verifica valores, pacotes, capacidade, cancelamento, checkout, bloqueios, autorização e privacidade. Fixtures, inclusive usuários/sessões sintéticos, ficam numa transação com rollback. Um teste adicional com duas transações simultâneas confirmou uma única reserva criada e uma rejeição PT409; seus registros foram removidos pela identificação única do teste.

O build, o TypeScript e os testes não confirmam o deploy remoto. A política de rede deste ambiente bloqueia chamadas HTTP diretas ao Supabase e ao domínio Vercel; o login real e a confirmação de e-mail precisam de validação em uma rede permitida. O MCP continua acessível.

O advisor não encontrou problemas nas permissões das tabelas/funções. Resta o aviso de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), configuração do Auth. O índice de pacotes ainda sem uso é esperado num banco novo.

## Legado preservado

`server.py`, os testes Python, fotos e arquivos originais continuam como referência. Para executar somente o legado: configure `ADMIN_PASSWORD` de forma privada e rode `python3 server.py`. Ele usa `.local/lotus.db` e não compartilha dados nem autenticação com Supabase.

A ponte HTTP antiga só é ativada explicitamente com `LOTUS_BACKEND=legacy` fora da Vercel, usando `LEGACY_API_ORIGIN` (padrão `http://127.0.0.1:8000`). `test:next` usa esse modo com senha e banco temporários, sem tocar em `.local/`. Não configure o modo legado para produção Vercel.


## Blocos públicos de quartos editáveis

A home renderiza os três blocos de `lotus_private.room_showcases` via RPC `lotus_showcase_api`, com fallback para os textos/fotos originais em `src/lib/showcase-defaults.ts` se o serviço falhar. A seção mantém foto principal e duas miniaturas, álbum “Ver fotos”, descrição original, comodidades e link para tarifas. CSS/JS específicos: `quartos.css` e `quartos.js`.

Em `/admin`, a aba **Conteúdo dos quartos** edita título, tópico opcional, descrição, fotos (3–12), ordem e ícones/textos das comodidades. Fotos JPG/PNG/WebP até 3 MB são enviadas ao bucket público `lotus-showcase`, somente para administradores autorizados. Fotos enviadas são públicas; não usar documentos ou dados de hóspedes. A revisão impede sobrescrita silenciosa entre editores. Cadastro físico, preços e reservas são independentes.

Fonte da alteração remota aplicada: `database/room-showcases.sql`. Contrato real de banco validado com rollback em `database/test-room-showcases.sql`: leitura pública, escrita restrita, revisão e validação de conteúdo. API HTTP validada com backend simulado pelo `npm run test:supabase-api`, incluindo envio de imagem e bloqueio de arquivo inválido. Layout/álbum/editor conferidos em Chromium em 320/390/1024/1440px; chamadas do painel simuladas para não alterar conteúdo real. Upload HTTPS direto ao Supabase não pôde ser exercitado neste ambiente, cujo proxy bloqueia esse domínio.

## Conta do visitante com Google

O cabeçalho desktop mantém a marca central, `Reservar` à esquerda e `Minha Conta` à direita. No celular, a conta está no menu. `conta.js` consulta `/api/guest/session`, abre um dialog e exibe nome, e-mail e foto Google verificados pelo Auth. Se a foto falhar, mantém ícone neutro. Sem tokens em localStorage. Não há integração de histórico de reservas nesta etapa.

As rotas `/auth/google` (POST da mesma origem), `/auth/callback`, `/api/guest/session` e `/api/guest/logout` usam os SDKs oficiais `@supabase/ssr` e `@supabase/supabase-js` com versões fixas, PKCE e cookies HttpOnly/Secure/SameSite=Lax. O namespace `lotus_guest_auth` é independente de `lotus_access`/`lotus_refresh` da administração. Qualquer login Google não concede permissão administrativa. Perfil é obtido com `getUser()` no servidor e somente fotos HTTPS de `*.googleusercontent.com` são aceitas. Respostas privadas não são cacheadas; callback ignora destinos arbitrários. O avanço das galerias dos quartos agora usa 3 segundos (hero de abertura independente).

**Ativação pendente pelo proprietário:** o usuário informou que ainda não criou as credenciais Google. Não há ferramenta de configuração Auth do Supabase/Google Cloud nesta conexão; nenhum segredo foi solicitado ou versionado. O site consulta o estado real do provedor em `/auth/v1/settings` e informa “disponível em breve” enquanto desativado; um erro de conexão tem mensagem própria. Não afirmar login real validado antes da ativação.

1. No [Google Auth Platform](https://console.cloud.google.com/auth/overview), configurar a tela de consentimento e criar um cliente OAuth do tipo **Aplicativo da Web**. Escopos de perfil: `openid`, `email`, `profile`. Em modo de teste, adicionar as contas de teste à audiência; para hóspedes em geral, publicar a aplicação conforme os requisitos do Google.
2. Origem JavaScript autorizada: `https://flor-de-lotus-three.vercel.app`. URI de redirecionamento autorizado: `https://asojfispuomhbfapqdmi.supabase.co/auth/v1/callback`.
3. Em [Supabase → Google](https://supabase.com/dashboard/project/asojfispuomhbfapqdmi/auth/providers?provider=Google), habilitar o provedor e inserir o Client ID e o Client Secret diretamente no painel. Manter a verificação de nonce ativada. **Não inserir o Secret no código ou chat.**
4. Em [Supabase → URL Configuration](https://supabase.com/dashboard/project/asojfispuomhbfapqdmi/auth/url-configuration), Site URL: `https://flor-de-lotus-three.vercel.app`; adicionar à lista Redirect URLs o endereço exato `https://flor-de-lotus-three.vercel.app/auth/callback`. O retorno de OAuth é diferente do retorno de confirmação de e-mail administrativo; preservar URLs já usadas.
5. Abrir Minha Conta → Continuar com Google, concluir consentimento e conferir nome/foto, recarregar e sair. A ativação do provedor é detectada sem novo deploy. Não usar wildcard de domínio em produção.

Verificação: `npm run test:guest-auth` exercita rotas reais + SDK contra Auth HTTP simulado (PKCE, verificador ausente, cookies seguros, bloqueio de origens externas, perfil/foto, saída e isolamento do admin). Teste não autentica uma conta Google real. Layout e estados da janela conferidos em Chromium em 1920/1440/1024/768/390/320px com API simulada. Login administrativo/API existente conserva testes próprios. Auditoria Supabase continua com o aviso preexistente de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sem alteração de schema/RLS nesta tarefa.


## Galeria clara com detalhes dos quartos

A janela de “Ver fotos” agora segue a referência clara: no celular, imagem no topo, contador sobreposto, miniaturas, título, destaques e grupos de informações; no desktop, fotos e informações lado a lado. Cabeçalho de fechamento e rodapé de tarifas ficam acessíveis enquanto o conteúdo rola. As setas permanecem sem fundo circular; teclado, Escape, swipe e seleção por miniaturas continuam disponíveis. Galerias da home mantêm três imagens e autoplay de 3 segundos.

Por orientação do usuário, nomes públicos: **Quarto Duplo Standard**, **Quarto Duplo Superior** e **Quarto Família**. Os identificadores internos `duplo`, `triplo`, `familia` são preservados por compatibilidade; não representam os tipos físicos do estoque. Dados fornecidos nas imagens da Booking foram transcritos para os dois duplos: 17 m², 1 cama de casal, banheiro privativo com chuveiro, produtos de banho, toalhas/papel, varanda, vista para o jardim, ar-condicionado, roupa de cama, TV de tela plana e proibição de fumar. Não copiar preço, nota, número de avaliações ou comodidades da referência de outra hospedagem. Não inferir camas/novas comodidades para o Família. Fotos remotas preservadas.

Detalhes salvos na coluna `lotus_private.room_showcases.details`, validados pela RPC existente; fonte da migração remota aplicada em `database/room-detail-modal.sql`. O editor administrativo ganhou campos opcionais e listas por linha em “Informações em Ver fotos”. Editores antigos que omitem `details` preservam os dados. Os quatro destaques públicos continuam independentes das listas completas. Novas informações não alteram quartos físicos, tarifas ou reservas.

Verificação: build/typecheck e contratos HTTP; contrato Postgres real com rollback (`database/test-room-showcases.sql`) cobre validação, autorização e preservação dos detalhes/fotos. Chromium em 320/390/430/768/1024/1440px: álbum claro, informações por categoria, setas, miniaturas, Escape, CTA, rolagem sem overflow e editor com API simulada. WebKit nativo não instalado. Auditoria não apresentou novos alertas; permanece o aviso anterior de [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
