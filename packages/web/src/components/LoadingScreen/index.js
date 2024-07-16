import React from 'react';
import { Bars } from "react-loader-spinner";
import styles from "./index.module.scss";

const LoadingScreen = (props) => {
    return (
        <div
            style={{
                display: "flex",
                height: "100%",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <div>
                <Bars wrapperClass={styles.lobbyLoader} color="#FFFFFF" height={80} width={80}/>
                {props.children}
            </div>
        </div>
    );
};

export default LoadingScreen;
