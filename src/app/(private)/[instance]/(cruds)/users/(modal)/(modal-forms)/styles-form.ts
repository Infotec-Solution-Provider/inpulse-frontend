import { FormControlLabel, Paper, styled, TextField, TextFieldProps } from "@mui/material";

export const StyledTextField = styled(TextField)(() => ({
    '& .MuiInputLabel-root': { color: 'gray' },
    '& .MuiOutlinedInput-root': {
        '& fieldset': { borderColor: 'gray' },
        '&:hover fieldset': { borderColor: 'white' },
    },
    '& .MuiInputBase-input': { color: 'white' },

    '& .MuiSelect-icon': { color: 'gray' },

}));

const StyledPaper = styled(Paper)(() => ({
    backgroundColor: '#333',
    boxShadow: 'none',
    '&::before, &::after': {
        border: 'none !important'
    },
    '& .MuiMenuItem-root': {
        color: 'white',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
        },
        '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        }
    }
}));
export const selectSlotProps: TextFieldProps['slotProps'] = {
    select: {
        MenuProps: {
            PaperProps: {
                sx: {
                    backgroundColor: '#333',
                    '& .MuiMenuItem-root': {
                        color: 'white',
                    }
                },
                component: StyledPaper as typeof Paper,
            },
            sx: {
                '& .MuiPaper-root': {
                    backgroundColor: '#333 !important',
                }
            }
        }
    }
};

export const StyledFormControlLabel = styled(FormControlLabel)(() => ({
    color: "white"
}));
