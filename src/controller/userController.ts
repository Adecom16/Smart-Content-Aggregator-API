import { Request, Response } from 'express';
import User from '../models/User';

export class UserController {
  async createUser(req: Request, res: Response): Promise<void> {
    const { username, interests } = req.body;

    const user = new User({
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

  async getUsers(req: Request, res: Response): Promise<void> {
    const { limit = 20, offset = 0 } = req.query;
    
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await User.countDocuments();
    
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

  async getUserById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
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

  async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { interests } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { interests },
      { new: true, runValidators: true }
    );
    
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

  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    
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