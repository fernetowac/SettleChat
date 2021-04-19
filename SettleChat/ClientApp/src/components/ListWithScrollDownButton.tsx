import * as React from 'react'
import useScrollTrigger from '../hooks/useScrollTrigger'
import { ListProps, List, ListItem, Fab, Zoom, Box } from '@material-ui/core'
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles'
import zIndex from '@material-ui/core/styles/zIndex'
import { KeyboardArrowDown as KeyboardArrowDownIcon } from '@material-ui/icons'

const scrollTopUseStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            position: 'absolute',
            bottom: theme.spacing(2),
            zIndex: zIndex.speedDial,
        },
    })
)

const scrollUpTrigger = (
    store: React.MutableRefObject<any>,
    options: { disableHysteresis?: boolean; threshold?: number; target: HTMLElement }
) => {
    const { threshold = -1, target } = options

    if (target) {
        // Get vertical scroll
        store.current = target.offsetHeight + target.scrollTop - target.scrollHeight
    }

    return threshold >= 0 ? store.current >= threshold : store.current < threshold
}

export const ListWithScrollDownButton = React.forwardRef<HTMLUListElement, ListProps>(
    (props, forwardedRef) => {
        const listBottomRef = React.useRef<HTMLLIElement>(null)
        let listRef = forwardedRef
            ? (forwardedRef as React.RefObject<HTMLUListElement>)
            : React.useRef<HTMLUListElement>(null)
        // dummy state used to force re-rendering of component after ref is initialized
        const [listRefObtained, setListRefObtained] = React.useState(false)
        const scrollTopClasses = scrollTopUseStyles()

        // Note that ref used in target is undefined at initial render. Therefore we have to call this again after first render so that useScrollTrigger can be called with existing target.
        // We achieve it by dummy change of state listRefObtained.
        const isScrolledUp: boolean = useScrollTrigger({
            target: listRef.current ? listRef.current : undefined,
            threshold: -1, // number of pixels needed to scroll to consider it scrolled up
            getTrigger: scrollUpTrigger,
        })

        const onScrollTopClick = (event: React.MouseEvent<HTMLDivElement>) => {
            const anchor = listBottomRef.current

            if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }

        React.useEffect(() => {
            if (listBottomRef.current && !isScrolledUp) {
                listBottomRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
            }
        }, [props.children, listBottomRef.current])

        React.useEffect(() => {
            // We need to do some dummy change in state in order to call useScrollTrigger with ref to existing element,
            // because ref is undefined after initial render.
            setListRefObtained(true)
        }, [listRef.current])

        return (
            <React.Fragment>
                <List ref={listRef} {...props}>
                    {props.children}
                    <ListItem key="bottom-li" ref={listBottomRef} />
                </List>
                <Box height={0} display="flex" position="relative" justifyContent="center">
                    <Zoom in={isScrolledUp}>
                        <Box
                            onClick={onScrollTopClick}
                            component="span"
                            role="presentation"
                            className={scrollTopClasses.root}
                        >
                            <Fab color="secondary" size="small" aria-label="scroll back to top">
                                <KeyboardArrowDownIcon />
                            </Fab>
                        </Box>
                    </Zoom>
                </Box>
            </React.Fragment>
        )
    }
)
