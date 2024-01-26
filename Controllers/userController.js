import { StatusCodes } from 'http-status-codes';
import User from '../models/UserModel.js';
import Job from '../models/JobModel.js';
import cloudinary from 'cloudinary';
import { formatImage } from '../middleware/multerMiddleware.js';

/**
 * Get the current user's details.
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.userId });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Exclude sensitive information like password before sending the response
    const userWithoutPassword = user.toJSON();
    res.status(StatusCodes.OK).json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
  }
};

/**
 * Get statistics about the application (e.g., user count, job count).
 */
export const getApplicationStats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const jobs = await Job.countDocuments();
    res.status(StatusCodes.OK).json({ users, jobs });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
  }
};

/**
 * Update user information, including avatar if provided.
 */
export const updateUser = async (req, res) => {
  try {
    // Copy user data from the request and remove sensitive information
    const newUser = { ...req.body };
    delete newUser.password;
    delete newUser.role;

    // If a file is provided, process it with Cloudinary
    if (req.file) {
      const file = formatImage(req.file);
      const response = await cloudinary.v2.uploader.upload(file);

      // Update user's avatar information
      newUser.avatar = response.secure_url;
      newUser.avatarPublicId = response.public_id;
    }

    // Update user information in the database
    const updatedUser = await User.findByIdAndUpdate(req.user.userId, newUser, { new: true });

    // Check if the user was found and updated
    if (!updatedUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // If a file was provided and the user had an existing avatar, delete the old avatar from Cloudinary
    if (req.file && updatedUser.avatarPublicId) {
      await cloudinary.v2.uploader.destroy(updatedUser.avatarPublicId);
    }

    // Send a success response with the updated user information
    res.status(StatusCodes.OK).json({ msg: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
  }
};


