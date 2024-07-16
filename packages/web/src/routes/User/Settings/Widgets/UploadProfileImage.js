import React, {useContext, useEffect, useState} from 'react';
import settingStyles from "../index.module.scss";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import {makeStyles} from "@material-ui/core";
import {updateUserDetails} from "../../../../utils/networking/user";
import {RefreshDashboardContext} from "../../../../contexts/RefreshDashboard";

const useStyles = makeStyles((theme) => ({
    root: {
        '& > *': {
            margin: theme.spacing(1),
        },
    },
    input: {
        display: 'none',
    },
    error: {
        color: "red",
    }
}));

/**
 * Promises wrapper for loading in an image and determining the orientation of the
 * image. This will accept any 'loadable' image source and return the standardised
 * source and the sizeType of the image
 *
 * @param {String} src Image source to be loaded.
 * @returns {Promise<{src: String, width: Number, height: Number}>} Image source (loaded) or error message if image loading fails.
 * */
export function loadSingleImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve({src: image.src, width: image.width, height: image.height});
        };

        image.onerror = () => {
            reject("Failed to load image from server.")
        };

        image.src = src;
    });
}

async function fileReader(file) {
    return new Promise(((resolve, reject) => {
        const reader = new FileReader();

        try {
            reader.readAsDataURL(file);  // Read the file object as a URL and then load it as an image object.

            // Attempt to load the image from the computer file-system. If it fails, we'll
            // reject the promise so top-level components can display some kind of error.
            reader.onloadend = (e) => loadSingleImage(e.target.result)
                .then((result) => {
                    resolve(result)
                }).catch((e) => {
                    reject(e);
                });

            reader.onerror = (e) => {
                reject(e);
            }
        } catch (e) {
            reject(e);
        }
    }));
}

const UploadProfileImage = props => {
    const classes = useStyles();
    const [image, setImage] = useState(null);
    const [error, setError] = useState("");

    const refresher = useContext(RefreshDashboardContext);

    useEffect(() => {
        if (image !== null) {
            setError(""); // reset the error
            updateUserDetails({image}).then((res) => {
                if (!res.status) {
                    setError("Failed to upload profile image.");
                } else {
                    refresher.onRefresh();
                }
            });
        }
    }, [image]);

    const handleUpload = (e) => {
        if (typeof e.target.files[0] === "undefined") return;
        const file = e.target.files[0];

        // check that the file does not exceed one MB in size
        if (file.size > 1024 * 1024) {
            setError("Cannot upload files that are larger than 1 megabyte.");
            return;
        }

        fileReader(file).then((res) => {
            setImage(res.src);
        });
    }

    return (
        <section className={settingStyles.Details}>
            <h2>Profile Picture</h2>
            <Divider style={{width: "100%"}}/>
            <p>
                You can upload a JPG file that will be used a as a profile picture. The maximum file
                size is 1MB. To get the best profile image fit, try to use an image that has square
                dimensions.
            </p>

            <input
                accept="image/jpeg"
                className={classes.input}
                id="upload-profile"
                onChange={handleUpload}
                type="file"
            />
            <label htmlFor="upload-profile">
                <Button variant="contained" color="primary" component="span">
                    Upload
                </Button>
            </label>
            <p className={classes.error}>{error ?? ""}</p>
        </section>
    )
};

UploadProfileImage.propTypes = {};

export default UploadProfileImage;
