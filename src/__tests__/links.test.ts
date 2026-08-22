import { telUrl, webUrl } from '@/links';

describe('telUrl', () => {
  it('keeps the digits and drops the punctuation a person types', () => {
    expect(telUrl('(313) 555-1234')).toBe('tel:3135551234');
  });

  it('keeps a leading country code', () => {
    expect(telUrl('+1 313 555 1234')).toBe('tel:+13135551234');
  });

  it('refuses text with no dialable number in it', () => {
    expect(telUrl('call us!')).toBeNull();
    expect(telUrl('   ')).toBeNull();
    // A stray digit in a sentence is not a phone number, and offering it as one
    // puts "7" in the dialer.
    expect(telUrl('open 7 days')).toBeNull();
  });
});

describe('webUrl', () => {
  it('leaves an absolute http(s) address alone', () => {
    expect(webUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(webUrl('http://example.com')).toBe('http://example.com');
  });

  it('assumes https for the bare domain people actually write', () => {
    expect(webUrl('example.com')).toBe('https://example.com');
    expect(webUrl('  www.example.com/menu  ')).toBe('https://www.example.com/menu');
  });

  it('accepts a scheme in any case', () => {
    expect(webUrl('HTTPS://Example.com')).toBe('HTTPS://Example.com');
  });

  it('refuses free text that was never a web address', () => {
    // A website field is a text box, and people write in it.
    expect(webUrl('coming soon')).toBeNull();
    expect(webUrl('ask at the counter')).toBeNull();
    expect(webUrl('example')).toBeNull();
    expect(webUrl('https://')).toBeNull();
  });

  it('refuses anything that is not a web address', () => {
    // These are submitted by users and handed to `Linking.openURL`, so a scheme
    // we did not ask for is a refusal, not something to prefix `https://` onto.
    expect(webUrl('javascript:alert(1)')).toBeNull();
    expect(webUrl('tel:+13135551234')).toBeNull();
    expect(webUrl('file:///etc/passwd')).toBeNull();
    expect(webUrl('')).toBeNull();
    expect(webUrl('   ')).toBeNull();
  });
});
