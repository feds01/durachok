// type Props = {}
import { Bars } from "react-loader-spinner";

import { css } from "@emotion/css";
import Box from "@mui/material/Box";

const Loader = (/* props: Props */) => {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <Bars
                wrapperClass={css`
                    & svg {
                        margin: 0 auto;
                        width: 100%;
                    }
                `}
                color="#FFFFFF"
                height={80}
                width={80}
            />
        </Box>
    );
};

export default Loader;
