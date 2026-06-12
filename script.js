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
        btn.addEventListener('click', () => {
            sendKwaiEvent("EVENT_INITIATED_CHECKOUT", 29.90, "BRL", {
                content_id: "album_cristao",
                content_type: "product",
                content_name: "Álbum da Bíblia",
            });
        });
    });
});
