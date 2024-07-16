import clsx from "clsx";
import React from 'react';
import Card from "../Card";
import PropTypes from 'prop-types';
import styles from "./index.module.scss";
import {Droppable} from "react-beautiful-dnd";

const DefendingDrop = props => {
    return (
        <Droppable
            isDropDisabled={!props.canPlace}
            type={props.canPlace ? "CARD" : "DISABLED"} droppableId={`holder-${props.index}`}>
            {(provided, snapshot) => {
                return (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={clsx(styles.Item, {
                            [styles.Hovering]: props.canPlace && snapshot.isDraggingOver,
                            [styles.BlockHovering]: !props.canPlace,
                        })}
                    >
                        <Card {...props.card} style={{ position: "absolute", zIndex: 0}} />
                        {provided.placeholder}
                    </div>
                );
            }}
        </Droppable>
    );
};

DefendingDrop.propTypes = {
    canPlace: PropTypes.bool.isRequired,
    card: PropTypes.shape({src: PropTypes.string, value: PropTypes.string}),
    index: PropTypes.number.isRequired,
};

export default DefendingDrop;
