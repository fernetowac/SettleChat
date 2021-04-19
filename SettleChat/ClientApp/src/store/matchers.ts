import { isAnyOf, AsyncThunk } from '@reduxjs/toolkit'
import { ActionCreatorWithPreparedPayload } from '@reduxjs/toolkit/src/createAction'
import { ProblemDetails } from '../types/commonTypes'

type AnyAsyncThunk = AsyncThunk<any, any, any>

function isAsyncThunkArray(a: [any] | AnyAsyncThunk[]): a is AnyAsyncThunk[] {
    return (
        typeof a[0] === 'function' && 'pending' in a[0] && 'fulfilled' in a[0] && 'rejected' in a[0]
    )
}

type RejectedActionFromAsyncThunk<T extends AnyAsyncThunk> = ActionFromMatcher<T['rejected']>

type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
    rejectValue: infer RejectValue
}
    ? RejectValue
    : unknown

type AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig> = ActionCreatorWithPreparedPayload<
    [Error | null, string, ThunkArg],
    GetRejectValue<ThunkApiConfig> | undefined,
    string,
    ProblemDetails,
    {
        arg: ThunkArg
        requestId: string
        rejectedWithValue: boolean
        requestStatus: 'rejected'
        aborted: boolean
        condition: boolean
    }
>

type UnknownAsyncThunkRejectedActionWithProblemDetails = ReturnType<
    AsyncThunkRejectedActionCreator<unknown, unknown>
>

interface HasMatchFunction<T> {
    match(v: any): v is T
}

type Matcher<T> = HasMatchFunction<T> | ((v: any) => v is T)

type ActionFromMatcher<M extends Matcher<any>> = M extends Matcher<infer T> ? T : never

function hasExpectedRequestMetadata(action: any, validStatus: string[]) {
    if (!action || !action.meta) return false

    const hasValidRequestId = typeof action.meta.requestId === 'string'
    const hasValidRequestStatus = validStatus.indexOf(action.meta.requestStatus) > -1

    return hasValidRequestId && hasValidRequestStatus
}

function hasExpectedErrorType(action: any) {
    if (!action || !action.error) {
        return false
    }

    return (
        typeof action.error === 'object' &&
        typeof action.error.type === 'string' &&
        typeof action.error.title === 'string' &&
        typeof action.error.status === 'number' &&
        typeof action.error.traceId === 'string'
    )
}

export function isRejectedWithProblemDetails(): (
    action: any
) => action is UnknownAsyncThunkRejectedActionWithProblemDetails
/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is rejected and it has error object in format of RFC 7807 Problem Details.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export function isRejectedWithProblemDetails<
    AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
    ...asyncThunks: AsyncThunks
): (action: any) => action is RejectedActionFromAsyncThunk<AsyncThunks[number]>
/**
 * Tests if `action` is a rejected thunk action with error object in format of RFC 7807 Problem Details.
 * @public
 */
export function isRejectedWithProblemDetails(
    action: any
): action is UnknownAsyncThunkRejectedActionWithProblemDetails
export function isRejectedWithProblemDetails<
    AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks | [any]) {
    if (asyncThunks.length === 0) {
        return (action: any) =>
            hasExpectedRequestMetadata(action, ['rejected']) && hasExpectedErrorType(action)
    }

    if (!isAsyncThunkArray(asyncThunks)) {
        return isRejectedWithProblemDetails()(asyncThunks[0])
    }

    return (action: any): action is RejectedActionFromAsyncThunk<AsyncThunks[number]> => {
        // note: this type will be correct because we have at least 1 asyncThunk
        const matchers: [Matcher<any>, ...Matcher<any>[]] = asyncThunks.map(
            (asyncThunk) => asyncThunk.rejected
        ) as any

        const combinedMatcher = isAnyOf(...matchers)

        return combinedMatcher(action)
    }
}
