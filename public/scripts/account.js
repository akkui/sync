if (localStorage.getItem("session-id")) { location.href = "dashboard.html"; } else {
    if (localStorage.getItem("account-message")) {
        const formatObject = JSON.parse(localStorage.getItem("account-message"));
        showMessage(formatObject.message, formatObject.color);
        localStorage.removeItem("account-message");
    };

    const websocket = new WebSocket("wss://akkui-sync.glitch.me/");
    const callbacks = new Map();
    let form_type = "login";

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

    function showMessage(text, color) {
        document.getElementById(`message_display`).style.visibility = "visible";
        document.getElementById(`message_div`).style.backgroundColor = color;
        document.getElementById(`message_text`).innerHTML = text;
        setTimeout(() => document.getElementById(`message_display`).style.visibility = "hidden", 5000);
    }

    document.getElementById("submessage").addEventListener("click", () => {
        if (form_type === "login") {
            form_type = "register";
            document.getElementById("title").innerHTML = "Crie a sua conta."
            document.getElementById("confirm_password").style.visibility = "visible";
            document.getElementById("button").innerHTML = "Criar a Conta"
            document.getElementById("submessage").innerHTML = "Já tem uma conta? clique <b>aqui</b> para entrar."
        } else if (form_type === "register") {
            form_type = "login";
            document.getElementById("title").innerHTML = "Entre na sua conta."
            document.getElementById("confirm_password").style.visibility = "hidden";
            document.getElementById("button").innerHTML = "Entrar na Conta"
            document.getElementById("submessage").innerHTML = "Não tem uma conta? clique <b>aqui</b> para criar."
        };
    })

    document.getElementById("button").addEventListener("click", () => {
        sendPacket('account', form_type, { username: document.getElementById("username").value, password: document.getElementById("password").value, confirm_password: document.getElementById("confirm_password").value }).then((callback) => {
            if (callback.status === 200) { localStorage.setItem("session-id", callback.content.security_token); location.href = 'dashboard.html' } else { showMessage(callback.text_message, callback.text_color) };
        })
    })
};