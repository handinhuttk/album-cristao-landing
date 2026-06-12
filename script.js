// --- Kwai Event API Tracking ---
const KWAI_ACCESS_TOKEN = "gO48wVvJ8HnKYn5P6ZD6NnwRgHFNcCqvdW7rfwuh41w";
const KWAI_PIXEL_ID = "313264180848301";

// 1. Capture click_id from URL or localStorage
function getKwaiClickId() {
    const urlParams = new URLSearchParams(window.location.search);
    const clickIdParam = urlParams.get('click_id');
    
    if (clickIdParam) {
        localStorage.setItem('kwai_click_id', clickIdParam);
        return clickIdParam;
    }
    
    return localStorage.getItem('kwai_click_id');
}

const kwaiClickId = getKwaiClickId();

// 2. Event Sender Function
function sendKwaiEvent(eventName, value = null, currency = null, extraProperties = {}) {
    if (!kwaiClickId) {
        console.warn("Kwai Event API: click_id não encontrado. Evento não enviado.");
        return;
    }

    const payload = {
        access_token: KWAI_ACCESS_TOKEN,
        pixelId: KWAI_PIXEL_ID,
        clickid: kwaiClickId,
        event_name: eventName,
        testFlag: false,
        trackFlag: false, // Desativado após o teste
        is_attributed: 1,
        mmpcode: "PL",
        pixelSdkVersion: "9.9.9",
    };

    if (value && currency) {
        payload.value = parseFloat(value);
        payload.currency = currency;
    }

    if (Object.keys(extraProperties).length > 0) {
        payload.properties = JSON.stringify(extraProperties);
    }

    fetch('https://www.adsnebula.com/log/common/api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(payload),
        keepalive: true // garante que a requisição seja enviada mesmo que o usuário saia da página
    })
    .then(res => res.json())
    .then(data => {
        console.log(`Kwai Event API [${eventName}]:`, data);
    })
    .catch(err => {
        console.error(`Kwai Event API Error [${eventName}]:`, err);
    });
}

// 3. Trigger Page View Automático
if (kwaiClickId) {
    sendKwaiEvent("EVENT_CONTENT_VIEW");
}

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Single Image Slider
    const singleImageSlider = new Swiper('.single-image-slider', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        effect: 'slide',
        speed: 500,
    });

    // Initialize Feedback Slider
    const feedbackSlider = new Swiper('.feedback-slider', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        speed: 500,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        slidesPerView: 1,
        spaceBetween: 20,
        breakpoints: {
            640: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            }
        }
    });

    // FAQ Accordion Logic
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isOpen = faqItem.classList.contains('open');

            // Close all items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('open');
            });

            // If it was closed, open it
            if (!isOpen) {
                faqItem.classList.add('open');
            }
        });
    });

    // 4. Listen to Buy Buttons for Checkout Event
    const buyButtons = document.querySelectorAll('.btn-buy, .btn-buy-small');
    buyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // A Kwai Event API agora será disparada apenas QUANDO o PIX for gerado (dentro do fluxo do Modal)
            // Mantemos esse listener apenas para caso existam outros botões que não abrem modal (mas todos abrirão)
        });
    });

    // ==========================================
    // Checkout Modal Logic
    // ==========================================
    const modal = document.getElementById('checkout-modal');
    const checkoutTriggers = document.querySelectorAll('.checkout-trigger');
    const closeModal = document.querySelector('.close-modal');
    
    const step1 = document.getElementById('checkout-step-1');
    const step2 = document.getElementById('checkout-step-2');
    const step3 = document.getElementById('checkout-step-3');

    const checkoutForm = document.getElementById('checkout-form');
    const btnGeneratePix = document.getElementById('btn-generate-pix');
    const pixQrCode = document.getElementById('pix-qr-code');
    const pixCopiaCola = document.getElementById('pix-copia-cola');
    const btnCopyPix = document.getElementById('btn-copy-pix');
    const copySuccessMsg = document.getElementById('copy-success-msg');
    const successEmailDisplay = document.getElementById('success-email-display');

    let pollingInterval = null;

    // Open Modal
    checkoutTriggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.remove('hidden');
        });
    });

    // Close Modal
    function hideModal() {
        modal.classList.add('hidden');
        if (pollingInterval) clearInterval(pollingInterval);
    }

    closeModal.addEventListener('click', hideModal);

    // Fechar ao clicar fora do modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // Handle Form Submit (Generate PIX)
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('customer-name').value;
        const email = document.getElementById('customer-email').value;

        btnGeneratePix.disabled = true;
        btnGeneratePix.innerText = 'Gerando PIX...';

        try {
            // Chama a nossa própria API Serverless na Vercel
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro ao gerar o PIX');
            }

            // Exibir dados do PIX
            // O NexusPag já retorna o prefixo data:image/png;base64, no qr_code_base64
            pixQrCode.src = data.transaction.qr_code_base64;
            pixCopiaCola.value = data.transaction.pix_copia_cola;

            // Mudar para a tela 2
            step1.classList.add('hidden');
            step2.classList.remove('hidden');

            // Disparar o rastreamento do Kwai de que o checkout foi iniciado
            sendKwaiEvent("EVENT_INITIATED_CHECKOUT", 29.90, "BRL", {
                content_id: "album_cristao",
                content_type: "product",
                content_name: "Álbum da Bíblia",
            });

            // Iniciar o Polling para checar se foi pago
            startPolling(data.transaction.id, email);

        } catch (error) {
            alert('Falha ao gerar o PIX. Tente novamente mais tarde.\nDetalhes: ' + error.message);
            btnGeneratePix.disabled = false;
            btnGeneratePix.innerText = 'Gerar PIX (R$ 29,90)';
        }
    });

    // Copy PIX Action
    btnCopyPix.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(pixCopiaCola.value);
            showCopySuccess();
        } catch (err) {
            // Fallback para navegadores antigos/safari
            pixCopiaCola.select();
            document.execCommand('copy');
            showCopySuccess();
        }
    });

    function showCopySuccess() {
        copySuccessMsg.classList.remove('hidden');
        setTimeout(() => copySuccessMsg.classList.add('hidden'), 3000);
    }

    // Polling function to check status
    function startPolling(transactionId, customerEmail) {
        if (pollingInterval) clearInterval(pollingInterval);

        pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/status?id=${transactionId}`);
                const data = await res.json();

                if (data.status === 'paid') {
                    clearInterval(pollingInterval);
                    
                    // Mostrar Tela de Sucesso
                    step2.classList.add('hidden');
                    successEmailDisplay.innerText = customerEmail;
                    step3.classList.remove('hidden');

                    // Avisar o Kwai que a compra foi concluída com sucesso!
                    sendKwaiEvent("EVENT_PURCHASE", 29.90, "BRL", {
                        content_id: "album_cristao",
                        content_type: "product"
                    });
                }
            } catch (err) {
                console.error("Erro ao checar status do PIX:", err);
            }
        }, 5000); // Check every 5 seconds
    }
});
