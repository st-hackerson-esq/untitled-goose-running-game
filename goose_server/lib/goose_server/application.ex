defmodule GooseServer.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      GooseServerWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:goose_server, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: GooseServer.PubSub},
      # Start a worker by calling: GooseServer.Worker.start_link(arg)
      # {GooseServer.Worker, arg},
      # Start to serve requests, typically the last entry
      GooseServerWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: GooseServer.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    GooseServerWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
