# Proposta local — página de pescadores

Solicitação de 02/11/2026: preparar prévia para avaliação. **Não fazer push nem publicar esta proposta antes da avaliação do proprietário.** A autorização de rede recebida nesta tarefa refere-se ao acesso à fotografia pública, não à publicação.

Base sincronizada com `origin/main` em `6e086193`. Foram preservados a abertura compacta a 85%, o respiro superior, o cabeçalho transparente/compacto, o freezer e o café antecipado sob solicitação. A roda mantém fotos, dez posições, ampliação, controles, movimento e intervalo de dois segundos.

Ordem: abertura → carrossel → acomodações → três passos → depoimento → consulta/contato → políticas.

Acomodações vêm do GET `/api/catalog`, reutilizando a mesma correspondência de categorias de reservas.js, agora compartilhada em room-catalog.js. Exibe Standard, Standard Superior e Família se há unidades ativas correspondentes; capacidade mínima/máxima é calculada somente a partir do cadastro, sem preço ou disponibilidade presumida. Erros permitem nova tentativa e mantêm a ação para /grupos.

Todos os links de organização usam `/grupos?origem=pescadores`. A origem muda somente o cabeçalho editorial, usando group-origin.ts. A rota padrão permanece igual. Nenhuma alteração em banco, autenticação, reservas ou preços.

Depoimento: primeiro publicado e destacado no cadastro (Ramon, Booking.com na leitura de 02/11/2026). Texto integral, nome e fonte preservados. Não foi encontrado relato comprovadamente sobre grupos; o bloco é apresentado como depoimento de hóspede. Sem conteúdo publicado adequado, não renderiza o bloco.

Contato conserva nome, 1–60 pessoas e calendário compartilhado. Corrigida a orientação para datas ausentes para abrir o calendário após os demais listeners de submit, evitando fechamento imediato. Políticas usam detalhes nativos somente em /pescadores; check-in, check-out e confirmação iniciam abertos. Texto cadastrado não foi cortado.

Verificações aprovadas: build Next/TypeScript; test-fishing-page.mjs; test-fishing-wheel-browser.py; test-fishing-proposal-browser.py; test-category-booking-browser.py. Navegador testado em 360, 390, 430, 768, 1024 e 1440 px. APIs interceptadas com fotografia/catálogo/depoimentos públicos consultados somente para leitura; window.open capturado para conferir mensagem sem enviá-la. Nenhuma reserva criada.

Limitação: a fotografia original de pescadores hospedada no Supabase permanece bloqueada pelo proxy do ambiente (403), mesmo após autorização do proprietário e permissão de rede. As capturas mantêm a referência original e mostram esse espaço sem a foto; as imagens locais das acomodações carregam normalmente. Não houve substituição de foto. A inspeção dos pixels dessa imagem remota não pôde ser realizada.
