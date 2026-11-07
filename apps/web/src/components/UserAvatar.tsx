import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
    /** The user's profile picture, if they have uploaded one. */
    image?: string;
    size: number;
    /** What the picture shows. Leave it empty where the user's name is beside it. */
    alt?: string;
    className?: string;
};

/** A user's profile picture, or a silhouette when they have none. */
export default function UserAvatar({ image, size, alt = "", className }: Props) {
    return (
        <Avatar className={cn("border-2 border-primary", className)} style={{ width: size, height: size }}>
            <AvatarImage src={image} alt={alt} />
            <AvatarFallback className="bg-card text-foreground">
                <User style={{ width: size * 0.6, height: size * 0.6 }} aria-hidden="true" />
            </AvatarFallback>
        </Avatar>
    );
}
