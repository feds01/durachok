import {Link} from "react-router-dom";
import {useHistory} from "react-router";
import styles from "./../index.module.scss";
import settingStyles from "./index.module.scss";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import React, {useEffect, useState} from 'react';

import DeleteUserWidget from "./Widgets/Delete";
import {getUser} from "../../../utils/networking/user";
import PlayerHeader from "../../../components/PlayerHeader";
import UpdateUserDetails from "./Widgets/UpdateUserDetails";
import UploadProfileImage from "./Widgets/UploadProfileImage";
import {logout, useAuthDispatch, useAuthState} from "../../../contexts/auth";
import {RefreshDashboardContext} from "../../../contexts/RefreshDashboard";

const UserSettingsRoute = () => {
    const history = useHistory();
    const {name} = useAuthState();
    const dispatch = useAuthDispatch(); // read dispatch method from context

    const [userData, setUserData] = useState({});
    const [refreshData, setRefreshData] = useState(false);

    useEffect(() => {
        // if either the token or refreshToken is null, re-direct the user to the login page.
        getUser(dispatch).then((res) => {
            if (res.status) {
                setUserData(res.data);
            }
        });
    }, [refreshData, dispatch, history]);


    const handleLogout = () => {
        logout(dispatch).then(r => {
            history.push('/'); //navigate to logout page on logout
        }); //call the logout action
    }

    return (
        <RefreshDashboardContext.Provider value={{
            onRefresh: () => {
                setUserData({});
                setRefreshData(!refreshData);
            }
        }}>
            <div className={styles.Dashboard}>
                <div className={styles.Actions}>
                    <Link to={"/user"}>
                        <Button variant="contained" style={{
                            textDecoration: "none"
                        }}>
                            Home
                        </Button>
                    </Link>

                    <Button variant={"contained"} onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
                <PlayerHeader avatarUri={userData.image} name={name}/>
                <Divider style={{width: "100%"}}/>
                <div className={settingStyles.Settings}>
                    <UploadProfileImage/>
                    <UpdateUserDetails/>
                    <DeleteUserWidget/>
                </div>
            </div>
        </RefreshDashboardContext.Provider>
    );
};

export default UserSettingsRoute;
