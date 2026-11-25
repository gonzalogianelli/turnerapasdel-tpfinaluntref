import { config } from '../config/env.js';
import { registerUser, loginUser, signSessionToken } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: config.cookie.sameSite,
  secure: config.env === 'production',
  path: '/',
};

const startSession = (res, user) => {
  const token = signSessionToken(user);
  res.cookie(config.cookie.name, token, cookieOptions);
};

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  startSession(res, user);
  return res.status(201).json({ status: 'success', data: user });
});

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);
  startSession(res, user);
  return res.status(200).json({ status: 'success', data: user });
});

const logout = (req, res) => {
  res.clearCookie(config.cookie.name, cookieOptions);
  return res.status(200).json({ status: 'success', data: null, message: 'Sesion cerrada' });
};

export { register, login, logout };
