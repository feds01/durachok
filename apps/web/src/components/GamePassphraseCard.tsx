import { cn } from "@/lib/utils";

type Props = {
    onClick: () => void;
    selected: boolean;
    symbol: string;
};

export default function GamePassphraseCard({ onClick, selected, symbol }: Props) {
    const handleClick = () => {
        if (!selected) {
            onClick();
        }
    };

    return (
        <button
            type="button"
            className={cn(
                "select-none bg-transparent p-0 text-7xl mx-1 h-24 leading-24 w-1/4 max-w-20",
                "border-2 border-foreground rounded-lg outline-none transition-all duration-300",
                "hover:cursor-pointer hover:text-primary hover:border-primary",
                selected && "cursor-default border-primary! text-primary",
            )}
            onClick={handleClick}
        >
            {symbol}
        </button>
    );
}
