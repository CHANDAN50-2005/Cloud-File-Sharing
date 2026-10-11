import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { hashToken } from '../src/utils/tokens.js';

describe('Phase 1: Authentication & Session Verification', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test.*@securecloud\.dev/ });
    await RefreshToken.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({ email: /test.*@securecloud\.dev/ });
    await RefreshToken.deleteMany({});
  });

  // ---------------------------------------------------------------------------
  // 1. REGISTRATION TESTS
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('should register a new user, return client JSON, and set httpOnly auth cookies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser1@securecloud.dev',
          password: 'SuperSecretPassword2026!'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('testuser1@securecloud.dev');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).toHaveProperty('csrfToken');

      // Verify cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const hasAccessToken = cookies.some((c) => c.includes('accessToken=') && c.includes('HttpOnly'));
      const hasRefreshToken = cookies.some(
        (c) => c.includes('refreshToken=') && c.includes('HttpOnly') && c.includes('Path=/api/auth')
      );
      const hasCsrfToken = cookies.some((c) => c.includes('csrfToken='));

      expect(hasAccessToken).toBe(true);
      expect(hasRefreshToken).toBe(true);
      expect(hasCsrfToken).toBe(true);

      // Verify Argon2id hash stored in database
      const user = await User.findOne({ email: 'testuser1@securecloud.dev' });
      expect(user).toBeDefined();
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);

      // Verify RefreshToken stored in DB is hashed
      const tokens = await RefreshToken.find({ userId: user._id });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].tokenHash).toBeDefined();
      expect(tokens[0].revokedAt).toBeNull();
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testdup@securecloud.dev',
          password: 'SuperSecretPassword2026!'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testdup@securecloud.dev',
          password: 'DifferentPassword2026!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('should reject password under 10 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testweak1@securecloud.dev',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code');
    });

    it('should reject trivially weak common passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testweak2@securecloud.dev',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should reject passwords made of a single repeated character', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testweak3@securecloud.dev',
          password: 'aaaaaaaaaaaa'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. LOGIN TESTS
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testlogin@securecloud.dev',
          password: 'ValidPassword1234!'
        });
    });

    it('should log in successfully with valid credentials and issue tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testlogin@securecloud.dev',
          password: 'ValidPassword1234!'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('testlogin@securecloud.dev');
      expect(res.body).toHaveProperty('csrfToken');

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('should return generic 401 on incorrect password without user enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testlogin@securecloud.dev',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email address or password.');
    });

    it('should return identical 401 on non-existent email to prevent user enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@securecloud.dev',
          password: 'AnyPassword1234!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email address or password.');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PROTECTED ROUTE TESTS (/api/auth/me)
  // ---------------------------------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('should return 401 UNAUTHORIZED when called without cookies or tokens', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 OK with user profile when valid accessToken cookie is provided', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testme@securecloud.dev',
          password: 'ValidPassword1234!'
        });

      const cookies = reg.headers['set-cookie'];
      const accessCookie = cookies.find((c) => c.startsWith('accessToken='));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [accessCookie]);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('testme@securecloud.dev');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. REFRESH TOKEN ROTATION & REUSE DETECTION
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/refresh (Rotation & Reuse Detection)', () => {
    it('should rotate refresh token and issue new token pair', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testrotate@securecloud.dev',
          password: 'ValidPassword1234!'
        });

      const initialCookies = reg.headers['set-cookie'];
      const initialRefreshCookie = initialCookies.find((c) => c.startsWith('refreshToken='));
      const initialRawToken = initialRefreshCookie.split(';')[0].split('=')[1];
      const initialTokenHash = hashToken(initialRawToken);

      // Perform Refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [initialRefreshCookie]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('user');

      const rotatedCookies = refreshRes.headers['set-cookie'];
      const newRefreshCookie = rotatedCookies.find((c) => c.startsWith('refreshToken='));
      const newRawToken = newRefreshCookie.split(';')[0].split('=')[1];
      const newTokenHash = hashToken(newRawToken);

      // New token must be different from initial token
      expect(newRawToken).not.toBe(initialRawToken);

      // Check DB: Initial token must now be marked revoked and replaced
      const oldTokenDoc = await RefreshToken.findOne({ tokenHash: initialTokenHash });
      expect(oldTokenDoc.revokedAt).not.toBeNull();
      expect(oldTokenDoc.replacedBy).toBe(newTokenHash);

      // Check DB: New token must be active with the SAME familyId
      const newTokenDoc = await RefreshToken.findOne({ tokenHash: newTokenHash });
      expect(newTokenDoc.revokedAt).toBeNull();
      expect(newTokenDoc.familyId).toBe(oldTokenDoc.familyId);
    });

    it('should DETECT REUSE and revoke the ENTIRE session family if an old rotated token is re-used', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testreuse@securecloud.dev',
          password: 'ValidPassword1234!'
        });

      const initialRefreshCookie = reg.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

      // 1st Refresh: Legitimate rotation
      const legimateRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [initialRefreshCookie]);
      expect(legimateRefresh.status).toBe(200);

      const rotatedRefreshCookie = legimateRefresh.headers['set-cookie'].find((c) =>
        c.startsWith('refreshToken=')
      );
      const rotatedRawToken = rotatedRefreshCookie.split(';')[0].split('=')[1];
      const rotatedTokenHash = hashToken(rotatedRawToken);

      // Verify the new token is currently active
      const rotatedDocBefore = await RefreshToken.findOne({ tokenHash: rotatedTokenHash });
      expect(rotatedDocBefore.revokedAt).toBeNull();

      // 2nd Refresh with the OLD initial token: Attacker / replay attempt!
      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [initialRefreshCookie]);

      // Must be rejected with reuse detection code
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('SESSION_REVOKED_REUSE_DETECTED');

      // CRITICAL: The legitimate rotated token in the same family must ALSO be revoked now!
      const rotatedDocAfter = await RefreshToken.findOne({ tokenHash: rotatedTokenHash });
      expect(rotatedDocAfter.revokedAt).not.toBeNull();

      // Attempting to use the legitimate rotated token now should ALSO fail
      const subsequentRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [rotatedRefreshCookie]);
      expect(subsequentRes.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. LOGOUT TESTS
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/logout', () => {
    it('should revoke token in DB and clear cookies on logout', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testlogout@securecloud.dev',
          password: 'ValidPassword1234!'
        });

      const refreshCookie = reg.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
      const rawToken = refreshCookie.split(';')[0].split('=')[1];
      const tokenHash = hashToken(rawToken);

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [refreshCookie]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Check DB: token revoked
      const tokenDoc = await RefreshToken.findOne({ tokenHash });
      expect(tokenDoc.revokedAt).not.toBeNull();

      // Check cookies cleared (Expires in past or empty value)
      const clearCookies = logoutRes.headers['set-cookie'];
      expect(clearCookies.some((c) => c.includes('accessToken=;'))).toBe(true);
      expect(clearCookies.some((c) => c.includes('refreshToken=;'))).toBe(true);
    });
  });
});
