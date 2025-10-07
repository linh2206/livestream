describe('Simple Unit Tests', () => {
  it('should pass basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings correctly', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj).toHaveProperty('name');
    expect(obj.value).toBe(123);
  });
});

