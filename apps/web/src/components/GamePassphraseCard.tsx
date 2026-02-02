import { clsx } from "clsx";

import { css } from "@emotion/css";

type Props = {
    onClick: () => void;
    selected: boolean;
    symbol: string;
};

const cardSelected = css`
    cursor: default;
    border-color: #3f51b5 !important;
    color: #3f51b5;
`;

const card = css`
    user-select: none;
    background: transparent;
    padding: 0 !important;
    font-size: 72px;
    margin: auto 5px;
    height: 96px;
    line-height: 96px;
    width: 25%;
    max-width: 80px;
    border: 2px solid rgba(172, 170, 190, 1);
    border-radius: 8px;
    outline: none;
    transition: 0.3s;
    
    &:hover {
        cursor: pointer;
        color: #3f51b5;
        border-color: #3f51b5;
    }
`;

export default function GamePassphraseCard({ onClick, selected, symbol }: Props) {
    const handleClick = () => {
        if (!selected) {
            onClick();
        }
    };

    return (
        <button
            type="button"
            className={clsx(card, {
                [cardSelected]: selected,
            })}
            onClick={handleClick}
        >
            {symbol}
        </button>
    );
}
