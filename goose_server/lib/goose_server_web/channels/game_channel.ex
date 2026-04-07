defmodule GooseServerWeb.GameChannel do
  use GooseServerWeb, :channel

  alias GooseServerWeb.Presence
  alias GooseServer.GameRegistry

  require Logger

  @impl true
  def join("game:" <> game_id, _params, socket) do
    if GameRegistry.game_exists?(game_id) do
      Logger.warning("player: #{socket.assigns.player_id} admitted into game: #{game_id}")

      {:ok, assign(socket, :game_id, game_id)}
    else
      Logger.warning(
        "player: #{socket.assigns.player_id} denied entry into game: #{game_id} as it didn't exist"
      )

      {:error, %{reason: "game not found"}}
    end
  end

  @impl true
  def handle_in("position_update", %{"progress" => progress}, socket) do
    broadcast_from!(socket, "position_update", %{
      player_id: socket.assigns.player_id,
      progress: progress
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("start_game", _params, socket) do
    player_id = socket.assigns.player_id

    socket.assigns.game_id
    |> GameRegistry.get_game()
    |> then(fn
      nil ->
        {:reply, {:error, %{reason: "game doesn't exist"}}, socket}

      %{creator_id: ^player_id} ->
        broadcast!(socket, "game_started", %{})
        {:noreply, socket}

      %{creator_id: _} ->
        {:reply, {:error, %{reason: "only the creator can start the game"}}, socket}

      unexpected ->
        Logger.warning("unexpected: #{inspect(unexpected)}")
        {:reply, {:error, %{reason: "unexpected"}}, socket}
    end)
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.game_id, %{
        player_name: socket.assigns.player_name,
        joined_at: System.system_time(:second)
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def terminate(reason, socket = %{assigns: %{game_id: game_id, player_name: player_name}}) do
    game = GameRegistry.get_game(game_id)

    if game && game.creator_id == socket.assigns.player_id do
      Logger.warning(
        "game channel terminating du to player leaving. id: #{game_id}, player: #{player_name}, reason: #{inspect(reason)}"
      )

      :ok = GameRegistry.delete_game(game_id)

      GooseServerWeb.Endpoint.broadcast!(
        "game:#{game_id}",
        "game_ended",
        %{reason: "host_left"}
      )
    else
      Logger.info(
        "game channel terminating for other reason. id: #{game_id}, player: #{player_name}, reason: #{inspect(reason)}"
      )
    end

    :ok
  end

  def terminate(_reason, _socket), do: :ok
end
