/**
 * Module description:   src/routes/Home/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import PlayingCardsIcon from './../../assets/image/playing-cards.svg'

const HomeRoute = () => {
    return (
        <>
            <div className="App-join">
                <h2>
                    <img src={PlayingCardsIcon} width={48} height={48} alt={''} />
                    Durachok
                </h2>
                <br/>
            </div>
            <div className={'App-wrapper'}>
            </div>
        </>
    );
};

export default HomeRoute;
