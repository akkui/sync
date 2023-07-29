const services = {
    rooms: require("./background/room"),
    accounts: require("./account"),
    commands: require("./background/commands")
}

exports.run = async (ws, data) => {
    if (data.sub_service === "send") {
        if (!data.content.message || (data.content.message).replaceAll(" ", "") === "") return ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: "Você não pode enviar uma mensagem vázia." } }));
        if ((data.content.message).length > 500) return ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: "Você excedeu o limite de caracteres.", color: "#ff0000" } }));
        
        const getRoom = services.rooms.get(data.content.room);
        if (!getRoom) return ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: "As credenciais da sala estão inválidas, atualize a página e tente novamente." } }));

        const getUser = await services.accounts.getByToken(data.content.session_id);
        if (!getUser) return ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: "Você não está logado na sua conta. Crie/entre na sua conta para utilizar o chat." } }));
        
        let user_roles = [];
        if (getRoom.moderators.includes(data.content.session_id)) {
          if (getRoom.owner === data.content.session_id) {
            user_roles.push({ name: 'CREATOR', color: 'red' })
          } else {
            user_roles.push({ name: 'MOD', color: 'green' })
          }
        }
      
        let filtered_message = data.content.message.replace(/[<>&'"\\()[\]{};%+\-*|!#$@,]/g, "");
        for (let user of getRoom.users) user.ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: user_roles, author: getUser.Username, message: filtered_message } }));
        if ((filtered_message).startsWith('/')) {
            const [comando, ...args] = filtered_message.slice(1).split(' ');
            services.commands.run(comando.toLowerCase(), args, { user_ws: ws, user_room: getRoom, user_account: getUser });
        };
    }
}
