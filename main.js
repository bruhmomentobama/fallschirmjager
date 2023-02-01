let audio = new Audio()
let gun = new Audio()
let lose = new Audio()
let win = new Audio()
// CONSTANTS
const FPS = 60
const LOOP_INTERVAL = Math.round(1000 / FPS)
const $gameScreen = $('#game-screen')
const $startBTN = $('#startButton')
const $troopCount = $('#troopCount')
const $enemyCount = $('#enemyCount')

// Game Loop
const GAME_WIDTH = 1000
const GAME_HEIGHT = 500
let playerTroops = [], computerTroops = [], playerTroopsTBR = [], computerTroopsTBR = []
let gameLoop, gameHasStarted

// Character
const ACCEPTED_KEYS = ['1', '2', '3']
const CHARACTER_VELOCITY = 5
const MIDDLE_POSITION = { x: $('#character').position().left, y: $('#character').position().top }
let character = {
  $elem: $('#character'),
  position: { ...MIDDLE_POSITION },
  controls: { up: false, down: false, spawn: false },
  troopSelection: '1'
}

// PlayerHealth
const PLAYER_HP_GEN_TIME = 10000
let player = {
  $elem: $('#playerHealth'),
  health: null,
  prevGenTime: null
}

// EnemyHealth
const ENEMY_HP_GEN_TIME = 10000
const ENEMY_SPEED = 0.7
let enemy = {
  $elem: $('#enemyHealth'),
  health: null,
  prevGenTime: null,
  prevEnemySpawnTime: null,
  speed: ENEMY_SPEED,
  deadCounter: 0,
  spawnTime: 5000,
}

// Money
const MONEY_GEN_TIME = 500
let money = {
  $elem: $('#moneyBalance'),
  balance: 120,
  prevGenTime: null
}

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

const generateRandomID = () => {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9)
}

const generateRandomHP = (maxHealth) => {
  return maxHealth > 5 ? getRandomInt(10, maxHealth) : alert(`Health must be greater than 5`)
}

const getRandomArbitrary = (min, max) => {
  return Math.random() * (max - min) + min;
}
const generator = (obj, key, GEN_TIME) => {
  const currTime = new Date().getTime()
  const timeDiff = currTime - (obj.prevGenTime || 0)

  if (gameHasStarted && timeDiff >= GEN_TIME && obj[key] < 100) {
    const increment = 1
    obj[key] = obj[key] + increment
    obj.prevGenTime = currTime
    obj.$elem.text(`${obj[key]}`)
  }
}

const updateCharacterMovements = () => {
  // Every time this gets invoked, update character position
  const { $elem, position: { y }, controls: { up, down } } = character
  const characterHeight = $elem.height()
  let newY = y

  if (up) newY = y - CHARACTER_VELOCITY < 0 ? 0 : newY - CHARACTER_VELOCITY
  if (down) newY = y + characterHeight + CHARACTER_VELOCITY > GAME_HEIGHT ? GAME_HEIGHT - characterHeight : newY + CHARACTER_VELOCITY

  character.position.y = newY
  character.$elem.css('top', newY)
}

const displayCost = (cost) => {
  const messageDiv = `<div id="message" style="display:none; z-index: 9">-€${cost}</div>`
  $(messageDiv).appendTo($gameScreen).fadeIn(300).fadeOut(1500, function() {
    $("#message").remove()
  })
}

const displayCantAfford = (amount) => {
  const messageDiv = `<div id="message" style="display:none; z-index: 9">Can't afford. Need €${amount} more.</div>`
  $(messageDiv).appendTo($gameScreen).fadeIn(300).fadeOut(2500, function() {
    $("#message").remove()
  })
}

// Set progress bar widths
const setEnemyHealth = (amount) => {
  $("#enemyHealthBar").css('width', amount + '%')
}

const setPlayerHealth = (amount) => {
  $("#playerHealthBar").css('width', amount + '%')
}

const generateCharacterMinion = (size = 50, left = 0, top = 0, id = '', health = 0, troop = '') => {
  //Generate Troop
  return `
    <div
      id="${id}"
      class="${troop} minion"
      style="width:${size}px; height:${size}px; left:${left}px; top:${top}px;"
    ></div>
  `
}

