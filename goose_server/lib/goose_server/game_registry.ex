defmodule GooseServer.GameRegistry do
  use Agent
  require Logger

  def start_link(_opts) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def create_game(creator_id, name) do
    Logger.info("creator_id: #{creator_id} made game #{name}")
    game_id = generate_id()

    game = %{
      id: game_id,
      name: name,
      creator_id: creator_id,
      created_at: DateTime.utc_now(),
      state: :open,
      players: MapSet.new()
    }

    Agent.update(__MODULE__, &Map.put(&1, game_id, game))
    game
  end

  def list_games do
    Agent.get(__MODULE__, &Map.values/1)
  end

  def list_open_games do
    Agent.get(__MODULE__, fn games ->
      games
      |> Map.values()
      |> Enum.filter(&(&1.state == :open))
      |> Enum.map(&public_view/1)
    end)
  end

  @doc """
  Returns the JSON-safe subset of a game suitable for sending to clients.
  Strips internal fields like the players MapSet (which Jason can't encode)
  and the state atom — clients only need the identifier, name, and metadata.
  """
  def public_view(game) do
    Map.take(game, [:id, :name, :creator_id, :created_at])
  end

  def get_game(game_id) do
    Agent.get(__MODULE__, &Map.get(&1, game_id))
  end

  def delete_game(game_id) do
    Logger.warning("game #{game_id} deleted")
    Agent.update(__MODULE__, &Map.delete(&1, game_id))
  end

  def game_exists?(game_id) do
    Agent.get(__MODULE__, &Map.has_key?(&1, game_id))
  end

  @doc """
  Atomically attempts to add a player to a game.

  Returns `{:ok, game}` if the player was added (or was already a member —
  rejoining is idempotent so a Lobby→Startup handoff doesn't fail).
  Returns `{:error, :not_open}` if the game exists but is not in `:open` state
  AND the player is not already a member.
  Returns `{:error, :not_found}` if the game does not exist.
  """
  def try_add_player(game_id, player_id) do
    Agent.get_and_update(__MODULE__, fn games ->
      case Map.fetch(games, game_id) do
        :error ->
          {{:error, :not_found}, games}

        {:ok, game} ->
          cond do
            MapSet.member?(game.players, player_id) ->
              {{:ok, game}, games}

            game.state == :open ->
              updated = %{game | players: MapSet.put(game.players, player_id)}
              {{:ok, updated}, Map.put(games, game_id, updated)}

            true ->
              {{:error, :not_open}, games}
          end
      end
    end)
  end

  @doc """
  Atomically removes a player from a game. If the resulting player set is
  empty, the game is deleted in the same operation.

  Returns `{:deleted, game_id}` if the game was deleted (last player left).
  Returns `{:remaining, count}` if other players remain.
  Returns `{:error, :not_found}` if the game does not exist.
  """
  def remove_player(game_id, player_id) do
    Agent.get_and_update(__MODULE__, fn games ->
      case Map.fetch(games, game_id) do
        :error ->
          {{:error, :not_found}, games}

        {:ok, game} ->
          remaining = MapSet.delete(game.players, player_id)

          if MapSet.size(remaining) == 0 do
            Logger.warning("game #{game_id} deleted (last player left)")
            {{:deleted, game_id}, Map.delete(games, game_id)}
          else
            updated = %{game | players: remaining}
            {{:remaining, MapSet.size(remaining)}, Map.put(games, game_id, updated)}
          end
      end
    end)
  end

  @doc """
  Atomically transitions a game from `from` state to `to` state.

  Returns `:ok` on a successful transition.
  Returns `{:error, :wrong_state}` if the game is not currently in `from`
  (which makes the call idempotent — repeated transitions are no-ops).
  Returns `{:error, :not_found}` if the game does not exist.
  """
  def transition_state(game_id, from, to) do
    Agent.get_and_update(__MODULE__, fn games ->
      case Map.fetch(games, game_id) do
        :error ->
          {{:error, :not_found}, games}

        {:ok, %{state: ^from} = game} ->
          updated = %{game | state: to}
          Logger.info("game #{game_id} state #{from} -> #{to}")
          {:ok, Map.put(games, game_id, updated)}

        {:ok, _other} ->
          {{:error, :wrong_state}, games}
      end
    end)
  end

  def clear do
    Logger.warning("games cleared")
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  defp generate_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false)
  end
end
