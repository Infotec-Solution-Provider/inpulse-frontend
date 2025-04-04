import { InputLabel, Select, styled, TextField } from "@mui/material";

export const StyledTextField = styled(TextField)(() => ({
    '& .MuiInputLabel-root': {
        color: 'gray',
    },
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: 'gray',
        },
        '&:hover fieldset': {
            borderColor: 'white',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'gray',
        },
        '& .MuiInputBase-input': {
            color: 'white',
        },
        '& .MuiSvgIcon-root': {
            color: 'white',
        }
    }
}))

export const StyledInputLabel = styled(InputLabel)(() => ({
    color: 'gray'
}))

export const StyledSelect = styled(Select)(() => ({
    color: 'white',
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'gray',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'white',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'white',
    },
    '& .MuiSvgIcon-root': {
        color: 'white',
    }
}))