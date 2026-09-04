const authService = require('../src/services/authService');
const db = require('../src/db');

describe('Auth Service', () => {
  beforeEach(() => {
    db.memoryStore.users.clear();
    db.memoryStore.usersByEmail.clear();
  });

  test('Successfully registers a new user with hashed password and returns JWT', async () => {
    const res = await authService.register('trader@groww.in', 'securePassword123');
    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('trader@groww.in');
    expect(res.user.id).toBeDefined();
  });

  test('Rejects duplicate email registration with 409 conflict', async () => {
    await authService.register('trader@groww.in', 'securePassword123');
    await expect(authService.register('trader@groww.in', 'anotherPassword'))
      .rejects.toThrow('An account with this email already exists');
  });

  test('Rejects registration with short password (< 6 chars)', async () => {
    await expect(authService.register('new@groww.in', '123'))
      .rejects.toThrow('Password must be at least 6 characters long');
  });

  test('Successfully logs in user with correct password and rejects invalid password', async () => {
    await authService.register('user@groww.in', 'correctPass123');

    const loginRes = await authService.login('user@groww.in', 'correctPass123');
    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.email).toBe('user@groww.in');

    await expect(authService.login('user@groww.in', 'wrongPass'))
      .rejects.toThrow('Invalid email or password');
  });
});
