export class Ascending {
    private static compare = <T, P extends number | Date | string>(
        a: T,
        b: T,
        getter: (c: T) => P
    ): number => {
        if (getter(a) < getter(b)) {
            return -1
        } else if (getter(a) > getter(b)) {
            return 1
        }
        return 0
    }

    public static by = <T, TProperty extends number | Date | string>(
        getProperty: (value: T) => TProperty
    ) => (first: T, second: T) => Ascending.compare(first, second, getProperty)
}

export class Descending {
    public static by = <T, TProperty extends number | Date | string>(
        getProperty: (value: T) => TProperty
    ) => (first: T, second: T) => Ascending.by(getProperty)(second, first) //Note switched values when calling ascending comparer
}

/**
 * Returns lowest item from collection. Lowest means item, with getSortedProperty pointing to lowest value.
 * @param collection
 * @param getSortProperty Specifies property of collection item to be sorted by
 */
export const lowestBy = <T, TSortProperty>(
    collection: T[],
    getSortProperty: (item: T) => TSortProperty
): T | undefined =>
    collection.length
        ? collection.reduce((previous, current) =>
              getSortProperty(previous) > getSortProperty(current) ? current : previous
          )
        : undefined

/**
 * Curried version of lowestBy which takes sort property selector at first and collection argument can be supplied later
 * @param getSortProperty Specifies property of collection item to be sorted by
 */
export const getLowestBy = <T, TSortProperty>(
    getSortProperty: (item: T) => TSortProperty
): ((collection: T[]) => T | undefined) => (collection: T[]): T | undefined =>
    lowestBy(collection, getSortProperty)

/**
 * Returns highest item from collection. Highest means item, with getSortedProperty pointing to highest value.
 * @param collection
 * @param getSortProperty Specifies property of collection item to be sorted by
 */
export const highestBy = <T, TSortProperty>(
    collection: T[],
    getSortProperty: (item: T) => TSortProperty
): T | undefined =>
    collection.length
        ? collection.reduce((previous, current) =>
              getSortProperty(previous) < getSortProperty(current) ? current : previous
          )
        : undefined

/**
 * Curried version of highestBy which takes sort property selector at first and collection argument can be supplied later
 * @param getSortProperty Specifies property of collection item to be sorted by
 */
export const getHighestBy = <T, TSortProperty>(
    getSortProperty: (item: T) => TSortProperty
): ((collection: T[]) => T | undefined) => (collection: T[]): T | undefined =>
    highestBy(collection, getSortProperty)
