import React from 'react';
import styles from './index.module.scss';
import GameSecurityCard from "../SecurityCard";

const Passphrase = (props) => {

    console.log(props)
    return (
        <div className={styles.Passphrase}>
            {
                props.passphrase.map((symbol, index) => {
                    return (
                        <GameSecurityCard
                            key={index}
                            symbol={symbol}
                            selected
                            style={{
                                borderColor: `rgba(172, 170, 190, 1)`,
                                color: `rgba(172, 170, 190, 1)`
                            }}
                        />
                    )
                })
            }
        </div>
    );
};

export default Passphrase;
