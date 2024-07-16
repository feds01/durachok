import React from 'react';
import styles from './index.module.scss';
import Divider from "@material-ui/core/Divider";
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied';

class ErrorContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, errorString: ""};

        this.handleErrorEvent = this.handleErrorEvent.bind(this);
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return {hasError: true};
    }

    handleErrorEvent(event) {

        // ignore ResizeObserver loop limit exceeded
        // this is ok in several scenarios according to
        // https://github.com/WICG/resize-observer/issues/38
        if (event.message === "Script error." || event.message === 'ResizeObserver loop limit exceeded') { // @Cleanup
            return;
        }

        this.setState({
            hasError: true,
            errorString: btoa(event.error?.stack ? event.error.stack : JSON.stringify(event)),
        });
    }

    componentDidMount() {
        window.addEventListener("error", this.handleErrorEvent);
    }

    componentWillUnmount() {
        window.removeEventListener("error", this.handleErrorEvent);
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            errorString: btoa(error.stack ? error.stack : error),
        });
    }

    render() {
        const {errorString, hasError} = this.state;

        if (hasError) {
            return (
                <div className={styles.Error}>
                    <div style={{
                        margin: "2em"
                    }}>
                        <div className={styles.Title}>
                            <SentimentVeryDissatisfiedIcon style={{fontSize: 40}}/>
                            <h1>Something went wrong!</h1>
                        </div>
                        <h2>Please help out and email or send me this bug string.</h2>
                        <Divider/>
                        <b className={styles.ErrorMessage}>{errorString}</b>
                        <Divider/>
                        <p>
                            Version: Durachok@{process.env.REACT_APP_VERSION}/{process.env.REACT_APP_DEV_VERSION} on
                            branch {process.env.REACT_APP_VERSION_BRANCH}<br/>
                            Running: shared@{process.env.REACT_APP_DEV_SHARED_VERSION}
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children;
    }
}

export default ErrorContainer;
