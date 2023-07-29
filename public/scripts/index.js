const websocket = new WebSocket("wss://akkui-sync.glitch.me/");
const callbacks = new Map();
var local_room = undefined;
var websocket_status = false;

websocket.onopen = function (event) { websocket_status = true; showMessage('Conexão com o servidor efetuada com sucesso.', 'green', 1000) };
setTimeout(() => { if (websocket_status === false) return showMessage('O servidor está fora do ar, tente novamente mais tarde.', 'red', false)}, 5000)

websocket.onmessage = function (event) {
    const content = JSON.parse(event.data);
    const getCallback = callbacks.get(content.token);
    if (!content.automatic && getCallback) return getCallback(content);

    if (content.filters.includes("queue_updated")) {
        const queue_box = document.getElementById('queue-box');
        queue_box.innerHTML = '';
        content.queue.forEach(video => {
            const queue_block = document.createElement('div');
            const thumbnail = document.createElement('img');
            const description = document.createElement('div');
            const title = document.createElement('span');
            const videoId = document.createElement('span');

            queue_block.style.cssText = `display:flex;margin-bottom:10px;`
            thumbnail.src = `https://img.youtube.com/vi/${video.url}/mqdefault.jpg`;
            thumbnail.style.cssText = `width:${75*(16/9)}px; height:75px`
            description.style.cssText = `display:flex;flex-direction:column;margin-left:10px;`
            title.textContent = video.title; 
            title.style.cssText = `font-size:18px;font-weight:bold;`
            videoId.innerHTML = `<b>FILA ID:</b> ${video.queue_id}`;
            videoId.style.cssText = `font-size:14px;`

            description.append(title, videoId);
            queue_block.append(thumbnail, description)
            queue_box.append(queue_block);
        });
    }

    if (content.filters.includes("now_playing")) {
        player.stopVideo();
        player.loadVideoById({ videoId: content.playing.url, startSeconds: content.playing.time });
        if (content.playing.url === "") { document.getElementById("empty_player").style.display = "block"; document.getElementById("player").style.display = "none"; } else { document.getElementById("empty_player").style.display = "none"; document.getElementById("player").style.display = "block"; }
    }

    if (content.filters.includes("webchat")) {
        const messageElement = document.createElement('li');
        messageElement.innerHTML = `<b style="color:white">${content.content.author}:</b> ${content.content.message}`;
        for (role of content.content.roles) messageElement.innerHTML = `<b style="color: ${role.color}">${role.name}</b> `+ messageElement.innerHTML;
        messageElement.style.cssText = `list-style: none; color: #CCCCCC`
        document.getElementById("chat-messages").appendChild(messageElement);
        document.getElementById("chat-messages").scrollTop = document.getElementById("chat-messages").scrollHeight;
    };
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

function changePage(to) {
    const allPages = ["homepage", "inside_room"];
    for (page of allPages) document.getElementById(page).style.display = "none";
    document.getElementById(to).style.display = "block";
}

function showMessage(message, color, time) {
    document.getElementById(`homepage_message_display`).style.visibility = "visible";
    document.getElementById(`homepage_message_div`).style.backgroundColor = color;
    document.getElementById(`homepage_message_text`).innerHTML = message;
  
    if (time !== false) setTimeout(() => document.getElementById(`homepage_message_display`).style.visibility = "hidden", time || 5000);
};

function onYouTubeIframeAPIReady() {
    function buttons(from) {
        if (from === "webchat") {
            sendPacket('webchat', 'send', { session_id: localStorage.getItem("session-id"), room: local_room, message: document.getElementById("chat-input-message").value })
            document.getElementById("chat-input-message").value = "";
            return;
        } else if (from === "joinroom") {
            sendPacket('main', 'join_room', { room: document.getElementById("room-id-join").value, session_id: localStorage.getItem("session-id") }).then((callback) => {
                if (callback.status === 400) { document.getElementById("room-id-join").value = ""; return showMessage(callback.text_message, callback.text_color); };
                local_room = ((document.getElementById("room-id-join").value).replaceAll(" ", "")).toLowerCase();
                document.getElementById("chat-input-message").addEventListener("keydown", (e) => { if (e.keyCode === 13) buttons('webchat'); });
                document.getElementById("send-chat-message").addEventListener("click", () => buttons('webchat'));
                changePage("inside_room");
                return;
            });
        } else if (from === "createroom") {
            sendPacket('main', 'create_room', { room: document.getElementById("room-id-create").value, session_id: localStorage.getItem("session-id") }).then((callback) => {
                if (callback.status === 400) { document.getElementById("room-id-create").value = ""; return showMessage(callback.text_message, callback.text_color); };
                local_room = ((document.getElementById("room-id-create").value).replaceAll(" ", "")).toLowerCase();
                document.getElementById("chat-input-message").addEventListener("keydown", (e) => { if (e.keyCode === 13) buttons('webchat'); });
                document.getElementById("send-chat-message").addEventListener("click", () => buttons('webchat'));
                changePage("inside_room");
                return;
            });
        }
    }

    player = new YT.Player("player", {
        height: "260", width: "600",
        events: {
            onReady: function () {
                document.getElementById("room-button-join").addEventListener("click", () => buttons('joinroom'));
                document.getElementById("room-button-create").addEventListener("click", () => buttons('createroom'));
                document.getElementById("room-id-join").addEventListener("keydown", (e) => { if (e.keyCode === 13) buttons('joinroom'); });
                document.getElementById("room-id-create").addEventListener("keydown", (e) => { if (e.keyCode === 13) buttons('createroom'); });
            },
            onStateChange: function (event) { if (event.data === 0) { document.getElementById("empty_player").style.display = "block"; document.getElementById("player").style.display = "none"; }; },
        }
    });
};
