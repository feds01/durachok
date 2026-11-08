/**
 * Counts what each key does within a sliding window, and says when a key has done too much, e.g.
 * the events of a client's sockets, or the wrong passphrases that a lobby was sent. It keeps its
 * counts in memory, so they are per server, and start again when the server does.
 */
export class RateLimiter {
    /** When each key acted, oldest first, within the window. */
    private readonly hits = new Map<string, number[]>();
    /** When the keys that went quiet were last forgotten. */
    private sweptAt: number;

    public constructor(
        /** How many times a key may act within the window. */
        private readonly limit: number,
        /** How long the window is, in milliseconds. */
        private readonly windowMs: number,
        private readonly now: () => number = Date.now,
    ) {
        this.sweptAt = now();
    }

    /** Whether a key has used up what it may do in the window, without counting anything. */
    public isLimited(key: string): boolean {
        return this.recent(key).length >= this.limit;
    }

    /** Count an action by a key, whether or not it was within the limit. */
    public hit(key: string): void {
        this.hits.set(key, [...this.recent(key), this.now()]);
    }

    /** Count an action by a key if it is within the limit, and say whether it was. */
    public take(key: string): boolean {
        if (this.isLimited(key)) {
            return false;
        }

        this.hit(key);
        return true;
    }

    /** The times that a key acted within the window, after forgetting the keys that went quiet. */
    private recent(key: string): number[] {
        const now = this.now();
        if (now - this.sweptAt >= this.windowMs) {
            for (const [other, times] of this.hits) {
                if (now - times[times.length - 1]! >= this.windowMs) {
                    this.hits.delete(other);
                }
            }
            this.sweptAt = now;
        }

        // A key that acted more than the limit, as `hit` lets it, only needs its latest times kept.
        const times = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs).slice(-this.limit);
        this.hits.set(key, times);
        return times;
    }

    /** How many keys the limiter holds, which it keeps to those that acted within the window. */
    public get size(): number {
        return this.hits.size;
    }
}
