import PlayingCards from "@/assets/image/playing-cards.svg?react";

interface Props {
    size: number;
}

const Logo = ({ size }: Props) => (
    <div>
        <h2
            className="font-display! m-0 whitespace-nowrap font-black italic text-foreground max-sm:text-[40px]!"
            style={{ fontSize: size }}
        >
            {/* Drawn inline, in the wordmark's colour, so that its outline stays crisp on the dark page. */}
            <PlayingCards
                width={size * 0.75}
                height={size * 0.75}
                aria-hidden="true"
                className="mr-1 inline-block fill-current align-baseline"
            />
            Durachok
        </h2>
    </div>
);

export default Logo;
