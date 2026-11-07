import Logo from "@/components/Logo";
import { useAuthState } from "@/contexts/auth";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

type Props = {
    /** The page's actions, on the right. */
    children?: React.ReactNode;
    /**
     * Whether the logo leads home: to the dashboard for registered users, and to the home
     * page for everyone else. A page that the user shouldn't leave by accident turns it off.
     */
    linkHome?: boolean;
    className?: string;
};

/** The bar along the top of the app's pages: the logo, and the page's actions. */
export default function AppHeader({ children, linkHome = true, className }: Props) {
    const { isRegistered } = useAuthState();

    return (
        <header
            className={cn("mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 py-4", className)}
        >
            {linkHome ? (
                <Link
                    to={isRegistered() ? "/user" : "/"}
                    aria-label="Home"
                    className="rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <Logo size={32} />
                </Link>
            ) : (
                <Logo size={32} />
            )}
            {/* On the right, even when it wraps under the logo. */}
            <nav className="ml-auto flex flex-wrap items-center gap-2">{children}</nav>
        </header>
    );
}
