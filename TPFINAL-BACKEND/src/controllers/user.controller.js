import {
  getUserById,
  updateOwnProfile,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../services/user.service.js';
import { parseUserId } from '../utils/userValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getMe = (req, res) => res.status(200).json({ status: 'success', data: req.user });

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateOwnProfile(req.user, req.body);
  return res.status(200).json({ status: 'success', data: user });
});

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listUsers(req.query);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const getById = asyncHandler(async (req, res) => {
  const id = parseUserId(req.params.id);
  const user = await getUserById(id);
  return res.status(200).json({ status: 'success', data: user });
});

const create = asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  return res.status(201).json({ status: 'success', data: user });
});

const update = asyncHandler(async (req, res) => {
  const id = parseUserId(req.params.id);
  const user = await updateUser(id, req.body);
  return res.status(200).json({ status: 'success', data: user });
});

const remove = asyncHandler(async (req, res) => {
  const user = await deleteUser(req.params.id);
  return res.status(200).json({ status: 'success', data: user });
});

export { getMe, updateMe, list, getById, create, update, remove };
