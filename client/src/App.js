import React from 'react';
import LoginRoute from "./routes/Login";
import HomeRoute from "./routes/Home";
import LobbyRoute from "./routes/Lobby";
import {BrowserRouter, Route, Switch} from 'react-router-dom';

function App() {
  return (
      <BrowserRouter>
        <Switch>
          <Route exact path={'/'} component={HomeRoute}/>
          <Route path={'/lobby'} component={LobbyRoute}/>
          <Route path={'/login'} component={LoginRoute}/>
        </Switch>
      </BrowserRouter>
  );
}

export default App;
