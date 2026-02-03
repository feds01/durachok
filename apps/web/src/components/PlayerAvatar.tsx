import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
    avatarUri?: string;
    avatarSize?: number;
    name: string;
    className?: string;
};

export default function PlayerAvatar({ name, avatarUri, avatarSize = 64, className }: Props) {
    return (
        <div className={cn("pt-2 flex flex-col items-center gap-2", className)}>
            <Avatar className="border-2 border-primary" style={{ width: avatarSize, height: avatarSize }}>
                <AvatarImage src={avatarUri} alt={name} />
                <AvatarFallback className="bg-card text-white">
                    <User style={{ width: avatarSize * 0.6, height: avatarSize * 0.6 }} />
                </AvatarFallback>
            </Avatar>
            <h1 className="text-lg font-medium m-0">{name}</h1>
        </div>
    );
}
