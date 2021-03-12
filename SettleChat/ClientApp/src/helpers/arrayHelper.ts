import { Identifiable } from '../types/commonTypes'

//TODO: get rid of dependency to Identifiable type for example by providing getId() delegate
export const unionArray = <TIdentifiable extends Identifiable>(primaryArray: TIdentifiable[], secondaryArray: TIdentifiable[]) => {
    const mergedArray = [...primaryArray, ...secondaryArray];
    // mergedArray have duplicates, lets remove the duplicates using Set
    let set = new Set();
    let unionArray = mergedArray.filter(item => {
        if (!set.has(item.id)) {
            set.add(item.id);
            return true;
        }
        return false;
    }, set);
    return unionArray;
}

/**
 * Converts array to Map of array values grouped by key specified by getKey
 * @param array
 * @param getKey Selector for grouping key
 */
export const groupBy = <TArrayItem, TKey>(array: TArrayItem[], getKey: (item: TArrayItem) => TKey) => {
    const map = new Map<TKey, TArrayItem[]>();
    array.forEach((item) => {
        const key = getKey(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map
}

/**
 * Converts array to Map
 * @param array
 * @param getKey Selector for map key
 * @param getValue Selector for map value
 */
export const arrayToMap = <TItem, TKey, TValue>(array: TItem[], getKey: (item: TItem) => TKey, getValue: (item: TItem) => TValue): Map<TKey, TValue> =>
    array
        .reduce(
            (map, item) => map.set(
                getKey(item),
                getValue(item)
            ),
            new Map<TKey, TValue>()
        )