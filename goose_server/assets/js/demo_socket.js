import {Socket, Presence} from "phoenix"

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("demo-app")
  if (!app) return

  let socket = null
  let lobbyChannel = null
  let gameChannel = null
  let lobbyPresence = null
  let gamePresence = null

  const connectForm = document.getElementById("connect-form")
  const playerIdInput = document.getElementById("player-id-input")
  const connectionInfo = document.getElementById("connection-info")
  const connectionStatus = document.getElementById("connection-status")
  const lobbyPanel = document.getElementById("lobby-panel")
  const lobbyPlayers = document.getElementById("lobby-players")
  const createGameForm = document.getElementById("create-game-form")
  const gameNameInput = document.getElementById("game-name-input")
  const gamesList = document.getElementById("games-list")
  const gamePanel = document.getElementById("game-panel")
  const gameTitle = document.getElementById("game-title")
  const gamePlayers = document.getElementById("game-players")
  const gameMessages = document.getElementById("game-messages")
  const sendMsgForm = document.getElementById("send-msg-form")
  const msgInput = document.getElementById("msg-input")
  const eventLog = document.getElementById("event-log")

  function log(msg) {
    const div = document.createElement("div")
    const time = new Date().toLocaleTimeString()
    div.textContent = `[${time}] ${msg}`
    eventLog.appendChild(div)
    eventLog.scrollTop = eventLog.scrollHeight
  }

  function escapeHtml(str) {
    const el = document.createElement("span")
    el.textContent = str
    return el.innerHTML
  }

  function renderPresenceList(presence, el) {
    const players = presence.list((id, _pres) => id)
    if (players.length === 0) {
      el.innerHTML = '<li class="text-base-content/50 italic text-sm">None</li>'
    } else {
      el.innerHTML = players
        .map(id => `<li class="py-1 px-3 rounded-lg bg-base-300 text-sm font-medium">${escapeHtml(id)}</li>`)
        .join("")
    }
  }

  function refreshGames() {
    if (!lobbyChannel) return
    lobbyChannel
      .push("list_games", {})
      .receive("ok", ({games}) => renderGames(games))
  }

  function renderGames(games) {
    if (games.length === 0) {
      gamesList.innerHTML = '<p class="text-base-content/50 italic text-sm">No games yet. Create one above.</p>'
      return
    }
    gamesList.innerHTML = games
      .map(
        game => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-base-300">
        <div>
          <span class="font-semibold">${escapeHtml(game.name)}</span>
          <span class="text-xs text-base-content/50 ml-2">by ${escapeHtml(game.creator_id)}</span>
        </div>
        <button class="btn btn-sm btn-primary join-game-btn"
                data-game-id="${game.id}"
                data-game-name="${escapeHtml(game.name)}">
          Join
        </button>
      </div>`
      )
      .join("")

    gamesList.querySelectorAll(".join-game-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        joinGame(btn.dataset.gameId, btn.dataset.gameName)
      })
    })
  }

  function joinGame(gameId, gameName) {
    if (gameChannel) {
      gameChannel.leave()
      gameMessages.innerHTML = ""
    }

    gameChannel = socket.channel(`game:${gameId}`, {})
    gamePresence = new Presence(gameChannel)
    gamePresence.onSync(() => renderPresenceList(gamePresence, gamePlayers))

    gameChannel.on("new_msg", ({player_id, body}) => {
      const div = document.createElement("div")
      div.className = "py-0.5"
      div.innerHTML = `<span class="font-semibold text-primary">${escapeHtml(player_id)}</span>: ${escapeHtml(body)}`
      gameMessages.appendChild(div)
      gameMessages.scrollTop = gameMessages.scrollHeight
    })

    gameChannel
      .join()
      .receive("ok", () => {
        log(`Joined game "${gameName}"`)
        gameTitle.textContent = gameName
        gamePanel.classList.remove("hidden")
      })
      .receive("error", resp => {
        log(`Failed to join game: ${resp.reason || JSON.stringify(resp)}`)
      })
  }

  // Connect
  connectForm.addEventListener("submit", e => {
    e.preventDefault()
    const playerId = playerIdInput.value.trim()
    if (!playerId) return

    socket = new Socket("/socket", {params: {player_id: playerId}})
    socket.connect()

    log(`Connected as "${playerId}"`)
    connectForm.classList.add("hidden")
    connectionStatus.textContent = playerId
    connectionInfo.classList.remove("hidden")
    lobbyPanel.classList.remove("hidden")

    // Join lobby
    lobbyChannel = socket.channel("lobby", {})
    lobbyPresence = new Presence(lobbyChannel)
    lobbyPresence.onSync(() => renderPresenceList(lobbyPresence, lobbyPlayers))

    lobbyChannel.on("game_created", game => {
      log(`Game created: "${game.name}" by ${game.creator_id}`)
      refreshGames()
    })

    lobbyChannel
      .join()
      .receive("ok", () => {
        log("Joined lobby")
        refreshGames()
      })
      .receive("error", resp => {
        log(`Failed to join lobby: ${JSON.stringify(resp)}`)
      })
  })

  // Create game
  createGameForm.addEventListener("submit", e => {
    e.preventDefault()
    const name = gameNameInput.value.trim()
    if (!name || !lobbyChannel) return

    lobbyChannel
      .push("create_game", {name})
      .receive("ok", game => {
        log(`Created game "${game.name}" (id: ${game.id})`)
        gameNameInput.value = ""
      })
  })

  // Send message
  sendMsgForm.addEventListener("submit", e => {
    e.preventDefault()
    const body = msgInput.value.trim()
    if (!body || !gameChannel) return

    gameChannel.push("new_msg", {body})
    msgInput.value = ""
  })
})
