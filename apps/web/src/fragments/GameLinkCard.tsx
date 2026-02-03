import trpc from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

type GameStatus = "waiting" | "playing" | "finished";

type Props = {
    pin: string;
    status: GameStatus;
    players: number;
    maxPlayers: number;
};

export default function GameLinkCard({ pin, status, players, maxPlayers }: Props) {
    const navigator = useNavigate();
    const deleteGame = trpc.lobbies.delete.useMutation();

    const onDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteGame.mutateAsync({ pin });
    };

    return (
        <div
            role="option"
            aria-selected="false"
            className="flex flex-row p-4 my-2 rounded-xl max-w-75 bg-primary text-white shadow-lg hover:cursor-pointer"
            onClick={() => navigator({ to: `/lobby/$pin`, params: { pin } })}
        >
            <div className="flex-1">
                <div className="flex-1 flex flex-row justify-between items-center">
                    <code className="text-2xl">{pin}</code>
                    <span>{status}</span>
                </div>
                <div className="text-center my-4">
                    <h1 className="text-xl font-bold">
                        {players} / {maxPlayers}
                    </h1>
                </div>
                <div className="flex flex-col justify-center">
                    <Button variant="secondary" onClick={onDelete}>
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
