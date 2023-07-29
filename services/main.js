const services = {
    rooms: require("./background/room"),
    accounts: require("./account")
};

exports.run = async (ws, data) => {
    if (data.sub_service === "join_room") {
        let userSession = await services.accounts.getByToken(data.content.session_id);;
        if (!userSession) userSession = "";

        const filtered_name = ((data.content.room).replaceAll(" ", "")).toLowerCase();
        const getRoom = services.rooms.get(filtered_name);
        if (!getRoom) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Não existe nenhuma sala com esse nome.", text_color: "red", content: {} }))
        services.rooms.addUser(filtered_name, ws, userSession);
        services.rooms.updateStream(ws, filtered_name, ['now_playing', 'queue_updated']);
        ws.send(JSON.stringify({ token: data.token, status: 200, text_message: "", text_color: "", content: {} }));
        return ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: `Olá! Seja bem-vindo(a) à sala <b>${data.content.room}</b>. Use o comando <b>/help</b> para ver todos os comandos disponíveis.` } }));
    } else if (data.sub_service = "create_room") {
        if (!data.content.session_id) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "É necessário possuir uma conta para criar uma sala.", text_color: "red", content: {} }))
        const getUser = await services.accounts.getByToken(data.content.session_id);
        if (!getUser) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Sessão de login inválida, faça o login novamente.", text_color: "red", content: {} }));
        if (!data.content.room) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Nome da sala inválido.", text_color: "red", content: {} }));
        if ((data.content.room).replaceAll(" ", "") === "") return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Nome da sala inválido.", text_color: "red", content: {} }));
        if ((data.content.room).replaceAll(" ", "").length < 3) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "O nome da sala necessita ter no mínimo 3 Caracteres.", text_color: "red", content: {} }))
        const filtered_name = ((data.content.room).replaceAll(" ", "")).toLowerCase();
        const regex = /^[A-Za-zÀ-ÿ]+$/;
        if (!regex.test(filtered_name)) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "O nome da sala não pode conter caracteres especiais.", text_color: "red", content: {} }));
        const getRoom = services.rooms.get(filtered_name);
        if (getRoom) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Já existe uma sala com esse nome.", text_color: "red", content: {} }));
        services.rooms.createRoom(ws, data.content.session_id, data.content.room);
        ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: `Olá! Seja bem-vindo(a) à sala <b>${data.content.room}</b>. Use o comando <b>/help</b> para ver todos os comandos disponíveis.` } }));
        return ws.send(JSON.stringify({ token: data.token, status: 200, text_message: "", text_color: "", content: {} }));
    }
}