/**
 * Module description:   src/routes/Home/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import Prompt from "../../components/Prompt";
import PlayingCardsIcon from './../../assets/image/playing-cards.svg'
import {ReactComponent as PlayingCardIcon} from './../../assets/image/playing-card.svg';
import Logo from "../../components/Logo";

const HomeRoute = () => {
    return (
        <>
            <div className="App-join">
                <Logo size={64}/>
                <br/>
                <div className={'App-join-prompt'}>
                    <Prompt/>
                </div>
            </div>
            <div className={'App-wrapper'}>
                {/* This is a bit of a hack to render 16 cards without using 16 lines*/}
                {
                    [...Array(12)].map((e, i) => <PlayingCardIcon className={'floating-card'} key={i}/>)
                }
            </div>
        </>
    );
};

export default HomeRoute;
