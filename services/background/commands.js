const services = {
    youtube: require("./youtube"),
    rooms: require("./room"),
    account: require("../account")
}

exports.run = (comando, args, info) => {
    function message(message) {
        for (user of info.user_room.users) user.ws.send(JSON.stringify({ automatic: true, filters: ["webchat"], content: { roles: [{ name: 'BOT', color: '#f64b84' }], author: "SYNC-AKKUI", message: message } }));
    };

    if (comando === "help") {
        if (args[0]) {
            const descriptions = {
                "usuarios": "O comando <b>usuarios</b> serve para você ver todos os usuários que estão na sala.",
                "help": "O comando <b>help</b> serve para ver todos comandos disponíveis e detalhes dos mesmos.",
                "play": "O comando <b>play</b> serve para adicionar vídeos para serem reproduzidos. <b>/play (URL do Vídeo do Youtube)</b>",
                "nowplaying": "O comando <b>nowplaying</b> serve para ver mais detalhes do vídeo atual que está sendo reproduzido.",
                "resync": "O comando <b>resync</b> serve para re-sincronizar você com todas outras pessoas da sala.",
                "moderadores": "O comando <b>moderadores</b> serve para você ver todos moderadores da sala.",
                "details": "O comando <b>details</b> serve para você ver mais detalhes sobre um vídeo da fila. <b>/details (ID do Vídeo na Fila)</b>",
                "skip": "O comando <b>skip</b> serve para você pular o vídeo que está sendo reproduzido.",
                "clear": "O comando <b>clear</b> serve para limpar toda a fila de vídeos.",
                "setmod": "O comando <b>setmod</b> serve para dar permissões de moderador para outra pessoa. <b>/setmod (Nome do Usuário)</b>",
                "unmod": "O comando <b>unmod</b> serve para remover permissões de moderador de outra pessoa. <b>/unmod (Nome do Usuário)</b>",
            }

            if (!descriptions[`${args[0]}`]) return message("Não existe nenhum comando com esse nome.");
            return message(descriptions[`${args[0]}`]);
        } else {
            return message(`/help (Comando) <b>|</b> /play (URL do Youtube) <b>|</b> /nowplaying <b>|</b> /resync <b>|</b> /moderadores <b>|</b> /usuarios <b>|</b> /details (ID do Vídeo) <b>|</b> /skip <b>|</b> /clear <b>|</b> /setmod (Nome do Usuário) <b>|</b> /unmod (Nome do Usuário)`, '#2bff00')
        }
    }

    if (comando === "nowplaying") {
        if (info.user_room.stream.playing.url === "") return message("Nenhum vídeo está sendo reproduzido no momento.");
        return message(`Agora está sendo reproduzido <b>${info.user_room.stream.playing.title}</b>. Vídeo adicionado pelo(a) <b>${info.user_room.stream.playing.requested_by}</b>.`);
    }

    if (comando === "resync") {
        services.rooms.updateStream(info.user_ws, info.user_room.name, ['now_playing', 'queue_updated']);
        return message(`Você foi re-sincronizado com sucesso.`);
    }

    if (comando === "details") {
        (async function () {
            if (!args[0]) return message("Você necessita colocar o ID do Vídeo na Fila para ver mais informações.");
            const getVideo = await services.rooms.getFromQueue(info.user_room.name, args[0])
            if (getVideo.exists === false) return message("Não existe nenhum vídeo na fila com esse ID.");
            return message(`Aqui estão algumas informações sobre o vídeo <b>"${getVideo.content.title}" (ID: ${getVideo.content.queue_id})</b>. O vídeo foi adicionado pelo(a) <b>${getVideo.content.requested_by}</b> e dura <b>${getVideo.content.max_time}s</b>.`, "#2bff00");
        })();
    }

    if (comando === "play") {
        if (!args[0]) return message("Você necessita colocar a URL do Vídeo.");
        services.youtube.checkURL(args[0]).then((yt_callback) => {
            if (yt_callback.exists === false) return message("Não existe vídeo na URL fornecida.");
            if (yt_callback.duration > (5 * 60)) return message("O vídeo necessita ter menos do que 5 Minutos.");
            services.rooms.addToQueue(info.user_room.name, info.user_account.Username, yt_callback.title, yt_callback.url, yt_callback.duration);
            return message("O vídeo foi adicionado a Queue com sucesso.");
        })
    };

    if (comando === "skip") {
        if (!info.user_room.moderators.includes(info.user_account.Token)) return message("Você não tem permissão para executar esse comando.");
        if (info.user_room.stream.playing.url === "") return message("Nenhum vídeo está sendo reproduzido para ser pulado.");
        services.rooms.skipVideo(info.user_room.name);
        return message("O video foi pulado com sucesso.");
    }

    if (comando === "clear") {
        if (!info.user_room.moderators.includes(info.user_account.Token)) return message("Você não tem permissão para executar esse comando.");
        if (info.user_room.stream.queue.length > 0) {
            services.rooms.clearQueue(info.user_room.name);
            return message(`A fila de vídeos foi limpa com sucesso.`);
        } else {
            return message("A fila de vídeos já está vázia.");
        }
    }

    if (comando === "moderadores") {
        (async function () {
            let moderadores = "";
            for (mod of info.user_room.moderators) {
                const getModAccount = await services.account.getByToken(mod);
                if (getModAccount) moderadores = moderadores + `, <b>${getModAccount.Username}</b>`;
            }

            if (moderadores.length > 0) return message(`Lista dos moderadores da sala: ${moderadores.substring(1, moderadores.length)}`);
            return message(`Essa sala não tem moderadores.`);
        })();
    }

    if (comando === "setmod") {
        (async function () {
            if (info.user_room.owner !== info.user_account.Token) return message("Apenas o criador da sala pode executar esse comando.");
            if (!args[0]) return message("Você necessita escrever o nome do usuário no qual deseja dar permissões de moderador.");
    
            const getUserAccount = await services.account.getByUsername(args[0]);
            if (!getUserAccount) return message("Não existe nenhum usuário com esse nome.");
            if (info.user_room.moderators.includes(getUserAccount.Token)) return message(`O usuário <b>${args[0]}</b> já é moderador.`);

            services.rooms.addMod(info.user_room.name, getUserAccount.Token);
            return message(`O usuário <b>${args[0]}</b> virou moderador da sala.`);
        })();
    }

    if (comando === "unmod") {
        (async function () {
            if (info.user_room.owner !== info.user_account.Token) return message("Apenas o criador da sala pode executar esse comando.");
            if (!args[0]) return message("Você necessita escrever o nome do usuário no qual deseja dar permissões de moderador.");
    
            const getUserAccount = await services.account.getByUsername(args[0]);
            if (!getUserAccount) return message("Não existe nenhum usuário com esse nome.");
            if (getUserAccount.Token === info.user_account.Token) return message("Você não pode remover as suas próprias permissões.");
            if (getUserAccount.Token === info.user_room.owner) return message("Você não pode remover as permissões do criador da sala.");
            if (!info.user_room.moderators.includes(getUserAccount.Token)) return message(`O usuário <b>${args[0]}</b> não é moderador.`);

            services.rooms.removeMod(info.user_room.name, getUserAccount.Token);
            return message(`O usuário <b>${args[0]}</b> teve suas permissões de moderador removidas.`);
        })();
    }
  
    if (comando === "usuarios") {
        (async function () {
            let usuarios = "";
            let total_users = 0;
            let registered_users = 0;
            for (let usuario of info.user_room.users) {
                total_users++;
                const getUserAccount = await services.account.getByToken(usuario.loginSession);
                if (getUserAccount) { usuarios = usuarios + `, ${getUserAccount.Username}`; registered_users++; }
            }

            if (usuarios.length > 0) return message(`Ao total essa sala tem <b>${total_users} Usuários</b>, e desses usuários <b>${total_users - registered_users}</b> não estão logados.<br><br><b>Lista de usuários logados na Sala:</b> ${usuarios.substring(1, usuarios.length)}`);
            return message(`Essa sala não tem usuários.`);
        })();
    }
}