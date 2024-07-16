import "./routes/Home/index.module.scss";
import React from 'react';
import {AnimatePresence} from "framer-motion";
import {Redirect, useLocation, Route, Switch} from 'react-router-dom';

import HomeRoute from "./routes/Home";
import LobbyRoute from "./routes/Lobby";
import UserRoute from "./routes/User";
import {AuthProvider} from "./contexts/auth";
import LoginRoute from "./routes/Auth/Login";
import RegisterRoute from "./routes/Auth/Register";
import UserSettingsRoute from "./routes/User/Settings";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    const location = useLocation();

    return (
        <AuthProvider>
            <Switch>
                <Route exact path={'/'} component={HomeRoute}/>
                <ProtectedRoute exact path={'/user'} component={UserRoute}/>
                <ProtectedRoute exact path={'/user/settings'} component={UserSettingsRoute}/>
                <Route exact path={'/lobby/:pin'} component={LobbyRoute}/>
                <Route render={() => (
                    <AnimatePresence exitBeforeEnter initial={false}>
                        <Switch location={location} key={location.pathname}>
                            <Route exact path={'/login'} component={LoginRoute}/>
                            <Route exact path={'/register'} component={RegisterRoute}/>
                            <Route render={() => <Redirect to="/"/>}/>
                        </Switch>
                    </AnimatePresence>
                )}/>
            </Switch>
        </AuthProvider>
    );
}

export default App;
