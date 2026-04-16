/* ==========================================================================
   TRACKING EVENTS SYSTEM — Meta CAPI (Client + Server-side)
   ========================================================================== */

const META_PIXEL_ID = '2456927751396396';
const META_ACCESS_TOKEN = 'EAAbgAI743HsBRBicLP0ClpwIolX72LoV48FXnOoxZCXfx7surqbiZCEvUMGshCZAqqlZCbsOAjryYnCqO6bZBwChqzvJqlMnhw7bdtf5ZCPYeNpOB17l3vhmMXEQrrdfZCps4XujuMceoee60Cpz1nthRlxqpa6eHZBz4mf7ZARPbRuRzepHIGl1WeKU0JkChu9LZAEAZDZD';

function generateEventId() {
    return 'evt_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

async function hashSHA256(string) {
    if (!string) return null;
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendToMetaCAPI(eventName, eventId, eventData = {}, userData = {}) {
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };
    if (getCookie('_fbp')) userData.fbp = getCookie('_fbp');
    if (getCookie('_fbc')) userData.fbc = getCookie('_fbc');

    const payload = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: eventId,
            event_source_url: window.location.href,
            user_data: { client_user_agent: navigator.userAgent, ...userData },
            custom_data: eventData
        }]
    };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.error) console.error(`🔴 [Meta CAPI] Lỗi (${eventName}):`, result.error.message);
        else console.log(`🟢 [Meta CAPI] Bắn thành công ${eventName}! ID: ${eventId}`);
    } catch (err) {
        console.error(`🔴 [Meta CAPI] Lỗi mạng (${eventName}):`, err);
    }
}

window.fireTrackingEvent = function (eventName, eventData = {}, userCapiData = {}) {
    const currentEventId = generateEventId();
    console.log(`🚀 [Tracking] ${eventName} | ID: ${currentEventId}`, eventData);

    if (typeof fbq === 'function') {
        fbq('track', eventName, eventData, { eventID: currentEventId });
    }

    sendToMetaCAPI(eventName, currentEventId, eventData, userCapiData);
};

// -- ViewContent Trigger (15s + scroll 50%) --
let viewContentTrigged = false, hasScrolled50 = false, hasStayed15s = false;
setTimeout(() => { hasStayed15s = true; checkViewContent(); }, 15000);

window.addEventListener('scroll', () => {
    if (hasScrolled50) return;
    const scrollH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollH === 0) return;
    if ((window.scrollY / scrollH) * 100 >= 50) {
        hasScrolled50 = true;
        checkViewContent();
    }
});

function checkViewContent() {
    if (!viewContentTrigged && hasStayed15s && hasScrolled50) {
        viewContentTrigged = true;
        window.fireTrackingEvent('ViewContent', { content_name: document.title });
    }
}

window.processLeadTracking = async (emailVal, phoneVal) => {
    const userData = {};
    if (emailVal) userData.em = await hashSHA256(emailVal.trim().toLowerCase());
    if (phoneVal) userData.ph = await hashSHA256(phoneVal.replace(/[^0-9]/g, ''));

    window.fireTrackingEvent('Lead', { event_category: 'Form' }, userData);
};
