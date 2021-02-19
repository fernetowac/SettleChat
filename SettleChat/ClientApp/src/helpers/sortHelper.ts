export class Ascending {

    private static compare = <T, P extends number | Date | string>(a: T, b: T, getter: (c: T) => P): number => {
        if (getter(a) < getter(b)) {
            return 1;
        }
        else if (getter(a) > getter(b)) {
            return -1;
        }
        return 0;
    }

    public static by = <T, TProperty extends number | Date | string>(getProperty: ((first: T) => TProperty)) =>
        (first: T, second: T) =>
            Ascending.compare(first, second, getProperty)
}