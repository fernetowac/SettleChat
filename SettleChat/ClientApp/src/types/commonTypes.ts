import { isDate } from 'lodash'
import { AppDispatch } from '..';
import { ApplicationState } from '../store';
/**
 * K: type in which including (K) all types of T1 will be replaced by type T
 * Usefull, when needed to create serializable type out of existing (perhaps) nonserializable one
 * */
export type ReplaceCombined<K, T1, T> =
    K extends T1 ? T :
    null | T1 extends K ? null | T :
    undefined | T1 extends K ? undefined | T :
    K extends object ? {
        [P in keyof K]: ReplaceCombined<K[P], T1, T>
    } :
    K
    ;

/** 
 *  Can be used in fetch since dates in API are serialized to ISO string 
 * */
export type ApiType<T> = ReplaceCombined<T, Date, string>

/** 
 *  Can be used in REDUX store since it's better to compare dates transformed to UNIX time (in miliseconds) then string dates 
 * */
export type ReduxType<T> = ReplaceCombined<T, Date, number>

/**
 * Converts object recursively into ApiType<T> by changing any Date into ISO string
 * @param source
 */
export const toObjectWithIsoStringDate = <T extends object>(source: T): ApiType<T> => {
    if (isDate(source)) {
        return source.toISOString() as ApiType<T>
    }
    if (typeof source === 'function') {
        throw Error('function is not convertible to redux type')
    }

    if (typeof source !== 'object') {
        return source
    }
    if (source === null || source === undefined) {
        return source
    }
    let result: Record<string, ReduxType<Serializable>> = {}
    Object.entries(source).forEach(([key, value]) => (result[key] = toObjectWithIsoStringDate(value)))
    return result as ApiType<T>;
}

type JsonPrimitive = string | number | boolean | null | undefined | void
interface JsonMap { [member: string]: JsonPrimitive | JsonArray | JsonMap }
interface JsonArray extends Array<JsonPrimitive | JsonArray | JsonMap> { }
/**
 * Serializable to JSON. Can be used in API, REDUX store, ..
 * It doesn't work well on types (it's getting "Index signature is missing in type", more here: https://github.com/microsoft/TypeScript/issues/15300)
 * */
export type Serializable = JsonPrimitive | JsonMap | JsonArray

export type Identifiable = {
    id: string
}

export interface ValidationError {
    key: string | null;
    errorMessage: string;
}

export type AppThunkApiConfig = { state: ApplicationState, dispatch: AppDispatch }