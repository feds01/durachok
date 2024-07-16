import React from 'react'
import { Redirect, Route } from 'react-router'
import {useAuthState} from "../../contexts/auth";

const ProtectedRoute = ({ component: Component, appProps, ...rest }) => {

    // Add your own authentication on the below line.
    const {name} = useAuthState();

    return (
        <Route
            {...rest}
            render={props =>
                name ? (
                    <Component {...props} {...appProps} />
                ) : (
                    <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
                )
            }
        />
    )
};

export default ProtectedRoute;
