defmodule GooseServerWeb.GameChannel do
  use GooseServerWeb, :channel

  alias GooseServerWeb.Presence
  alias GooseServer.GameRegistry

  require Logger

  @impl true
  def join("game:" <> game_id, params, socket) do
    player_name = Map.get(params, "player_name", socket.assigns.player_id)
    player_id = socket.assigns.player_id

    case GameRegistry.try_add_player(game_id, player_id) do
      {:ok, _game} ->
        Logger.warning("player: #{player_id} admitted into game: #{game_id}")

        socket =
          socket
          |> assign(:game_id, game_id)
          |> assign(:player_name, player_name)

        send(self(), :after_join)
        {:ok, socket}

      {:error, :not_open} ->
        Logger.warning(
          "player: #{player_id} denied entry into game: #{game_id} (state is not :open)"
        )

        {:error, %{reason: "game_not_open"}}

      {:error, :not_found} ->
        Logger.warning(
          "player: #{player_id} denied entry into game: #{game_id} as it didn't exist"
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

    if progress >= 1.0 do
      case GameRegistry.transition_state(socket.assigns.game_id, :started, :finished) do
        :ok ->
          broadcast!(socket, "game_finished", %{winner_id: socket.assigns.player_id})

        {:error, _} ->
          :ok
      end
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("start_game", _params, socket) do
    player_id = socket.assigns.player_id
    game_id = socket.assigns.game_id

    game_id
    |> GameRegistry.get_game()
    |> then(fn
      nil ->
        {:reply, {:error, %{reason: "game doesn't exist"}}, socket}

      %{creator_id: ^player_id} ->
        case GameRegistry.transition_state(game_id, :open, :started) do
          :ok ->
            broadcast!(socket, "game_started", %{})
            GooseServerWeb.Endpoint.broadcast!("lobby", "game_deleted", %{id: game_id})
            {:noreply, socket}

          {:error, :wrong_state} ->
            {:noreply, socket}

          {:error, :not_found} ->
            {:reply, {:error, %{reason: "game doesn't exist"}}, socket}
        end

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
      Presence.track(socket, socket.assigns.player_id, %{
        player_name: socket.assigns.player_name,
        joined_at: System.system_time(:second)
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def terminate(reason, %{assigns: %{game_id: game_id, player_id: player_id}} = socket) do
    player_name = Map.get(socket.assigns, :player_name, player_id)

    Logger.info(
      "game channel terminating. id: #{game_id}, player: #{player_name}, reason: #{inspect(reason)}"
    )

    case GameRegistry.remove_player(game_id, player_id) do
      {:deleted, ^game_id} ->
        GooseServerWeb.Endpoint.broadcast!("lobby", "game_deleted", %{id: game_id})

        GooseServerWeb.Endpoint.broadcast!(
          "game:" <> game_id,
          "game_ended",
          %{reason: "empty"}
        )

      {:remaining, _count} ->
        :ok

      {:error, :not_found} ->
        :ok
    end

    :ok
  end

  def terminate(_reason, _socket), do: :ok
end
