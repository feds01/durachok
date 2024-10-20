import React from "react";

import Divider from "@/components/Divider";
import { APP_DEV_VERSION, APP_VERSION, APP_VERSION_BRANCH } from "@/config";
import { expr, isDef } from "@/utils";
import { css } from "@emotion/css";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";

type ErrorContainerProps = {
    children?: React.ReactNode;
    error: Error;
    info?: React.ErrorInfo;
};

type ErrorContainerState = {
    hasError: boolean;
    message?: string;
};

function stateFromError(error: Error, info?: React.ErrorInfo) {
    const { componentStack } = info ?? { componentStack: "" };

    const message = expr(() => {
        if (typeof error === "string") {
            return error;
        } else {
            return error.stack ?? error.message;
        }
    });

    return {
        hasError: true,
        message: btoa(`Error: ${message} \n\nStack: ${componentStack}`),
    };
}

class ErrorContainer extends React.Component<
    ErrorContainerProps,
    ErrorContainerState
> {
    constructor(props: ErrorContainerProps) {
        super(props);
        this.state = stateFromError(props.error, props.info);
        this.handleErrorEvent = this.handleErrorEvent.bind(this);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    /** A error event handler for window-level errors. */
    private handleErrorEvent(event: ErrorEvent) {
        // ignore ResizeObserver loop limit exceeded
        // this is ok in several scenarios according to
        // https://github.com/WICG/resize-observer/issues/38
        if (
            event.message === "Script error." ||
            event.message === "ResizeObserver loop limit exceeded"
        ) {
            // @Cleanup
            return;
        }

        const message = expr(() => {
            if (typeof event.error === "string") {
                return event.error;
            } else {
                if (isDef(event.error) && event.error instanceof Error) {
                    return event.error.stack ?? event.error.message;
                }

                return JSON.stringify(event);
            }
        });

        this.setState({
            hasError: true,
            message: btoa(`Error: ${message}`),
        });
    }

    componentDidMount() {
        window.addEventListener("error", this.handleErrorEvent);
    }

    componentWillUnmount() {
        window.removeEventListener("error", this.handleErrorEvent);
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState(stateFromError(error, errorInfo));
    }

    render() {
        const { message, hasError } = this.state;

        if (hasError) {
            return (
                <div
                    className={css`
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;

                        height: 100%;
                        width: 100%;
                    `}
                >
                    <div
                        style={{
                            margin: "2em",
                        }}
                    >
                        <div
                            className={css`
                                user-select: none;
                                display: flex;
                                flex-direction: row;
                                align-items: center;

                                & h1 {
                                    margin: 0 0 0 8px;
                                    font-size: 40px;
                                }
                            `}
                        >
                            <SentimentVeryDissatisfiedIcon
                                style={{ fontSize: 40 }}
                            />
                            <h1>Something went wrong!</h1>
                        </div>
                        <h2>
                            Please help out and email or send me this bug
                            string.
                        </h2>
                        <Divider />
                        <b
                            className={css`
                                word-break: break-all;
                            `}
                        >
                            {message}
                        </b>
                        <Divider />
                        <p>
                            Version: Durachok@{APP_VERSION}/{APP_DEV_VERSION} on
                            branch {APP_VERSION_BRANCH}
                            <br />
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorContainer;
