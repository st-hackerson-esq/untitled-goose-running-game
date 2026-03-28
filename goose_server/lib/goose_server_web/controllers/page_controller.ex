defmodule GooseServerWeb.PageController do
  use GooseServerWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
