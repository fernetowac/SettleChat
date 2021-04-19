import * as React from 'react'

/**
 * Returns function that tells if function component is still mounted
 * */
export const useIsMounted = (): (() => boolean) => {
    const isMounted = React.useRef(false)
    React.useEffect(() => {
        isMounted.current = true
        return function cleanup(): void {
            isMounted.current = false
        }
    }, [])
    const checker = React.useCallback((): boolean => {
        return isMounted.current
    }, [])
    return checker
}
