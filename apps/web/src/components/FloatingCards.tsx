import { CSSProperties, useState } from "react";

import PlayingCard from "@/assets/image/playing-card.svg?react";

/** How many cards float behind the page. */
const CARD_COUNT = 12;

const random = (max: number) => Math.random() * max;

/** Playing cards that float up behind the page, the nearer ones bigger and more blurred. */
export default function FloatingCards() {
    const [cards] = useState(() =>
        Array.from({ length: CARD_COUNT }, (_, depth) => {
            const duration = 12 + random(14);
            return {
                id: depth,
                left: `${random(110) - 5}%`,
                duration,
                // Start part way up, so that the cards are spread out from the first frame.
                delay: -random(duration),
                scale: 0.4 + depth * 0.12,
                rotate: random(360),
                blur: Math.max(depth - 7, 0),
            };
        }),
    );

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:hidden"
        >
            {cards.map((card) => (
                <PlayingCard
                    key={card.id}
                    className="absolute top-full size-16 fill-primary opacity-25 max-sm:size-10"
                    style={
                        {
                            left: card.left,
                            filter: card.blur ? `blur(${card.blur}px)` : undefined,
                            animation: `float-card ${card.duration}s linear ${card.delay}s infinite`,
                            "--card-scale": card.scale,
                            "--card-rotate": `${card.rotate}deg`,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}
