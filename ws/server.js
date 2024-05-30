const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// const wss = new WebSocket.Server({ host: "192.168.254.106", port: 8000 });
const wss = new WebSocket.Server({ port: 8000 });

const clients = new Map();

let users = []
const canvas_width = 500
const canvas_height = 500
const char_width = 56
const char_height = 64

wss.on('connection', (ws) => {
  const userID = uuidv4();
  clients.set(userID, ws);
  console.log(`User connected: ${userID}`);

  let userObject = {
    id: userID,
    x: getRandomNumber(char_width, canvas_width - char_width),
    y: getRandomNumber(char_width, canvas_height - char_height),
    name: 'player',
    type: 'connection',
    action: 'all_players',
    users: null,
  };


  users.push(userObject);

  userObject.users = JSON.stringify(users);
  ws.send(JSON.stringify(userObject));

  userObject.action="new_player";
  userObject.users = null;
  broadcast(userObject);
  userObject.action = null;

  ws.on('close', () => {

    let Userindex = users.findIndex(obj => obj.id === userID);
    if(Userindex !== -1){
      users[Userindex].action = "remove_player"
      broadcast(users[Userindex]);
      users[Userindex].action = null
      users.splice(Userindex, 1);
    }

    clients.delete(userID);
    console.log(`User disconnected: ${userID}`);

    removeUser(userID);
    console.log(users);
  });

  ws.on('message', (d) => {
    let data = JSON.parse(d);
    console.log("On message",data);

    if(data.action == "move"){
      console.log("action", data.action);
      console.log("lastmove", data.lastkeypressed);
      data.action = null;
      updateUserdata(data);
      data.action = "player_move";
      broadcast(data);
      data.action = null;
    }

    console.log(`Received data from ${userID} `);
    console.log(`Action: ${data.action}`);
  });

  console.log(users);
});

function broadcast(data) {
  clients.forEach((client, userID) => {
    console.log("client", userID);
    console.log("data", data.id);
    console.log("datacondition", userID == data.id);
    if (client.readyState === WebSocket.OPEN) {
      if(userID == data.id){
        console.log("Skip Me for Broadcast");
      }
      else{
        console.log("broadcast client");
        client.send(JSON.stringify(data));
      }
    }
  });
}

function updateUserdata(data){
  let Userindex = users.findIndex(obj => obj.id === data.id);
  if(Userindex !== -1){
    console.log("📝📝📝📝")
    users[Userindex] = data;
    console.log("users",users);
  }
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeUser(userID){
  let indexToRemove = users.findIndex(obj => obj.id === userID);
  if (indexToRemove !== -1) {
    let removedObject = users.splice(indexToRemove, 1)[0];
    console.log('User removed');
  } else {
      console.log('User not found ');
  }
}

console.log('WebSocket server is running on ws://'+wss.options.host+':'+wss.options.port);
// console.log(wss);