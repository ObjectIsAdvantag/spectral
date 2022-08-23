import { segregateEntriesPerKind } from '../segregateEntriesPerKind';

describe('segregateEntriesPerKind', () => {
  it.concurrent('can operate on empty arrays', () => {
    expect(segregateEntriesPerKind([])).toEqual([[], []]);
  });

  it.concurrent('returns strings in first output', () => {
    expect(segregateEntriesPerKind(['a', 'b'])).toEqual([['a', 'b'], []]);
  });

  it.concurrent('returns numbers in second output', () => {
    expect(segregateEntriesPerKind([1, 2])).toEqual([[], [1, 2]]);
  });

  it.concurrent('splits entries in proper outputs', () => {
    expect(segregateEntriesPerKind(['a', 'b', 1, 'd', 2, 'e'])).toEqual([
      ['a', 'b', 'd', 'e'],
      [1, 2],
    ]);
  });
});
