"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = __importDefault(require("../models/User"));
class UserController {
    async createUser(req, res) {
        const { username, interests } = req.body;
        const user = new User_1.default({
            username,
            interests: interests || []
        });
        const savedUser = await user.save();
        res.status(201).json({
            success: true,
            data: savedUser,
            message: 'User created successfully'
        });
    }
    async getUsers(req, res) {
        const { limit = 20, offset = 0 } = req.query;
        const users = await User_1.default.find()
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));
        const total = await User_1.default.countDocuments();
        res.json({
            success: true,
            data: users,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }
    async getUserById(req, res) {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: user
        });
    }
    async updateUser(req, res) {
        const { id } = req.params;
        const { interests } = req.body;
        const user = await User_1.default.findByIdAndUpdate(id, { interests }, { new: true, runValidators: true });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    }
    async deleteUser(req, res) {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
}
exports.UserController = UserController;
