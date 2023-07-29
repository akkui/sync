const websocket = new WebSocket("wss://akkui-sync.glitch.me/");
const callbacks = new Map();

websocket.onmessage = function (event) {
    const content = JSON.parse(event.data);
    const getCallback = callbacks.get(content.token);
    if (!content.automatic && getCallback) return getCallback(content);
};

function sendPacket(service, sub_service, data_content) {
    return new Promise((resolve) => {
        const token = genToken(32);
        websocket.send(JSON.stringify({ token: token, service: service, sub_service: sub_service, content: data_content }));
        callbacks.set(token, (data) => { callbacks.delete(token); resolve(data); });
    });
};

function genToken(number) {
    const crypto_array = new Uint8Array(number);
    window.crypto.getRandomValues(crypto_array);
    const crypto_key = Array.from(crypto_array).map(byte => byte.toString(16).padStart(2, '0')).join('');
    return crypto_key;
};

function change_page(to) {
    const pages = ["your_account", "security"];
    for (page of pages) document.getElementById(`${page}#div`).style.display = "none";
    document.getElementById(`${to}#div`).style.display = "block";
};

function loadDashboard(data) {
    document.getElementById("your_account#title").innerHTML = `Bem-vindo(a) <b>${data.username}</b>!`
}

if (!localStorage.getItem("session-id")) { location.href = 'account.html'; } else {
    websocket.onopen = function (event) {
        sendPacket('account', 'authentication', localStorage.getItem("session-id")).then((callback) => {
            if (callback.status === 400) {
                localStorage.clear();
                localStorage.setItem("account-message", JSON.stringify({ message: "Você foi desconectado da sua conta por sessão inválida.", color: "#ff0000" }));
                location.href = 'account.html';
            } else {
                document.getElementById("security#logout_button").addEventListener("click", (e) => {
                    localStorage.clear();
                    localStorage.setItem("account-message", JSON.stringify({ message: "Você foi desconectado da sua conta.", color: "#2bff00" }));
                    location.href = 'account.html';
                })

                return loadDashboard(callback.content);
            }
        })
    }
}