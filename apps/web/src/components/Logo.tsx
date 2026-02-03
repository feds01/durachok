import PlayingCards from "@/assets/image/playing-cards.svg";

interface Props {
    size: number;
}

const Logo = ({ size }: Props) => (
    <div>
        <h2
            className="font-display m-0 font-black italic text-foreground max-sm:text-[40px]!"
            style={{ fontSize: size }}
        >
            <img src={PlayingCards} width={size * 0.75} height={size * 0.75} alt="" className="inline-block" />
            Durachok
        </h2>
    </div>
);

export default Logo;
