const path = require('path');
const compression = require('compression')
const mongoose = require("mongoose");
const express = require('express');
const WebSocket = require('ws');

const app = express();
app.use(compression(), express.static(path.join(__dirname, 'public')));

const server = app.listen(8080, () => console.log('Servidor Inicializado.'));
const wss = new WebSocket.Server({ server });

mongoose.connect(process.env.mongoose, { useNewUrlParser: true, useUnifiedTopology: true });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
        data = JSON.parse(data.toString());
        if (data.token && data.service && data.sub_service && data.content) {
            if (data.service === "account") return require("./services/account").run(ws, data);
            if (data.service === "main") return require("./services/main").run(ws, data);
            if (data.service === "webchat") return require("./services/webchat").run(ws, data);
        } else return ws.send(JSON.stringify({ status: 400, error: 'Input de Dados inválidos.' }))
    } catch (invalid_input) {
        return ws.send(JSON.stringify({ status: 400, error: 'Input de Dados inválidos.' }))
    };
  });
  
  ws.on('close', () => {
    require("./services/background/room").removeInativeUsers();
  });
});