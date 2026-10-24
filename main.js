document.addEventListener('DOMContentLoaded', function () {
    // Altura do header fixo
    const headerHeight = document.getElementById('cabecalho').offsetHeight;

    // Links do menu principal
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            if (!targetId || !targetId.startsWith('#')) return;

            e.preventDefault();

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const navbarCollapse = document.querySelector('.navbar-collapse');
                const isMobile = window.innerWidth < 992;

                // 1. Valor fixo para mobile (tente 70 se 85 estava muito alto)
                // No desktop, mantemos o headerHeight que você disse que está ok.
                const offsetMobile = 70;
                const offset = isMobile ? offsetMobile : (headerHeight + 15);

                // 2. Se for mobile, fecha o menu ANTES de calcular a posição
                if (isMobile && navbarCollapse.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse);
                    bsCollapse.hide();

                    // 3. Pequeno delay (opcional) para o cálculo não pegar o menu fechando
                    setTimeout(() => {
                        executarScroll(targetElement, offset);
                    }, 10);
                } else {
                    executarScroll(targetElement, offset);
                }
            }
        });
    });

    // Função auxiliar para evitar repetição de código
    function executarScroll(el, offset) {
        const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth'
        });
    }

    // =========================
    // MÁSCARA TELEFONE
    // =========================
    if (document.getElementById('telefone') && typeof window.jQuery !== 'undefined' && window.jQuery.fn.inputmask) {
        window.jQuery('#telefone').inputmask('(99) 9 9999-9999');
    }

    // =========================
    // FORMULÁRIO WHATSAPP
    // =========================
    const form = document.querySelector('#fale-conosco form');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const nome = document.getElementById('nome').value;
            const telefone = document.getElementById('telefone').value;
            const email = document.getElementById('email').value;
            const mensagem = document.getElementById('mensagem').value;

            const texto = `Olá, tudo bem? Me chamo ${nome}.
Telefone: ${telefone}
E-mail: ${email}

Gostaria de mais informações sobre hospedagem na Pousada Flor de Lotus.

Mensagem:
${mensagem}`;

            const numeroWhatsApp = document.body.dataset.contactWhatsapp || '557399728505';

            const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;

            window.open(url, '_blank');
        });
    }

    // SUBSTITUA TODO O BLOCO DO DROPDOWN PRAIAS POR ESTE:

    const praiasSelect = document.getElementById('praias-select');

    if (praiasSelect) {

        praiasSelect.addEventListener('change', function () {
            const targetId = this.value;

            // Remove de todas
            document.querySelectorAll('#praias .tab-pane').forEach(tab => {
                tab.classList.remove('active', 'show');
            });

            // Ativa selecionada
            const selectedTab = document.getElementById(targetId);

            if (selectedTab) {
                selectedTab.classList.add('active', 'show');
            }

            // Atualiza menu lateral
            document.querySelectorAll('.nav-praias .nav-link').forEach(btn => {
                btn.classList.remove('active');
            });

            const activeButton = document.querySelector(
                `.nav-praias button[data-bs-target="#${targetId}"]`
            );

            if (activeButton) {
                activeButton.classList.add('active');
            }
        });

        // Estado inicial correto
        const initialTarget = praiasSelect.value;

        document.querySelectorAll('#praias .tab-pane').forEach(tab => {
            tab.classList.remove('active', 'show');
        });

        const initialTab = document.getElementById(initialTarget);

        if (initialTab) {
            initialTab.classList.add('active', 'show');
        }
    }

    // =========================
    // BOTÃO VOLTAR MENU PRAIAS
    // =========================
    const botoesVoltar = document.querySelectorAll('.voltar-menu-praias');
    const topoPraias = document.getElementById('topo-praias');

    botoesVoltar.forEach(botao => {
        botao.addEventListener('click', function () {
            if (topoPraias) {
                const offset = 140;

                const elementPosition =
                    topoPraias.getBoundingClientRect().top + window.pageYOffset;

                window.scrollTo({
                    top: elementPosition - offset,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// SUBSTITUA SEU SCRIPT POR ESTE (ele pega o botão clicado corretamente)

document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('.btn-reservar').forEach(botao => {

        botao.addEventListener('click', function () {

            // PEGA O QUARTO EXATO DESTE BOTÃO
            const quarto = this.dataset.quarto;

            // Procura a caixa de reserva mais próxima desse quarto
            const reservaBox = this.closest('.reserva-box');

            const checkin = reservaBox.querySelector('.data-checkin').value;
            const checkout = reservaBox.querySelector('.data-checkout').value;

            if (!checkin || !checkout) {
                alert('Por favor, selecione check-in e check-out.');
                return;
            }

            // Campo mensagem
            const mensagem = document.getElementById('mensagem');

            if (mensagem) {
                mensagem.value =
                    `Olá! Gostaria de reservar o ${quarto}.

Período da estadia:
Check-in: ${checkin}
Check-out: ${checkout}

Poderiam me passar informações sobre disponibilidade, valores e formas de pagamento para este quarto?`;
            }

            // Scroll para fale conosco
            const faleConosco = document.getElementById('fale-conosco');

            if (faleConosco) {
                const headerHeight =
                    document.getElementById('cabecalho')?.offsetHeight || 0;

                const posicao =
                    faleConosco.getBoundingClientRect().top +
                    window.pageYOffset -
                    headerHeight -
                    20;

                window.scrollTo({
                    top: posicao,
                    behavior: 'smooth'
                });
            }

        });

    });

});

function enviarReservaFinal() {
    const start = document.getElementById('checkin-final').value;
    const end = document.getElementById('checkout-final').value;
    const guests = Number(document.getElementById('adultos-final').value) + Number(document.getElementById('criancas-final').value);
    if (!start || !end || end <= start || guests < 1) {
        alert('Informe uma entrada, uma saída posterior e pelo menos um hóspede.');
        return;
    }
    location.href = 'reservas.html?' + new URLSearchParams({start, end, guests});
}

/* =========================
    EFEITO 3D + FUNDO SEGUINDO MOUSE
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

    // Apenas desktop
    if (window.innerWidth < 992) return;

    const cards = document.querySelectorAll(".card-avaliacao");

    cards.forEach(card => {

        card.addEventListener("mousemove", (e) => {

            const rect = card.getBoundingClientRect();

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // posição do brilho
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);

            // cálculo inclinação
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateY = ((x - centerX) / centerX) * 8;
            const rotateX = ((centerY - y) / centerY) * 8;

            card.style.transform =
                `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform =
                "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
        });

    });

});

/* =========================
    MOBILE - ANIMAÇÃO TIPO NOTIFICAÇÕES
   ========================= */

document.addEventListener("DOMContentLoaded", function () {

    // Apenas mobile/tablet
    if (window.innerWidth > 991) return;

    const cards = document.querySelectorAll(".card-avaliacao");

    const observer = new IntersectionObserver((entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("show-card");

                // para manter aparecido
                observer.unobserve(entry.target);
            }

        });

    }, {
        threshold: 0.18,
        rootMargin: "0px 0px -40px 0px"
    });

    cards.forEach((card) => {
        observer.observe(card);
    });

});

document.addEventListener("DOMContentLoaded", function () {
    const lista = document.getElementById("lista-comentarios");
    const btnVerMais = document.getElementById("btn-ver-mais");

    // Se não estiver na página de avaliações, encerra aqui
    if (!lista || !btnVerMais) return;

    // Buscamos os itens que têm a classe card-item
    const cards = lista.querySelectorAll(".card-item");
    let itensVisiveis = 4;

    function atualizarPaginacao() {
        if (window.innerWidth < 992) {
            // Lógica para Mobile/Tablet
            cards.forEach((card, index) => {
                if (index < itensVisiveis) {
                    card.style.setProperty('display', 'block', 'important');
                } else {
                    card.style.setProperty('display', 'none', 'important');
                }
            });

            // Mostra ou esconde o botão "Ver Mais"
            btnVerMais.parentElement.style.display = (itensVisiveis >= cards.length) ? "none" : "block";
        } else {
            // Lógica para Desktop: Mostra tudo sempre
            cards.forEach(card => {
                card.style.setProperty('display', 'block', 'important');
            });
            btnVerMais.parentElement.style.display = "none";
        }
    }

    btnVerMais.addEventListener("click", function (e) {
        e.preventDefault();
        itensVisiveis += 4;
        atualizarPaginacao();
    });

    // Inicia e escuta redimensionamento
    atualizarPaginacao();
    window.addEventListener('resize', atualizarPaginacao);
});
