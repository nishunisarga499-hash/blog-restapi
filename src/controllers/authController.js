/**
 * Auth controller: register, login and "who am I".
 * Passwords are hashed with bcrypt; sessions are stateless JWTs.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const publicUser = require('../utils/publicUser');
const { validateRegister, validateLogin } = require('../validators/authValidator');

function createAuthController({ config, usersRepo }) {
  const signToken = (user) =>
    jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn,
    });

  // Compared against when the email is unknown so response time does not reveal
  // whether an account exists.
  let dummyHash;
  const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', config.bcryptRounds));

  // POST /auth/register -> 201
  async function register(req, res) {
    const { username, email, password } = validateRegister(req.body);

    if (await usersRepo.findByEmail(email)) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await usersRepo.create({ username, email, passwordHash });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: publicUser(user), token: signToken(user) },
    });
  }

  // POST /auth/login -> 200
  async function login(req, res) {
    const { email, password } = validateLogin(req.body);

    const user = await usersRepo.findByEmail(email);
    const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : getDummyHash());

    if (!user || !passwordOk) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: publicUser(user), token: signToken(user) },
    });
  }

  // GET /auth/me -> 200 (requires token)
  async function me(req, res) {
    res.status(200).json({ success: true, data: req.user });
  }

  return { register, login, me };
}

module.exports = createAuthController;
