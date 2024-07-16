import React from 'react';
import clsx from "clsx";
import PropTypes from 'prop-types';
import styles from "./index.module.scss";
import {Droppable} from "react-beautiful-dnd";

import Card from "../Card";
import {useGameState} from "../GameContext";

const AttackingDrop = props => {
    const {out} = useGameState();
    const isDropDisabled = typeof props.card !== "undefined" || !props.canPlace;

    return (
        <Droppable
            isDropDisabled={isDropDisabled}
            type={isDropDisabled ? "DISABLED" : "CARD"} droppableId={`holder-${props.index}`}>
            {(provided, snapshot) => {
                return (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={clsx(styles.Item, props.className, {
                            [styles.Hovering]: props.canPlace && snapshot.isDraggingOver,
                            [styles.CanPlace]: props.canPlace && !out,
                        })}
                    >
                        <Card useBackground={false}/>
                        {provided.placeholder}
                    </div>
                );
            }}
        </Droppable>
    );
};

AttackingDrop.propTypes = {
    canPlace: PropTypes.bool.isRequired,
    className: PropTypes.string,
    card: PropTypes.shape({src: PropTypes.string, value: PropTypes.string}),
    index: PropTypes.number.isRequired,
};

export default AttackingDrop;
