const scheme = require("../schemes/accounts")

const blocked_names = require("../security/blocked_names.json")

exports.run = async (ws, data) => {
    if (["login", "register"].includes(data.sub_service)) {
        if (!data.content.username) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Nome de Usuário inválido.", text_color: "red", content: {} }))
        if ((data.content.username).replaceAll(" ", "") === "") return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Nome de Usuário inválido.", text_color: "red", content: {} }))
        if ((data.content.username).replaceAll(" ", "_").length < 4) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "O nome de usuário necessita ter mais do que 4 Caracteres.", text_color: "red", content: {} }))
        if (!data.content.password) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Senha inválida.", text_color: "red", content: {} }))
        if ((data.content.password).replaceAll(" ", "") === "") return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Senha inválida.", text_color: "red", content: {} }))
        if (data.sub_service === "login") {
            const db_data = await scheme.findOne({ Username: (data.content.username).toLowerCase() });
            if (!db_data) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Não existe nenhuma conta com esse nome.", text_color: "red", content: {} }))
            if (db_data.Password !== (data.content.password)) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Senha incorreta.", text_color: "red", content: {} }))
            return ws.send(JSON.stringify({ token: data.token, status: 200, content: { security_token: db_data.Token } }))
        } else if (data.sub_service === "register") {
            if ((data.content.password) !== (data.content.confirm_password)) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "As senhas não são iguais.", text_color: "red", content: {} }))
            const db_data = await scheme.findOne({ Username: (data.content.username).toLowerCase() });
            if (db_data) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Já existe uma conta com esse nome.", text_color: "red", content: {} }))

            const regex_pattern = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/
            if (regex_pattern.test((data.content.username).toLowerCase())) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Você não pode utilizar caracteres especiais no nome.", text_color: "red", content: {} }))
            if (blocked_names.includes((data.content.username).toLowerCase())) return ws.send(JSON.stringify({ token: data.token, status: 400, text_message: "Esse nome foi bloqueado por motivos de segurança.", text_color: "red", content: {} }))

            require('crypto').randomBytes(48, function(err, buffer) {
                let create = new scheme({ Username: (data.content.username).toLowerCase(), Password: data.content.password, Token: buffer.toString('hex') })
                create.save();
                return ws.send(JSON.stringify({ token: data.token, status: 200, content: { security_token: buffer.toString('hex') } }))
            });
        }
    };

    if (data.sub_service === "authentication") {
        const dbData = await scheme.findOne({ Token: data.content });
        if (!dbData) return ws.send(JSON.stringify({ token: data.token, status: 400 }));

        const callback = {
            username: dbData.Username
        };

        return ws.send(JSON.stringify({ token: data.token, status: 200, content: callback }));
    }
};

exports.getByUsername = async (username) => {
    const dbData = await scheme.findOne({ Username: username });
    return dbData;
}

exports.getByToken = async (token) => {
    const dbData = await scheme.findOne({ Token: token });
    return dbData;
}