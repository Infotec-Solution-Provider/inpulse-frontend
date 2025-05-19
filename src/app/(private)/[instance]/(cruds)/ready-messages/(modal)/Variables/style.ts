import styled from "styled-components";
import cssVars from "../../../../styles/cssVariables.vars";

export const StyledVariablesMenu = styled.div`
    display: flex;
    flex-direction: column;
    width: 20rem;
    background-color: ${cssVars.colorGrey[8]};
    border-radius: 0.25rem;

    >header {
        box-sizing: border-box;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        >h2 {
            font-size: 1rem;
            font-weight: 500;
        }

        >button {
            font-size: 1.125rem;
            transition: 300ms ease-in-out;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;

            :hover {
                transform: scale(1.25);
            }
        }
    }

    >ul {
        display: flex;
        flex-direction: column;
        padding: 0.25rem;
        border-top: 1px solid rgba(0,0,0, 0.25);

        >li {
            padding: 0.5rem 0.5rem;
            font-size: 1rem;
            font-weight: 500;
            color: ${cssVars.colorGrey[2]};
            cursor: pointer;
            border-radius: 0.25rem;
            
            :hover {
                background-color: ${cssVars.colorPrimary};
                color: white;
            }
        }
    }
`;