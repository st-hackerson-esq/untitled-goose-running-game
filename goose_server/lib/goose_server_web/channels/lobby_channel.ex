defmodule GooseServerWeb.LobbyChannel do
  use GooseServerWeb, :channel
  require Logger

  alias GooseServerWeb.Presence
  alias GooseServer.GameRegistry

  @impl true
  def join("lobby", _params, socket) do
    player_name = socket.assigns.player_name
    Logger.info("player_name: #{player_name}")

    name_taken =
      "lobby"
      |> Presence.list()
      |> Enum.any?(fn {_id, %{metas: metas}} ->
        Enum.any?(metas, fn meta -> meta[:player_name] == player_name end)
      end)

    if name_taken do
      {:error, %{reason: "name_taken"}}
    else
      send(self(), :after_join)
      {:ok, socket}
    end
  end

  @impl true
  def handle_in("create_game", %{"name" => name}, socket) do
    game = GameRegistry.create_game(socket.assigns.player_id, name)
    broadcast!(socket, "game_created", game)
    {:reply, {:ok, game}, socket}
  end

  @impl true
  def handle_in("list_games", _params, socket) do
    games = GameRegistry.list_games()
    {:reply, {:ok, %{games: games}}, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.player_id, %{
        player_name: socket.assigns.player_name,
        joined_at: System.system_time(:second)
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end
end
