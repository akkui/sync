let database = {};

function autoplay(room) {
  if ( database[room].stream.playing.url === "" && database[room].stream.queue.length > 0) {
    const getVideo = database[room].stream.queue[0];
    database[room].stream.queue.shift();
    database[room].stream.playing = { requested_by: getVideo.requested_by, title: getVideo.title, url: getVideo.url, time: 0, max_time: getVideo.max_time };
    
    for (let user of database[room].users) user.ws.send(JSON.stringify({ automatic: true, filters: ["now_playing", "queue_updated"], playing: database[room].stream.playing, queue: database[room].stream.queue }));
    
    function timer() {
      setTimeout(() => {
        if (database[room].stream.playing.time > database[room].stream.playing.max_time - 1) {
          database[room].stream.playing = { requested_by: "", title: "", url: "", time: 0, max_time: 0 };
          autoplay(room);
        } else {
          database[room].stream.playing.time++;
          timer();
        }
      }, 1000);
    }
    timer();
  }
}

exports.getAllDB = () => {
  let recreateDb = database;
  for (const new_db in recreateDb) { recreateDb[new_db].owner = "hidden"; recreateDb[new_db].moderators = ["hidden"]; recreateDb[new_db].users = ["hidden"]; }
  return recreateDb;
};

exports.createRoom = (ws, session, name) => {
  database[name] = {
    name: name,
    owner: `${session}`,
    moderators: [`${session}`],
    users: [{ loginSession: session, ws: ws }],
    stream: {
      playing: {
        requested_by: "",
        title: "",
        url: "",
        time: 0,
        max_time: 0,
      },
      queue: [],
    },
  };
};

exports.updateStream = (user, room, filters) => {
  return user.send(JSON.stringify({ automatic: true, filters: filters, playing: database[room].stream.playing, queue: database[room].stream.queue, }));
};

exports.skipVideo = (room) => {
  database[room].stream.playing = { requested_by: "", title: "", url: "", time: 0, max_time: 0 };
  if (database[room].stream.queue.length > 0) { undefined; } else {
    for (user of database[room].users) user.ws.send(JSON.stringify({ automatic: true, filters: ["now_playing"], playing: database[room].stream.playing, }));
  }
};

exports.clearQueue = (room) => {
  database[room].stream.queue = [];
  for (user of database[room].users) user.ws.send(JSON.stringify({ automatic: true, filters: ["queue_updated"], queue: database[room].stream.queue }));
};

exports.getFromQueue = async (room, queue_id) => {
  let queue_founded = { exists: false, content: undefined };
  for (video of database[room].stream.queue) if (video.queue_id === Number(queue_id)) queue_founded = { exists: true, content: video };
  return queue_founded;
};

exports.addToQueue = (room, user, title, url, max_time) => {
  function generateQueueID() {
    try {
      let generated_value = Math.floor(Math.random() * 1000);
      let already_exist = false;
      for (song of database[room].stream.queue) { if (song.queue_id === generated_value) { already_exist = true; break; } }
      if (already_exist) return generateQueueID();
      return generated_value;
    } catch (error) { undefined; }
  }

  const generate_value = generateQueueID();
  if (generate_value === undefined) return;
  database[room].stream.queue.push({ requested_by: user, title: title, url: url, max_time: max_time, queue_id: generate_value, });
  
  if (database[room].stream.playing.url !== "") {
    for (user of database[room].users) user.ws.send( JSON.stringify({ automatic: true, filters: ["queue_updated"], queue: database[room].stream.queue, }));
  } else {
    autoplay(room);
  }
};

exports.addUser = (room_name, user, loginSession) => {
  database[room_name].users.push({ loginSession: loginSession.Token, ws: user, });
};

exports.get = (room_name) => {
  return database[room_name];
};

exports.addMod = async (room, token) => {
  database[room].moderators.push(token);
};

exports.removeMod = async (room, token) => {
  const index = database[room].moderators.indexOf(token);
  if (index !== -1) { database[room].moderators.splice(index, 1); }
};

exports.removeInativeUsers = () => {
  for (let room in database) database[room].users = database[room].users.filter(user => user.ws._closeFrameReceived === false);
};