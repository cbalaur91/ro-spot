import { locality } from '../address';

describe('locality', () => {
  it('is the town and state of a full street address', () => {
    expect(locality('18405 W Nine Mile Rd, Southfield, MI 48075')).toBe('Southfield, MI');
  });

  it('keeps the ZIP+4 out of it too', () => {
    expect(locality('1 Main St, Detroit, MI 48226-1234')).toBe('Detroit, MI');
  });

  it('keeps a suite line out of the way', () => {
    expect(locality('1 Main St, Suite 4, Detroit, MI 48226')).toBe('Suite 4, Detroit, MI');
  });

  it('says the whole address when there is no street line to drop', () => {
    // Two parts are a town and a state, not a street and a town — dropping the
    // first would leave "MI", which tells the author nothing about their place.
    expect(locality('Detroit, MI')).toBe('Detroit, MI');
    expect(locality('Detroit')).toBe('Detroit');
  });

  it('tidies what it was given', () => {
    expect(locality('  1 Main St ,  Detroit ,  MI 48226 ')).toBe('Detroit, MI');
    expect(locality('   ')).toBe('');
  });
});
