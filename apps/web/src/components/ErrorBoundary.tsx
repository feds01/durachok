import React from "react";
import { Frown } from "lucide-react";

import Divider from "@/components/Divider";
import { APP_DEV_VERSION, APP_VERSION, APP_VERSION_BRANCH } from "@/config";
import { expr, isDef } from "@/utils";

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
        }
        return error.stack ?? error.message;
    });

    return {
        hasError: true,
        message: btoa(`Error: ${message} \n\nStack: ${componentStack}`),
    };
}

class ErrorContainer extends React.Component<ErrorContainerProps, ErrorContainerState> {
    constructor(props: ErrorContainerProps) {
        super(props);
        this.state = stateFromError(props.error, props.info);
        this.handleErrorEvent = this.handleErrorEvent.bind(this);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    private handleErrorEvent(event: ErrorEvent) {
        if (event.message === "Script error." || event.message === "ResizeObserver loop limit exceeded") {
            return;
        }

        const message = expr(() => {
            if (typeof event.error === "string") {
                return event.error;
            }

            if (isDef(event.error) && event.error instanceof Error) {
                return event.error.stack ?? event.error.message;
            }

            return JSON.stringify(event);
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
                <div className="flex flex-col justify-center items-center h-full w-full">
                    <div className="m-8">
                        <div className="select-none flex flex-row items-center">
                            <Frown className="w-10 h-10" />
                            <h1 className="m-0 ml-2 text-4xl">Something went wrong!</h1>
                        </div>
                        <h2>Please help out and email or send me this bug string.</h2>
                        <Divider />
                        <b className="break-all">{message}</b>
                        <Divider />
                        <p>
                            Version: Durachok@{APP_VERSION}/{APP_DEV_VERSION} on branch {APP_VERSION_BRANCH}
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
