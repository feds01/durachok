/**
 * Module description:   src/routes/Home/CardImage.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React, {useEffect, useState} from "react";
import styles from "./index.module.scss";
import Logo from "../../components/Logo";
import Prompt from "../../components/Prompt";
import {Link, useHistory, useLocation} from "react-router-dom";
import {ReactComponent as PlayingCardIcon} from './../../assets/image/playing-card.svg';

const HomeRoute = () => {
    const location = useLocation();
    const history = useHistory();
    const [pin, setPin] = useState(null);

    // Only fire this on mount
    useEffect(() => {
        // set body overflow property to hidden to prevent the animation overflow, when user
        // navigates off the page, reset this to normal.
        document.getElementsByTagName("body")[0].style.overflow = "hidden";

       if (location?.state?.pin) {
           setPin(location.state.pin);
           history.replace('', null);
       }

       return () => {
           document.getElementsByTagName("body")[0].style.overflow = "auto";
       }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className={styles.Wrapper}>
                {/* This is a bit of a hack to render 12 cards without using 12 lines*/}
                {
                    [...Array(12)].map((e, i) => <PlayingCardIcon className={styles.floatingCard} key={i}/>)
                }
            </div>
            <div className={styles.Container}>
                <Logo size={64}/>
                <Prompt
                    className={styles.Prompt}
                    {...pin && {pin}}
                />
                <p>Got an account? Login <Link to={"/login"}>here</Link></p>
            </div>
        </>
    );
};

export default HomeRoute;
