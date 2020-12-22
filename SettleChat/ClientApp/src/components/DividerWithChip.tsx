import * as React from 'react';
import { BoxProps, Chip, Box, Tooltip } from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme: Theme) => createStyles({
    listSubheader: {
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        margin: '0 16px',
        background: 'transparent',
        '&::before,&::after': {
            content: '""',
            flex: 1,
            borderBottom: "1px solid ".concat(theme.palette.type === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)')
        }
    }
}));

type DividerWithChipProps = BoxProps & { label: string, tooltipText?: string };

/**
 * Note: I couldn't make Material-UI divider working for some reason. This is a workaround.
 * @param props
 */
const DividerWithChip = (props: DividerWithChipProps) => {
    const { label, tooltipText, ...boxProps } = props;
    const classes = useStyles();

    return <Box {...boxProps} className={classes.listSubheader}>
        {tooltipText !== undefined ?
            <Tooltip title={tooltipText}>
                <Chip variant="outlined" size="small" label={label} />
            </Tooltip>
            :
            <Chip variant="outlined" size="small" label={label} />
        }
    </Box>;
}

export default DividerWithChip;