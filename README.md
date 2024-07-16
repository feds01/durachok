# Durachok

![Durachok Game table](./docs/table.png "Table")

This is the repository that contains the sources to the Durachok game server, game client and the 
library that is shared between the two.

## Structure

The repository is structured as follows:

- `packages/web` - The client for the game, A React application that serves as the client for the game.
  
- `packages/server` - The server for the game, A Node.js application that serves as the server for the game.

- `packages/shared` - The shared library for the game, A TypeScript library that contains the shared code between the client and the server.
