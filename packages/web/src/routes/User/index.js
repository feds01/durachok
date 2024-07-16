/**
 * Module description:   src/routes/Lobby/CardImage.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import styles from "./index.module.scss";
import {useHistory} from "react-router";
import React, {useCallback, useEffect, useState} from "react";
import Divider from "@material-ui/core/Divider";


import {getUser} from "../../utils/networking/user";
import PlayerHeader from "../../components/PlayerHeader";
import GameCard from "../../components/DashboardGameCard";
import LoadingScreen from "../../components/LoadingScreen";
import GameDialog from "../../components/CreateGameDialog";
import PlayerStatistics from "../../components/PlayerStatistics";
import {RefreshDashboardContext} from "../../contexts/RefreshDashboard";
import {logout, useAuthDispatch, useAuthState} from "../../contexts/auth";

import {Link} from "react-router-dom";
import {makeStyles} from "@material-ui/core";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles((theme) => ({
    buttons: {
        '& > *': {
            margin: theme.spacing(1),
        },
    },
}));

const UserRoute = () => {
    const classes = useStyles();
    const history = useHistory();
    const {name} = useAuthState();
    const dispatch = useAuthDispatch();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [refreshData, setRefreshData] = useState(false);
    const [userData, setUserData] = useState({});

    const handleLogout = useCallback(() => {
        logout(dispatch).then(r => {
            history.push('/'); //navigate to logout page on logout
        }); //call the logout action
    }, [history, dispatch]);

    useEffect(() => {
        // if either the token or refreshToken is null, re-direct the user to the login page.
        getUser(dispatch).then((res) => {
            if (res.status) {
                setUserData(res.data);
            } else {
                handleLogout();
            }
        });
    }, [refreshData, handleLogout, dispatch]);


    if (Object.keys(userData).length === 0) {
        return <LoadingScreen><b>Loading...</b></LoadingScreen>
    } else {
        return (
            <RefreshDashboardContext.Provider value={{
                onRefresh: () => {
                    setUserData({});
                    setRefreshData(!refreshData);
                }
            }}>
                <div className={styles.Dashboard}>
                    <div className={styles.Actions}>
                        <div className={classes.buttons}>
                            <Button variant="contained" onClick={() => setDialogOpen(true)}>
                                Create game
                            </Button>
                        </div>

                        <div className={classes.buttons}>
                            <Link to={"/user/settings"}>
                                <Button variant="contained" style={{
                                    textDecoration: "none"
                                }}>
                                    Settings
                                </Button>
                            </Link>
                            <Button variant="contained" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </div>

                    <PlayerHeader avatarUri={userData.image} name={name}/>

                    <div className={styles.Content}>
                        <Divider style={{width: "100%"}}/>
                        <div className={styles.Statistics}>
                            <PlayerStatistics statistics={userData.statistics}/>
                        </div>
                        <Divider style={{width: "100%"}}/>

                        <div className={styles.Games}>
                            <h2>Active games</h2>
                            {
                                userData.games.map((game, index) => {
                                    return <GameCard key={index} {...game} />
                                })
                            }
                            {userData.games.length === 0 && (
                                <p>No active games.</p>
                            )}
                        </div>
                    </div>
                </div>
                <GameDialog open={dialogOpen} onClose={() => setDialogOpen(false)}/>
            </RefreshDashboardContext.Provider>
        );
    }
};

export default UserRoute;