const spawnCharacterMinions = () => {
  const { position: { x, y }, troopSelection, controls: { spawn } } = character

  if (spawn) {
    const randomID = generateRandomID()
    let health, troopType, speed, size, cost
    gun = new Audio('./sound/gun.wav');
    gun.volume = 0.09; gun.play() ;

    switch(troopSelection) {
      case '3': {
        health = generateRandomHP(8)
        troopType = `playerScout`
        speed = 10
        size = 5
        cost = 16
        break
      }
      case '2': {
        health = generateRandomHP(14)
        troopType = `playerTank`
        speed = 6
        size = 15
        cost = 30
        break
      }
      default: {
        health = generateRandomHP(12)
        troopType = `playerFootman`
        speed = 7
        size = 10
        cost = 20
        break
      }
    }

    const newTroop = {
      id: randomID,
      cost,
      health,
      troopType,
      speed,
      $elem: $(generateCharacterMinion(size, x, y, randomID, health, troopType)),
      position: { x: x, y: y }
    }

    if (newTroop.cost <= money.balance) {
      money.balance = money.balance - newTroop.cost
      money.$elem.text(`${money.balance}`)

      newTroop.$elem.appendTo($gameScreen).fadeIn(300)
      playerTroops.push(newTroop)

      $("#message").remove()
      displayCost(newTroop.cost)
    } else {
      const needAmount = newTroop.cost - money.balance
      $("#message").remove()
      displayCantAfford(needAmount)
      gun.pause();
      gun.currentTime = 0;
    }
  }

  character.controls.spawn = false
}

const generateEnemyMinion = (size = 80, right = 0, top = 0, id = '', health = 0, troop = '') => {
  //Generate Enemy
  return `
    <div
      id="${id}"
      class="${troop} minion"
      style="width:${size}px; height:${size}px; right:${right}px; top:${top}px;"
    ></div>
  `
}

const spawnEnemyMinions = () => {
  const currTime = new Date().getTime()
  const timeDiff = currTime - (enemy.prevEnemySpawnTime || 0)

  if (gameHasStarted && timeDiff >= enemy.spawnTime) {
    const randomID = generateRandomID()
    const randomHealth = generateRandomHP(33)

    const x = 0
    const y =  getRandomArbitrary(0, GAME_HEIGHT - 50)
    const troop = `enemyFootman`
    const newEnemy = {
      id: randomID,
      health: randomHealth,
      troopType: troop,
      $elem: $(generateEnemyMinion(90, x, y, randomID, randomHealth, troop)),
      position: { x: x, y: y },
      hit: 0,
      speed: enemy.speed,
    }

    newEnemy.$elem.appendTo($gameScreen).fadeIn(300)
    computerTroops.push(newEnemy)

    enemy.prevEnemySpawnTime = currTime
  }
}

const updateMinionNumber = () => {
  $troopCount.text(`${playerTroops.length}`)
  $enemyCount.text(`${computerTroops.length}`)
}

                            // enemy
const updateMinionMovements = (obj, minions, minionsTBR, direction) => {
  minions.forEach((minion) => {
    const { $elem, position: { x }, speed } = minion
    const width = Number($elem.css('width').replace('px', ''))

    minion.position.x = x + width + speed > GAME_WIDTH ? GAME_WIDTH - width : x + speed
    $elem.css(`${direction}`, `${minion.position.x}px`)

    if (minion.position.x + width >= GAME_WIDTH) {
      // console.log('Remove minion')
      minionsTBR.push(minion)

      obj.health = obj.health - minion.health
      obj.$elem.text(`${obj.health}`)
    }
  })
}

const collisionDetection = () => {
  playerTroops.forEach((pt) => {
    const { $elem: $ptElem, position: { x: ptX, y: ptY }, health: ptHealth } = pt
    const ptWidth = Number($ptElem.css('width').replace('px', ''))
    const ptHeight = Number($ptElem.css('height').replace('px', ''))

    computerTroops.forEach((ct) => {
      const { $elem: $ctElem, position: { x: ctXOriginal, y: ctY }, health: ctHealth } = ct
      const ctWidth = Number($ctElem.css('width').replace('px', ''))
      const ctHeight = Number($ctElem.css('height').replace('px', ''))
      const ctX = GAME_WIDTH - ctXOriginal - ctWidth

      if (ptX < ctX + ctWidth &&
          ptX + ptWidth > ctX &&
          ptY < ctY + ctHeight &&
          ptY + ptHeight > ctY) {
        $ptElem.css('background',)
        $ctElem.css('background',)

        if (ctHealth > ptHealth) {
          console.log(ctHealth, ptHealth)
          const ctRemainingHealth = ctHealth - ptHealth
          ct.health = ctRemainingHealth
          ct.hit = ct.hit + 1

          //setEnemyHealth(enemy.health)
          //console.log(enemy.health)

          playerTroopsTBR.push(pt)
        } else if (ctHealth < ptHealth) {
          const ptRemainingHealth = ptHealth - ctHealth
          pt.health = ptRemainingHealth

          // money.balance = money.balance + ctHealth
          money.balance = money.balance + ctHealth * ptHealth
          money.$elem.text(`${money.balance}`)
          enemy.deadCounter = enemy.deadCounter + 1
          enemy.speed = ENEMY_SPEED + (enemy.deadCounter * 0.4)
          enemy.spawnTime = enemy.spawnTime - 100
          computerTroopsTBR.push(ct)
        } else {
          computerTroopsTBR.push(ct)
          playerTroopsTBR.push(pt)
        }
      }
    })
  })
}

