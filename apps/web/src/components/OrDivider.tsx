/** A line with "or" in the middle, between two ways of doing something. */
export default function OrDivider() {
    return (
        <div className="flex w-full items-center gap-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            or
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>
    );
}
