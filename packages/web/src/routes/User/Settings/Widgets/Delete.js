import React from 'react';
import {useHistory} from "react-router";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import settingStyles from "../index.module.scss";
import {useAuthDispatch} from "../../../../contexts/auth";
import {deleteUser} from "../../../../utils/networking/user";

const DeleteUser = props => {
    const history = useHistory();
    const dispatch = useAuthDispatch();

    const handleDelete = () => {
        deleteUser().then(res => {
            if (res.status) {

               dispatch({type: "LOGOUT"});
               history.push("/");
            } else {
                // Dispatch notification that deletion failed
            }
        });
    }

    return (
        <section className={settingStyles.Details}>
            <h2 style={{color: "red"}}>Danger Zone</h2>
            <Divider style={{width: "100%"}}/>
            <p style={{marginBottom: "0.6em"}}>
                Deleting your account will remove any and all information on your account. This includes any
                games
                that you have played, are playing, and all of your statistics. Once your account is deleted,
                this
                information will be unrecoverable.
            </p>
            <Button fullWidth={false} color={"secondary"} onClick={handleDelete} variant={"contained"}>
                Delete
            </Button>
        </section>
    );
};

DeleteUser.propTypes = {

};

export default DeleteUser;
