defmodule GooseServerWeb.GameChannelTest do
  use GooseServerWeb.ChannelCase

  alias GooseServerWeb.UserSocket
  alias GooseServer.GameRegistry

  setup do
    game = GameRegistry.create_game("creator", "Test Race")
    {:ok, socket} = connect(UserSocket, %{"player_id" => "player1"})
    {:ok, game: game, socket: socket}
  end

  describe "join" do
    test "player can join an existing game", %{socket: socket, game: game} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "game:#{game.id}", %{})
      assert_push "presence_state", %{}
    end

    test "player cannot join a non-existent game", %{socket: socket} do
      assert {:error, %{reason: "game not found"}} =
               subscribe_and_join(socket, "game:nonexistent", %{})
    end

    test "player appears in game presence after joining", %{socket: socket, game: game} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "game:#{game.id}", %{})
      assert_push "presence_state", presence
      assert Map.has_key?(presence, "player1")
    end

    test "presence diff is broadcast when player joins game", %{socket: socket, game: game} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "game:#{game.id}", %{})
      assert_broadcast "presence_diff", %{joins: %{"player1" => _}}
    end

    test "presence includes player_name metadata", %{game: game} do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "alice1"})

      {:ok, _reply, _socket} =
        subscribe_and_join(socket, "game:#{game.id}", %{"player_name" => "Alice"})

      assert_push "presence_state", presence

      assert %{"alice1" => %{metas: [meta | _]}} = presence
      assert meta.player_name == "Alice"
    end
  end

  describe "position_update" do
    test "broadcasts progress to other players", %{game: game} do
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "alice"})
      {:ok, _reply, socket1} = subscribe_and_join(socket1, "game:#{game.id}", %{})

      push(socket1, "position_update", %{"progress" => 0.5})
      assert_broadcast "position_update", %{player_id: "alice", progress: 0.5}
    end

    test "includes correct player_id in broadcast", %{game: game} do
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "bob"})
      {:ok, _reply, socket1} = subscribe_and_join(socket1, "game:#{game.id}", %{})

      push(socket1, "position_update", %{"progress" => 0.75})
      assert_broadcast "position_update", payload
      assert payload.player_id == "bob"
      assert payload.progress == 0.75
    end

    test "handles zero progress", %{socket: socket, game: game} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      push(socket, "position_update", %{"progress" => 0.0})
      assert_broadcast "position_update", %{progress: progress}
      assert progress == 0.0
    end

    test "handles full progress", %{socket: socket, game: game} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      push(socket, "position_update", %{"progress" => 1.0})
      assert_broadcast "position_update", %{progress: 1.0}
    end
  end

  describe "start_game" do
    test "creator can start the game", %{game: game} do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "creator"})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      push(socket, "start_game", %{})
      assert_broadcast "game_started", %{}
    end

    test "non-creator cannot start the game", %{socket: socket, game: game} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      ref = push(socket, "start_game", %{})
      assert_reply ref, :error, %{reason: "only the creator can start the game"}
    end

    test "game_started broadcast reaches all players in game", %{game: game} do
      {:ok, creator_socket} = connect(UserSocket, %{"player_id" => "creator"})
      {:ok, _reply, creator_socket} = subscribe_and_join(creator_socket, "game:#{game.id}", %{})

      {:ok, player_socket} = connect(UserSocket, %{"player_id" => "player2"})
      {:ok, _reply, _player_socket} = subscribe_and_join(player_socket, "game:#{game.id}", %{})

      push(creator_socket, "start_game", %{})
      assert_broadcast "game_started", %{}
    end
  end

  describe "terminate (delete on empty)" do
    test "game stays alive when one of multiple players leaves", %{game: game} do
      {:ok, creator_socket} = connect(UserSocket, %{"player_id" => "creator"})
      {:ok, _reply, _creator_socket} = subscribe_and_join(creator_socket, "game:#{game.id}", %{})

      {:ok, player_socket} = connect(UserSocket, %{"player_id" => "player2"})
      {:ok, _reply, player_socket} = subscribe_and_join(player_socket, "game:#{game.id}", %{})

      Process.unlink(player_socket.channel_pid)
      close(player_socket)

      refute_broadcast "game_ended", _
      assert GameRegistry.game_exists?(game.id)
    end

    test "game stays alive when creator leaves but other players remain", %{game: game} do
      {:ok, creator_socket} = connect(UserSocket, %{"player_id" => "creator"})
      {:ok, _reply, creator_socket} = subscribe_and_join(creator_socket, "game:#{game.id}", %{})

      {:ok, player_socket} = connect(UserSocket, %{"player_id" => "player2"})
      {:ok, _reply, _player_socket} = subscribe_and_join(player_socket, "game:#{game.id}", %{})

      Process.unlink(creator_socket.channel_pid)
      close(creator_socket)

      refute_broadcast "game_ended", _
      assert GameRegistry.game_exists?(game.id)
    end

    test "game is deleted and game_ended broadcast when last player leaves", %{
      socket: socket,
      game: game
    } do
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      Process.unlink(socket.channel_pid)
      close(socket)

      assert_broadcast "game_ended", %{reason: "empty"}
      refute GameRegistry.game_exists?(game.id)
    end

    test "game_deleted is broadcast to lobby when last player leaves", %{
      socket: socket,
      game: game
    } do
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      GooseServerWeb.Endpoint.subscribe("lobby")

      Process.unlink(socket.channel_pid)
      close(socket)

      assert_receive %Phoenix.Socket.Broadcast{
        topic: "lobby",
        event: "game_deleted",
        payload: %{id: game_id}
      }

      assert game_id == game.id
    end
  end

  describe "state machine" do
    test "joining a started game is refused", %{game: game} do
      :ok = GameRegistry.transition_state(game.id, :open, :started)

      {:ok, socket} = connect(UserSocket, %{"player_id" => "latecomer"})

      assert {:error, %{reason: "game_not_open"}} =
               subscribe_and_join(socket, "game:#{game.id}", %{})
    end

    test "start_game transitions :open -> :started and broadcasts game_deleted to lobby", %{
      game: game
    } do
      {:ok, creator_socket} = connect(UserSocket, %{"player_id" => "creator"})
      {:ok, _reply, creator_socket} = subscribe_and_join(creator_socket, "game:#{game.id}", %{})

      GooseServerWeb.Endpoint.subscribe("lobby")

      push(creator_socket, "start_game", %{})

      assert_broadcast "game_started", %{}

      assert_receive %Phoenix.Socket.Broadcast{
        topic: "lobby",
        event: "game_deleted",
        payload: %{id: game_id}
      }

      assert game_id == game.id
      assert %{state: :started} = GameRegistry.get_game(game.id)
    end

    test "position_update >= 1.0 transitions :started -> :finished and broadcasts game_finished",
         %{game: game} do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "racer"})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      :ok = GameRegistry.transition_state(game.id, :open, :started)

      push(socket, "position_update", %{"progress" => 1.0})

      assert_broadcast "game_finished", %{winner_id: "racer"}
      assert %{state: :finished} = GameRegistry.get_game(game.id)
    end

    test "second crossing of 1.0 does not re-broadcast game_finished", %{game: game} do
      {:ok, socket} = connect(UserSocket, %{"player_id" => "racer"})
      {:ok, _reply, socket} = subscribe_and_join(socket, "game:#{game.id}", %{})

      :ok = GameRegistry.transition_state(game.id, :open, :started)

      push(socket, "position_update", %{"progress" => 1.0})
      assert_broadcast "game_finished", %{winner_id: "racer"}
      assert %{state: :finished} = GameRegistry.get_game(game.id)

      push(socket, "position_update", %{"progress" => 1.0})
      refute_broadcast "game_finished", _
    end
  end

  describe "list_open_games" do
    test "started games are excluded" do
      open_game = GameRegistry.create_game("alice", "Open Race")
      started_game = GameRegistry.create_game("bob", "Started Race")
      :ok = GameRegistry.transition_state(started_game.id, :open, :started)

      open_games = GameRegistry.list_open_games()

      assert Enum.any?(open_games, &(&1.id == open_game.id))
      refute Enum.any?(open_games, &(&1.id == started_game.id))
    end
  end
end
