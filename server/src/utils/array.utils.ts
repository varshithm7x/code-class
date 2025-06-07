/**
 * Groups an array of objects by a specified key.
 * @param array The array to group.
 * @param key The key to group by. Can be a key of the object or a function that returns a string.
 * @returns An object where keys are the grouped values and values are arrays of the original objects.
 */
export const groupBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T | ((item: T) => string)
): Record<string, T[]> => {
  return array.reduce((result, currentItem) => {
    const groupKey = typeof key === 'function' ? key(currentItem) : currentItem[key];
    (result[groupKey] = result[groupKey] || []).push(currentItem);
    return result;
  }, {} as Record<string, T[]>);
}; 