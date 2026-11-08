# Bots

A bot plays Durachok the way a person does through the web app: it joins a lobby with the
same request, connects with the same `LobbyClient`, is sent the same updates, and makes its
moves through the same `move` request. The server only knows that a player is a bot, from
its registry. How a bot decides its moves is up to the bot.

| Package                   | What it is                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `core` (`@durachok/bots`) | The `Strategy` interface, what a strategy is told, and how a bot plays a lobby, or plays other strategies without a server |
| `strategies/random`       | `RandomStrategy`: any move it can, at random, as a baseline                                                                |
| `strategies/rules`        | `RulesStrategy`: hand-written rules, of a careful player                                                                   |
| `strategies/model`        | `ModelStrategy`: asks a decision model, such as one behind an HTTP endpoint                                                |

The strategies have nothing to do with one another, and `core` knows none of them, which
[`zenith.toml`](../../zenith.toml) checks.

## Writing a strategy

A strategy is a class with one method, `decide`, which picks one of the moves that the
player can make:

```ts
import { Observation, Strategy } from "@durachok/bots";
import { PlayerMove } from "@durachok/transport";

export class FirstMoveStrategy implements Strategy {
    public decide({ view, table, deck, moves, history }: Observation): PlayerMove {
        return moves[0]!;
    }
}
```

It is told only what its player is told:

| Field     | What it is                                                                                |
| --------- | ----------------------------------------------------------------------------------------- |
| `view`    | The player's view of the game: their hand, the other players, the table and the trump     |
| `table`   | The cards on the table, in the order that they were played, with the cards that beat them |
| `deck`    | How many cards are left to draw, and how many were discarded, or `null` in mythic mode    |
| `moves`   | The moves that the player can make now, of which there is always at least one             |
| `history` | What has happened in the game so far, in order                                            |

A strategy can take its time, and is handed an `AbortSignal`, which is aborted when the game
moves on before it decides.

## A decision model over HTTP

`ModelStrategy` with an `HttpModel` POSTs the observation to a URL as JSON, and expects
`{ "move": <index> }` back, the index of the move to make in `moves`. The model can be
written in any language. When it fails, takes too long, or picks a move that isn't there,
the strategy's fallback decides instead.

```ts
new ModelStrategy(new HttpModel("http://localhost:5000/decide"), { fallback: new RulesStrategy() });
```

## Playing in a lobby

A bot needs an entry in the server's registry, which gives it the tokens that it plays with:

```sh
just bots add ivan "Plays by hand-written rules"   # prints BOT_TOKEN and BOT_REFRESH_TOKEN
just bots list
just bots remove ivan                               # shuts the bot out
```

Then it takes a seat in a lobby and plays until it leaves, e.g. because it was kicked:

```ts
import { playInLobby } from "@durachok/bots";

const bot = await playInLobby(
    { url: "http://localhost:8080", pin: "123456", tokens: { token, refreshToken } },
    { strategy: new RulesStrategy() },
);
console.log(`Left the lobby: ${await bot.left}`);
```

## Playing strategies against each other

`playGame` plays a game on the engine, without a server, and `tournament` plays many and
counts how often each strategy lost:

```ts
import { tournament } from "@durachok/bots";

await tournament({ rules: new RulesStrategy(), random: new RandomStrategy() }, 100);
// e.g. { rules: 1, random: 99 }
```