const removeMinions = () => {
  computerTroopsTBR.forEach((ctbr) => {
    const { $elem, id } = ctbr
    const indexLocation = computerTroops.findIndex((minion) => minion.id === id)

    $elem.remove()
    computerTroops.splice(indexLocation, 1)
  })

  playerTroopsTBR.forEach((ptbr) => {
    const { $elem, id } = ptbr
    const indexLocation = playerTroops.findIndex((minion) => minion.id === id)

    $elem.remove()
    playerTroops.splice(indexLocation, 1)
  })

  computerTroopsTBR = []
  playerTroopsTBR = []
}

const displayGameOver = () => {
  const messageDiv = `<div id="message" style="display:none; z-index: 9">Game Over!</div>`
  $(messageDiv).appendTo($gameScreen).fadeIn(400)
}

const displayWin = () => {
  const messageDiv = `<div id="message" style="display:none; z-index: 9">Victory!</div>`
  $(messageDiv).appendTo($gameScreen).fadeIn(500)
}

const checkWinner = () => {
  if (gameHasStarted && (enemy.health <= 0 || player.health <= 0)) {
    $("#message").remove()
    gameHasStarted = false
    clearInterval(gameLoop)
    gameLoop = null
    $startBTN.show()

    if (player.health <= 0) {
      console.log(`GameOver`)
      audio.pause();
      audio.currentTime = 0;
      lose = new Audio('./sound/lose.mp3');
      lose.play();
      lose.volume = 0.2; lose.play() ;
      displayGameOver()
      $startBTN.show().text('RESTART')
    } else {
      console.log(`Victory`)
      audio.pause();
      audio.currentTime = 0;
      win = new Audio('./sound/win.mp3');
      win.play();
      win.volume = 0.2; win.play() ;
      displayWin()
      $startBTN.show().text('RESTART')
    }
  }
}

const update = () => {
  generator(money, 'balance', MONEY_GEN_TIME)
  generator(player, 'health', PLAYER_HP_GEN_TIME)
  generator(enemy, 'health', ENEMY_HP_GEN_TIME)

  updateCharacterMovements()

  spawnCharacterMinions()
  spawnEnemyMinions()
  updateMinionNumber()

  setPlayerHealth(player.health / 100 * 100)
  setEnemyHealth(enemy.health / 100 * 100)

  updateMinionMovements(enemy, playerTroops, playerTroopsTBR, 'left')
  updateMinionMovements(player, computerTroops, computerTroopsTBR, 'right')

  collisionDetection()
  removeMinions()

  checkWinner()
}

const resetData = () => {
  playerTroops = []
  computerTroops = []
  playerTroopsTBR = []
  computerTroopsTBR = []
  character.position = { ...MIDDLE_POSITION }
  player.health =  100
  player.prevGenTime = null
  enemy.health = 150
  enemy.prevGenTime = null
  enemy.speed = ENEMY_SPEED
  money.balance = 120
  money.prevGenTime = null
  enemy.spawnTime = 4000
  lose.pause();
  lose.currentTime = 0;
  win.pause();
  win.currentTime = 0;

}

const clearHtml = () => {
  $('.minion').remove()
  $('#message').remove()
  enemy.$elem.text(`${enemy.health}`)
  player.$elem.text(`${player.health}`)
  money.$elem.text(`${money.balance}`)
}

const startGame = () => {
  if (!gameLoop) {
    console.log(`game started`)
    audio = new Audio('./sound/song.mp3');
    audio.play();
    audio.volume = 0.1; audio.play() ;
    resetData()
    clearHtml()

    $startBTN.hide()
    money.$elem.text(`${money.balance}`)

    gameLoop = setInterval(update, LOOP_INTERVAL)
    gameHasStarted = true
  }
}

const setCharacterControls = (value, keyCode) => {
  // Toggle which direction the character is moving to
  switch (keyCode) {
    case 87:
      character.controls.up = value
      break
    case 83:
      character.controls.down = value
      break
    case 32: {
      startGame()
      character.controls.spawn = value
      break
    }
  }
}

const handleKeyDown = (e) => {
  // Handling Key Down
  setCharacterControls(true, e.keyCode)
}

const handleKeyUp = (e) => {
  // Handling Key Up
  setCharacterControls(false, e.keyCode)
}

const handleTroopSelection = (e) => {
  // Toggle troop selection
  if (ACCEPTED_KEYS.includes(e.key)) {
    $('#troopList').find('.selected').removeClass('selected')

    switch(e.key) {
      case '3': {
        $('#troopList').find(`#playerScout`).addClass('selected')
        break
      }
      case '2': {
        $('#troopList').find(`#playerTank`).addClass('selected')
        break
      }
      default: {
        $('#troopList').find(`#playerFootman`).addClass('selected')
        break
      }
    }

    character.troopSelection = e.key
  }
}

const init = () => {
  $(document).on('keydown', handleKeyDown)
  $(document).on('keyup', handleKeyUp)
  $(document).on('keypress', handleTroopSelection)

  $gameScreen.on('click', '#startButton', startGame)
}

init()
