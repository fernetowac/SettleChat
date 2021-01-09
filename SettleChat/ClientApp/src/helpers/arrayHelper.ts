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