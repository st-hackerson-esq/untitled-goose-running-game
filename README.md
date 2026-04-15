# Untitled Goose Running Game

A multiplayer goose racing game built with React Three Fiber and Phoenix.


Players join a lobby, create or join a game, and race their geese by alternating Q and P keys. Goose positions sync in real-time via Phoenix channels. Empty slots are filled with AI geese.

## Prerequisites

- Node.js (v18+)
- Elixir (v1.19+) and Erlang/OTP

## Quick Start

```bash
make setup   # install all dependencies
make dev     # start both servers for development
```

Open http://localhost:3000 to play.

## Development

`make dev` starts both servers in parallel:

- **Frontend** (Next.js) on port 3000 -- hot-reloads on file changes
- **Server** (Phoenix) on port 4000 -- handles WebSocket channels

You can also run them individually:

```bash
make dev.frontend   # just the Next.js dev server
make dev.server     # just the Phoenix server
```

## Production / Deploy

Build the frontend and serve everything from Phoenix on a single port:

```bash
make deploy   # build frontend + copy to Phoenix + digest
make serve    # start Phoenix on port 4000, serves the game at /
```

The `deploy` target:
1. Builds the Next.js app as a static export
2. Copies the output into Phoenix's `priv/static/`
3. Runs `mix phx.digest` for gzip and cache manifests

In production, set these environment variables:

```bash
SECRET_KEY_BASE=<generate with `mix phx.gen.secret`>
PHX_HOST=yourdomain.com
PORT=4000          # optional, defaults to 4000
PHX_SERVER=true    # starts the server on boot
```

## Testing

```bash
make test   # run server tests
```

## Project Structure

```
src/                    # Frontend (React Three Fiber)
  components/           # Scene, GooseRenderer, Lobby, etc.
  core/                 # ECS traits, systems, actions
  lib/                  # Socket and game-socket clients
  pages/                # Next.js page (single page app)
goose_server/           # Backend (Phoenix)
  lib/goose_server_web/ # Channels, controllers, endpoint
  lib/goose_server/     # Game registry
  test/                 # ExUnit tests
```

## Makefile Reference

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies |
| `make dev` | Start frontend + server for development |
| `make build` | Build frontend into Phoenix static |
| `make deploy` | Full production build with digest |
| `make serve` | Start production server (port 4000) |
| `make test` | Run all tests |
| `make clean` | Remove build artifacts |

## BUGS:
- [ ] when a client is refused entry it should go back to a connect screen and not retry forever
- [ ] clients should remove games when they are deleted in real time
- [ ] when a player is in the game waiting room the number of players should be accurate (both on enter and leave)
- [ ] when a game ends, it should be deleted

## TODO:
- [ ] players should need to denote when they are ready before the game can start
