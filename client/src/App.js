import "./App.scss";
import React from 'react';
import HomeRoute from "./routes/Home";
import LobbyRoute from "./routes/Lobby";
import {BrowserRouter, Route, Switch} from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route exact path={'/'} component={HomeRoute}/>
                <Route path={'/lobby'} component={LobbyRoute}/>
            </Switch>
        </BrowserRouter>
    );
}

export default App;
