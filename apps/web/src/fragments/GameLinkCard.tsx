import trpc from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type GameStatus = "waiting" | "playing" | "finished";

type Props = {
    pin: string;
    status: GameStatus;
    players: number;
    maxPlayers: number;
};

export default function GameLinkCard({ pin, status, players, maxPlayers }: Props) {
    const deleteGame = trpc.lobbies.delete.useMutation();

    const onDelete = async () => {
        await deleteGame.mutateAsync({ pin });
    };

    return (
        <div className="flex flex-col p-4 my-2 rounded-xl max-w-75 bg-primary text-white shadow-lg">
            <Link to="/lobby/$pin" params={{ pin }} className="block">
                <div className="flex flex-row justify-between items-center">
                    <code className="text-2xl">{pin}</code>
                    <span>{status}</span>
                </div>
                <div className="text-center my-4">
                    <h1 className="text-xl font-bold">
                        {players} / {maxPlayers}
                    </h1>
                </div>
            </Link>
            <div className="flex flex-col justify-center">
                <Button variant="secondary" onClick={onDelete}>
                    Delete
                </Button>
            </div>
        </div>
    );
}
