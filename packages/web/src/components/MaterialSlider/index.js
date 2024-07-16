import React from 'react'
import {useField} from 'formik'
import Slider from '@material-ui/core/Slider'
import Typography from "@material-ui/core/Typography";
import {experimentalStyled as styled} from '@material-ui/core/styles';

const MaterialSlider = ({label, ...props}) => {
    // eslint-disable-next-line
    const [field, meta, helpers] = useField(props)

    return (
        <>
            <Typography id={field.id} gutterBottom>{label}</Typography>
            <Slider
                {...field}
                {...props}
                aria-labelledby={field.id}
                onBlur={(e) => helpers.setTouched(e)}
                onChange={(e, v) => helpers.setValue(v)}
            />
        </>
    )
}

const StyledMaterialSlider = styled(MaterialSlider)({
    color: '#3f51b5 ',
    height: 2,
    padding: '15px 0',

    '& .MuiSlider-rail': {
        height: 2,
        opacity: 0.5,
        backgroundColor: '#dad8ec',
    },
    '& .MuiSlider-mark': {
        backgroundColor: '#bfbfbf',
        height: 8,
        width: 1,
        marginTop: -3,
        '&.MuiSlider-markActive': {
            opacity: 1,
            backgroundColor: 'currentColor',
        },
    },

    '& .MuiSlider-markLabel': {
        color: '#dad8ec'
    },
});

export default StyledMaterialSlider;
