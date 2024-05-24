<template>
    <div>
      hello
      <canvas ref="myCanvas" width="500" height="500" style="border: 1px solid #000000"></canvas>
      <br>
      ID: {{ userData }}
      <!-- ID: {{ userData !== null ? UserData.id : "empty" }} -->
      <br />
      <div class="arrow-keys">
        <div class="row">
          <div class="key" @click="userMove('ArrowUp')" id="up"></div>
        </div>
        <div class="row">
          <div class="key" @click="userMove('ArrowLeft')" id="left"></div>
          <div class="key" @click="userMove('ArrowDown')" id="down"></div>
          <div class="key" @click="userMove('ArrowRight')" id="right"></div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue'
  import spriteSheetSrc from '../assets/sprite.png'
  
  export default {
    setup() {
      const myCanvas = ref(null)
      let socket
      let userData = null
      let players = []
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      let p_index = null
  
      const steps = 4
      const spriteSheet = new Image();
      spriteSheet.src = spriteSheetSrc
      const spriteWidth = 56   // Width of each sprite frame
      const spriteHeight = 64  // Height of each sprite frame
      const sheetColumns = 4   // Number of columns in the sprite sheet
      const sheetRows = 4
  
      let frame = 3
      let idleFrame = 0
      let idle_state = true
      let lastkeypressed = 5;
  
      let frameAction = [
        [[3, 1], [2, 1]], //idle_up = 0
        [[3, 0], [2, 0]], //idle_down = 1
        [[3, 2], [2, 2]], //idle_left = 2
        [[0, 3], [1, 3]], //idle_right = 3
        [[0, 1], [1, 1]], //up = 4
        [[0, 0], [1, 0]], //down = 5
        [[0, 2], [1, 2]], //left = 6
        [[2, 3], [3, 3]], //right = 7
      ]
  
      let AnimationFrames = frameAction[1] // Frame indices for idle animation
      const frameDuration = 500 // Duration to show each frame in milliseconds
      let lastFrameTime = 0
  
      const getContext = () => {
        const canvas = myCanvas.value
        if (canvas) {
          return canvas.getContext('2d')
        } else {
          console.error('Canvas element not found')
          return null
        }
      }
  
      const makeConnection = () => {
        const host = window.location.hostname
        const port = 8000
        socket = new WebSocket(wsProtocol + '://' + host + ':' + port)
        console.log(host + ':' + port)
        socket.onopen = () => {
          console.log('Connected to WebSocket server')
          // alert("connected to ws");
        }
  
        socket.onclose = () => {
          console.log('Disconnected from WebSocket server')
        }
  
        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          // console.log(error);
        }
  
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data)
  
          if (data.action === 'remove_player') {
            // players = JSON.parse(data.users)
            let Userindex = players.findIndex(obj => obj.id === data.id);
            players.splice(Userindex, 1);
  
            p_index = players.findIndex(obj => obj.id === userData.id);
          }
  
          if (data.action === 'all_players') {
            players = JSON.parse(data.users)
            userData = data
            userData.x = data.x
            userData.y = data.y
  
            players.forEach((player, index) => {
              if (player.id === userData.id) {
                p_index = index
                userData = player
                drawAvatar(true, player)
              } else {
                drawAvatar(false, player)
              }
            })
          }
  
          if (data.action === 'new_player') {
            data.action = null
            players.push(data)
            drawAvatar(false, data)
          }
  
          if (data.action === 'player_move') {
            const Playerindex = players.findIndex((obj) => obj.id === data.id)
            if (Playerindex !== -1) {
              players[Playerindex] = data
              moveAvatar(data, Playerindex)
            }
          }
        }
      }
  
      const sendMessage = (message) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(message)
        } else {
          console.error('WebSocket is not open. Ready state:', socket.readyState)
        }
      }
  
      const reDraw = () => {
        const ctx = getContext()
        ctx.clearRect(0, 0, 500, 500)
        players.forEach((player) => {
          // const ctx = getContext()
          if (ctx) {
            // ctx.clearRect(0, 0, 500, 500)
            ctx.drawImage(
              spriteSheet,
              player.sprite_x,
              player.sprite_y,
              spriteWidth,
              spriteHeight,
              player.x,
              player.y,
              spriteWidth,
              spriteHeight
            );
          }
          player.ctx = ctx
        })
      }
  
      const drawAvatar = (renderSelf, player, index) => {
        player.frame = [3,0]
        player.sprite_x = player.frame[0] * spriteWidth
        player.sprite_y = player.frame[1] * spriteHeight
        player.idleFrame = 0
        player.idle_state = true
        player.lastkeypressed = 5
        player.lastFrameTime = 0
        player.AnimationFrames = frameAction[1]
        const ctx = getContext()
        if (ctx) {
          // ctx.clearRect(0, 0, 500, 500)
          ctx.drawImage(
            spriteSheet,
            player.sprite_x, // x position of the frame
            player.sprite_y, // y position of the frame
            spriteWidth,
            spriteHeight,
            player.x,
            player.y,
            spriteWidth,
            spriteHeight
          );
        }
        player.ctx = ctx
        player.animate = (timestamp) => {
          if (timestamp - player.lastFrameTime >= 500) {
            player.idleFrame = (player.idleFrame + 1) % player.AnimationFrames.length
            player.lastFrameTime = timestamp
            player.AnimationFrames = player.idle_state ? frameAction[player.lastkeypressed - 4] : frameAction[player.lastkeypressed]
            player.frame = player.AnimationFrames[player.idleFrame]
            player.sprite_x = player.frame[0] * spriteWidth
            player.sprite_y = player.frame[1] * spriteHeight
            reDraw()
          }
          requestAnimationFrame(player.animate)
        }
        player.animate()
      }
  
      const userMove = (direction) => {
        const index = players.findIndex((obj) => obj.id === userData.id)
        if (index !== -1) {
          players[index].sprite_x = players[index].frame[0] * spriteWidth
          players[index].sprite_y = players[index].frame[1] * spriteHeight
  
          if (direction === 'ArrowUp') {
            players[index].y -= steps
          }
          if (direction === 'ArrowDown') {
            players[index].y += steps
          }
          if (direction === 'ArrowLeft') {
            players[index].x -= steps
          }
          if (direction === 'ArrowRight') {
            players[index].x += steps
          }
  
          reDraw()
  
          players[index].ctx.drawImage(
            spriteSheet,
            players[index].sprite_x,
            players[index].sprite_y,
            spriteWidth,
            spriteHeight,
            players[index].x,
            players[index].y,
            spriteWidth,
            spriteHeight
          );
  
          players[index].action = 'move'
          sendMessage(JSON.stringify(players[index]))
          players[index].action = null
        }
      }
  
      const animate = (timestamp) => {
        // if (timestamp - lastFrameTime >= frameDuration) {
        //   console.log("animate");
        //   idleFrame = (idleFrame + 1) % AnimationFrames.length
        //   lastFrameTime = timestamp
        //   AnimationFrames = idle_state ? frameAction[lastkeypressed - 4] : frameAction[lastkeypressed]
        //   frame = AnimationFrames[idleFrame]
        //   reDraw()
        // }
        // requestAnimationFrame(animate)
      }
  
      document.addEventListener('keyup', (event) => {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
          players[p_index].idle_state = true;
        }
      })
  
      document.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'ArrowUp':
            players[p_index].lastkeypressed = 4
            players[p_index].idle_state = false
            userMove(event.key)
            break
          case 'ArrowDown':
            players[p_index].lastkeypressed = 5
            players[p_index].idle_state = false
            userMove(event.key)
            break
          case 'ArrowLeft':
            players[p_index].lastkeypressed = 6
            players[p_index].idle_state = false
            userMove(event.key)
            break
          case 'ArrowRight':
            players[p_index].lastkeypressed = 7
            players[p_index].idle_state = false
            userMove(event.key)
            break
            
        }
      })
  
      const moveAvatar = (player, index) => {
        players[index].x = player.x
        players[index].y = player.y
        players[index].sprite_x = players[index].frame[0] * spriteWidth
        players[index].sprite_y = players[index].frame[1] * spriteHeight
  
        // players[index].ctx.clearRect(0, 0, 500, 500)
        reDraw()
  
        players[index].ctx.drawImage(
          spriteSheet,
          players[index].sprite_x * spriteWidth,
          players[index].sprite_y * spriteHeight,
          spriteWidth,
          spriteHeight,
          players[index].x,
          players[index].y,
          spriteWidth,
          spriteHeight
        );
  
        players[index].action = 'move'
        // sendMessage(JSON.stringify(players[index]));
        players[index].action = null
      }
  
      onMounted(() => {
        makeConnection()
        animate()
      })
  
      return {
        myCanvas,
        drawAvatar,
        socket,
        players,
        userMove,
        reDraw,
        getContext,
        userData
      }
    }
  }
  </script>
  
  <style scoped>
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: #333;
    font-family: "Arial", sans-serif;
  }
  
  .arrow-keys {
    display: inline-block;
    text-align: center;
  }
  
  .row {
    display: flex;
    justify-content: center;
  }
  
  .key {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    margin: 5px;
    border: 2px solid #fff;
    border-radius: 10px;
    background-color: #555;
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s;
  }
  
  .key:hover {
    background-color: #777;
  }
  
  .key:active {
    background-color: #999;
    transform: scale(0.95);
  }
  
  .key#up::after {
    content: "▲";
  }
  
  .key#left::after {
    content: "◄";
  }
  
  .key#down::after {
    content: "▼";
  }
  
  .key#right::after {
    content: "►";
  }
  </style>
  