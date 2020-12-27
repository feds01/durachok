import "./App.scss";
import React from 'react';
import HomeRoute from "./routes/Home";
import LobbyRoute from "./routes/Lobby";
import UserRoute from "./routes/User";
import LoginRoute from "./routes/Login";
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route exact path={'/'} component={HomeRoute}/>
                <Route exact path={'/login'} component={LoginRoute}/>
                <Route exact path={'/user'} component={UserRoute}/>
                <Route exact path={'/lobby/:id'} component={LobbyRoute}/>
                <Route render={() => <Redirect to="/"/>}/>
            </Switch>
        </BrowserRouter>
    );
}

export default App;
