﻿/**
 * Source: https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/useScrollTrigger/useScrollTrigger.js
 */
import * as React from 'react'

function defaultTrigger(store: any, options: any): boolean {
    const { disableHysteresis = false, threshold = 100, target } = options
    const previous = store.current

    if (target) {
        // Get vertical scroll
        store.current = target.pageYOffset !== undefined ? target.pageYOffset : target.scrollTop
    }

    if (!disableHysteresis && previous !== undefined) {
        if (store.current < previous) {
            return false
        }
    }

    return store.current > threshold
}

const defaultTarget = typeof window !== 'undefined' ? window : null

export default function useScrollTrigger(options: any = {}): boolean {
    const { getTrigger = defaultTrigger, target = defaultTarget, ...other } = options
    const store = React.useRef()
    const [trigger, setTrigger] = React.useState(() => getTrigger(store, other))

    React.useEffect(() => {
        const handleScroll = () => {
            setTrigger(getTrigger(store, { target, ...other }))
        }

        handleScroll() // Re-evaluate trigger when dependencies change
        target.addEventListener('scroll', handleScroll)
        return () => {
            target.removeEventListener('scroll', handleScroll)
        }
        // See Option 3. https://github.com/facebook/react/issues/14476#issuecomment-471199055
    }, [target, getTrigger, JSON.stringify(other)])

    return trigger
}
