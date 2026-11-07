import { ChevronDown, LogOut, Settings } from "lucide-react";

import UserAvatar from "@/components/UserAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { Link, useNavigate } from "@tanstack/react-router";

type Props = {
    /**
     * Log the user out. By default they are logged out and taken home at once. A page that
     * plays its exit first passes its own, which logs them out once the exit is done.
     */
    onLogout?: () => void;
};

/** The signed-in user's avatar and name, which open a menu with their settings and a way to log out. */
export default function UserMenu({ onLogout }: Props) {
    const [state, dispatch] = useAuth();
    const navigate = useNavigate();

    if (state.kind !== "logged-in" || state.user.kind !== "registered") {
        return null;
    }

    const { user } = state;
    const logout =
        onLogout ??
        (() => {
            dispatch({ type: "logout" });
            void navigate({ to: "/" });
        });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border bg-card/80 py-1 pl-1 pr-3 text-sm font-semibold shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-secondary">
                <UserAvatar image={user.image} size={30} />
                {/* A phone has room for the avatar beside the logo, not the name too. */}
                <span className="max-w-36 truncate max-sm:sr-only">{user.name}</span>
                <ChevronDown
                    className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    {/* The router marks the link active on the settings page itself. */}
                    <Link to="/user/settings" className="data-[status=active]:text-primary">
                        <Settings />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={logout}
                    className="text-destructive data-highlighted:bg-destructive/15 data-highlighted:text-destructive"
                >
                    <LogOut />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
