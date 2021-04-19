import { useRef, useEffect } from 'react'

/**
 * Hook remembering previous state value
 * https://blog.logrocket.com/how-to-get-previous-props-state-with-react-hooks/
 * @param value
 */
export function usePrevious<TValue>(value: TValue | undefined): TValue | undefined {
    const ref = useRef<TValue>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}
