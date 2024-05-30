<template>
  <div>
    <div class="canvas-container">
      <canvas ref="map" id="map" class="canvas1" width="500" height="500" style="border: 1px solid red"></canvas>
      <canvas ref="myCanvas" id="character" width="500" class="canvas2" height="500" style="border: 1px solid #000000"></canvas>
    </div>
    <br>
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
import spriteSheetGrassSrc from '../assets/Grass.png'
import spriteSheetWaterSrc from '../assets/Water.png'

export default {
  setup() {
    let myCanvas = ref(null)
    let mapCanvas = ref(null)

    let socket
    let userData = null
    let players = []
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    let pIndex = null

    const steps = 4
    const spriteSheet = new Image();
    spriteSheet.src = spriteSheetSrc
    const spriteSheetGrass = new Image();
    spriteSheetGrass.src = spriteSheetGrassSrc
    const spriteSheetWater = new Image();
    spriteSheetWater.src = spriteSheetWaterSrc
    const spriteWidth = 56   // Width of each sprite frame
    const spriteHeight = 64  // Height of each sprite frame

    var map = {
      cols: 16,
      rows: 8,
      tsize: 16,
      tiles: [
        [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        [4, 4, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
        [4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 4],
      ],
      getTile: function (col, row) {
        return this.tiles[row * map.cols + col];
      }
    };

    let tileName = [
      [4, 2, "grass"], //"grass_g" 0
      [3, 1, "grass"], //"edgeLTGrass_g" 1
      [3, 3, "grass"], // "edgeRTGrass_g" 2
      [3, 3, "grass"], // "edgeTGrass_g" 3
      [0, 0, "water"], //"water" 4
      [3, 2, "grass"], //"edgeTGrass_g" 5
      [4, 1, "grass"], //"edgeMLGrass_g" 6
      [4, 3, "grass"], //"edgeMRGrass_g" 7
      [3, 3, "grass"], //"edgeTGrass_g" 
      [3, 3, "grass"], //"edgeTGrass_g" 
      [3, 3, "grass"], //"edgeTGrass_g" 
    ]

    let spritePosition = (p) => {
      return [
        p.frame[0] * spriteWidth,
        p.frame[1] * spriteHeight
      ]
    }

    let sheet = (ss) => {
      return ss == "grass" ? spriteSheetGrass : spriteSheetWater
    }

    const drawMap = () => {
      console.log("hey its working!")
      mapCanvas = document.getElementById("map")
      
      for (let row = 0; row < map.tiles.length; row++) {
        for (let col = 0; col < map.tiles[row].length; col++) {
          const ctx = mapCanvas.getContext('2d');
          console.log("its tiling time")
          // const tile = map.getTile(column, row)
          const x = col * map.tsize // <- 'tsize', not 'tileSize'
          const y = row * map.tsize    // <-
          const tn = tileName[map.tiles[row][col]]
          drawTile(tn, x, y,ctx)
        }
      }
    }

    const drawTile = (tn, X, Y, context) => {
      context.drawImage(
        sheet(tn[2]),
        tn[1] * map.tsize,
        tn[0] * map.tsize,
        map.tsize,
        map.tsize,
        X,
        Y,
        map.tsize,
        map.tsize
      );
      
    }

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

    const makeConnection = () => {
      // const host = 'https://3f18-180-190-218-24.ngrok-free.app/'
      const host = window.location.hostname
      const port = 8000
      socket = new WebSocket(wsProtocol + '://' + host + ':' + port)
      // socket = new WebSocket(wsProtocol + '://' + host) // for deployed app
      console.log(wsProtocol + '://' + host + ':' + port)
      socket.onopen = () => {
        console.log('Connected to WebSocket server')
        drawMap()
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
          let Userindex = players.findIndex(obj => obj.id === data.id);
          players.splice(Userindex, 1);

          pIndex = players.findIndex(obj => obj.id === userData.id);
        }

        if (data.action === 'all_players') {
          players = JSON.parse(data.users)
          userData = data
          userData.x = data.x
          userData.y = data.y

          players.forEach((player, index) => {
            if (player.id === userData.id) {
              pIndex = index
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
          const Playerindex = players.findIndex((obj) => obj.id === data.id)
          drawAvatar(false, players[Playerindex])
        }

        if (data.action === 'player_move') {
          const Playerindex = players.findIndex((obj) => obj.id === data.id)
          if (Playerindex !== -1) {
            moveAvatar(data, players[Playerindex])
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
      myCanvas = document.getElementById("character")
      const ctx = myCanvas.getContext('2d')

      ctx.clearRect(0, 0, 500, 500)
      players.forEach((player) => {
        if (ctx) {
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
      player.frame = [3, 0]
      player.sprite_x = spritePosition(player)[0]
      player.sprite_y = spritePosition(player)[1]
      player.idleFrame = 0
      player.idle_state = true
      player.lastkeypressed = 5
      player.lastFrameTime = 0
      player.AnimationFrames = frameAction[1]
      // const ctx = getContext()
      myCanvas = document.getElementById("character")
      const ctx = myCanvas.getContext('2d');

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
          player.sprite_x = spritePosition(player)[0]
          player.sprite_y = spritePosition(player)[1]

          // if(timestamp - player.lastFrameTime >= 2000){
           player.idle_state = true
          // }
          
          reDraw()
        }
        requestAnimationFrame(player.animate)
      }
      player.animate()
    }

    const userMove = (direction) => {
      const index = players.findIndex((obj) => obj.id === userData.id)
      if (index !== -1) {
        players[index].sprite_x = spritePosition(players[index])[0]
        players[index].sprite_y = spritePosition(players[index])[1]

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

        // players[index].ctx.clearRect(0, 0, 500, 500)
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

    document.addEventListener('keyup', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        players[pIndex].idle_state = true;
      }
    })

    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          players[pIndex].lastkeypressed = 4
          players[pIndex].idle_state = false
          userMove(event.key)
          break
        case 'ArrowDown':
          players[pIndex].lastkeypressed = 5
          players[pIndex].idle_state = false
          userMove(event.key)
          break
        case 'ArrowLeft':
          players[pIndex].lastkeypressed = 6
          players[pIndex].idle_state = false
          userMove(event.key)
          break
        case 'ArrowRight':
          players[pIndex].lastkeypressed = 7
          players[pIndex].idle_state = false
          userMove(event.key)
          break

      }
    })

    const moveAvatar = (data, player) => {
      player.x = data.x
      player.y = data.y
      player.sprite_x = spritePosition(data)[0]
      player.sprite_y = spritePosition(data)[1]
      player.lastkeypressed = data.lastkeypressed
      console.log("moveavatar", data)
      //temp
      player.idle_state = data.idle_state


      reDraw()
      

      player.ctx.drawImage(
        spriteSheet,
        spritePosition(player)[0],
        spritePosition(player)[1],
        spriteWidth,
        spriteHeight,
        player.x,
        player.y,
        spriteWidth,
        spriteHeight
      );

      player.action = 'move'
      player.action = null
    }

    onMounted(() => {
      makeConnection()
      
      // console.log("mapcanvas", mapCanvas)
      // animate()
    })

    return {
      myCanvas,
      mapCanvas,
      drawAvatar,
      socket,
      players,
      userMove,
      reDraw,
      // getContext,
      userData,
      drawMap
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

.canvas-container {
  position: relative;
  width: 500px;
  /* adjust as needed */
  height: 500px;
  /* adjust as needed */
}

/* .canvas1 {
  position: absolute;
  top: 0;
  left: 0;
} */

.canvas1, .canvas2 {
  position: absolute;
  top: 0;
  left: 0;
}


.canvas1 {
  z-index: 1;
}

.canvas2 {
  z-index: 2;
}
</style>