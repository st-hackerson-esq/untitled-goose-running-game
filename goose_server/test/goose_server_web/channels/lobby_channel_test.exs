defmodule GooseServerWeb.LobbyChannelTest do
  use GooseServerWeb.ChannelCase

  alias GooseServerWeb.UserSocket

  setup do
    {:ok, socket} = connect(UserSocket, %{"player_id" => "player1", "player_name" => "Alice"})
    {:ok, socket: socket}
  end

  describe "join" do
    test "player can join the lobby", %{socket: socket} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "lobby", %{})
      assert_push "presence_state", %{}
    end

    test "player appears in presence after joining", %{socket: socket} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "lobby", %{})
      assert_push "presence_state", presence
      assert Map.has_key?(presence, "player1")
    end

    test "presence diff is broadcast when player joins", %{socket: socket} do
      {:ok, _reply, _socket} = subscribe_and_join(socket, "lobby", %{})
      assert_broadcast "presence_diff", %{joins: %{"player1" => _}}
    end

    test "connection without player_id is rejected" do
      assert :error = connect(UserSocket, %{})
    end

    test "duplicate player_name is rejected" do
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "alice1"})

      {:ok, _reply, _socket1} =
        subscribe_and_join(socket1, "lobby", %{"player_name" => "Alice"})

      {:ok, socket2} = connect(UserSocket, %{"player_id" => "alice2"})

      assert {:error, %{reason: "name_taken"}} =
               subscribe_and_join(socket2, "lobby", %{"player_name" => "Alice"})
    end

    test "different player_names can both join" do
      {:ok, socket1} = connect(UserSocket, %{"player_id" => "alice1"})

      {:ok, _reply, _socket1} =
        subscribe_and_join(socket1, "lobby", %{"player_name" => "Alice"})

      {:ok, socket2} = connect(UserSocket, %{"player_id" => "bob1"})

      {:ok, _reply, _socket2} =
        subscribe_and_join(socket2, "lobby", %{"player_name" => "Bob"})

      assert_push "presence_state", %{}
    end

    test "presence includes player_name metadata", %{socket: socket} do
      {:ok, _reply, _socket} =
        subscribe_and_join(socket, "lobby", %{"player_name" => "Alice"})

      assert_push "presence_state", presence

      assert %{"player1" => %{metas: [meta | _]}} = presence
      assert meta.player_name == "Alice"
    end
  end

  describe "create_game" do
    test "player can create a game and receives it back", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      ref = push(socket, "create_game", %{"name" => "Race 1"})
      assert_reply ref, :ok, game
      assert game.name == "Race 1"
      assert game.creator_id == "player1"
      assert game.id
    end

    test "game creation is broadcast to lobby", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      push(socket, "create_game", %{"name" => "Race 1"})
      assert_broadcast "game_created", %{name: "Race 1", creator_id: "player1"}
    end

    test "multiple games can be created", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      ref = push(socket, "create_game", %{"name" => "Race 1"})
      assert_reply ref, :ok, game1

      ref = push(socket, "create_game", %{"name" => "Race 2"})
      assert_reply ref, :ok, game2

      assert game1.id != game2.id
      assert game1.name == "Race 1"
      assert game2.name == "Race 2"
    end
  end

  describe "list_games" do
    test "returns empty list when no games exist", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      ref = push(socket, "list_games", %{})
      assert_reply ref, :ok, %{games: []}
    end

    test "returns created games", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      ref = push(socket, "create_game", %{"name" => "Race 1"})
      assert_reply ref, :ok, _game

      ref = push(socket, "list_games", %{})
      assert_reply ref, :ok, %{games: games}
      assert length(games) == 1
      assert hd(games).name == "Race 1"
    end

    test "returns multiple games", %{socket: socket} do
      {:ok, _reply, socket} = subscribe_and_join(socket, "lobby", %{})

      ref = push(socket, "create_game", %{"name" => "Race 1"})
      assert_reply ref, :ok, _game

      ref = push(socket, "create_game", %{"name" => "Race 2"})
      assert_reply ref, :ok, _game

      ref = push(socket, "list_games", %{})
      assert_reply ref, :ok, %{games: games}
      assert length(games) == 2

      names = Enum.map(games, & &1.name) |> Enum.sort()
      assert names == ["Race 1", "Race 2"]
    end
  end
end
