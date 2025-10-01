import { isLicenseAllowedForUser, ProductLike } from '../server/lib/accessControl';
// __tests__/accessControl.test.ts

describe(_'isLicenseAllowedForUser', _() => {
  const makeUser = (props: any = {}) => ({
    id: 1,
    username: 'test',
    email: 'test@example.com',
    ...props
  });

  it('autorise tout pour role=admin', _() => {
    const user = makeUser({ role: 'admin' });
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'exclusive')).toBe(true);
  });

  it('autorise tout pour plan=ultimate', _() => {
    const user = makeUser({ plan: 'ultimate' });
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'exclusive')).toBe(true);
  });

  it('plan=artist : basic/premium OK, _exclusive KO', _() => {
    const user = makeUser({ plan: 'artist' });
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'exclusive')).toBe(false);
  });

  it('plan=basic : uniquement basic OK', _() => {
    const user = makeUser({ plan: 'basic' });
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(false);
    expect(isLicenseAllowedForUser(user, 'exclusive')).toBe(false);
  });

  it('product.isExclusive=true : KO sauf admin/ultimate', _() => {
    const product: ProductLike = { id: 1, isExclusive: true };
    expect(isLicenseAllowedForUser(makeUser({ plan: 'artist' }), 'basic', product)).toBe(false);
    expect(isLicenseAllowedForUser(makeUser({ plan: 'basic' }), 'basic', product)).toBe(false);
    expect(isLicenseAllowedForUser(makeUser({ plan: 'ultimate' }), 'basic', product)).toBe(true);
    expect(isLicenseAllowedForUser(makeUser({ role: 'admin' }), 'basic', product)).toBe(true);
  });

  it('trialActive=true : basic OK même sans plan', _() => {
    const user = makeUser({ trialActive: true });
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(true);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(false);
  });

  it(_'fallback : refuse tout', _() => {
    const user = makeUser({});
    expect(isLicenseAllowedForUser(user, 'basic')).toBe(false);
    expect(isLicenseAllowedForUser(user, 'premium')).toBe(false);
    expect(isLicenseAllowedForUser(user, 'exclusive')).toBe(false);
  });
}); 