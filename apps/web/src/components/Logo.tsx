import PlayingCards from "@/assets/image/playing-cards.svg";
import { css } from "@emotion/css";

const Logo = ({ size }: { size: number }) => (
    <div>
        <h2
            className={css`
                font-family: "Playfair Display", serif !important;
                margin: 0;
                font-weight: 900;
                font-style: italic;
                color: #dad8ec;

                @media (max-width: 600px) {
                    font-size: 40px !important;
                }
            `}
            style={{ fontSize: size }}
        >
            <img
                src={PlayingCards}
                width={size * 0.75}
                height={size * 0.75}
                alt={""}
            />
            Durachok
        </h2>
    </div>
);

export default Logo;
