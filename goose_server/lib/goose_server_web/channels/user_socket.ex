defmodule GooseServerWeb.UserSocket do
  use Phoenix.Socket

  channel "lobby", GooseServerWeb.LobbyChannel
  channel "game:*", GooseServerWeb.GameChannel

  @impl true
  def connect(%{"player_id" => player_id} = params, socket, _connect_info) do
    require Logger

    socket =
      socket
      |> assign(:player_id, player_id)
      |> assign(:player_name, Map.get(params, "player_name", player_id))

    Logger.info("connect: #{id(socket)}")

    {:ok, socket}
  end

  def connect(_params, _socket, _connect_info) do
    :error
  end

  @impl true
  def id(socket), do: "player:#{socket.assigns.player_id}"

  # @impl true
  # def terminate(reason, {state, socket}) do
  #   Logger.warning("terminating #{id(socket)} due to #{inspect(reason)}")
  # end
  #
  # @impl true
  # def terminate(reason, state) do
  #   Logger.error("terminating with unexpected state #{inspect(state)} due to #{inspect(reason)}")
  # end
end
