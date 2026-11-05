import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  // 1. Get videoId and pagination details
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // 2. Validate videoId
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // 3. Check whether video exists
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 4. Prepare aggregation pipeline
  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        content: 1,
        video: 1,
        createdAt: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          fullName: "$owner.fullName",
          avatar: "$owner.avatar",
        },
      },
    },
  ]);

  // 5. Pagination options
  const options = {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
  };

  // 6. Execute aggregation with pagination
  const comments = await Comment.aggregatePaginate(commentAggregate, options);

  // 7. Return response
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!videoId || !content?.trim()) {
    throw new ApiError(400, "All fields are required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const owner = req.user?._id;

  const comment = await Comment.create({
    content,
    video,
    owner,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "New comment added"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId || !content?.trim()) {
    throw new ApiError(400, "Fields not found");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content?.trim(),
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!commentId) {
    throw new ApiError(400, "Comment required");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!deletedComment) {
    throw new ApiError(404, "Comment not found or Unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
