import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid user");
  }

  // Check if the user has already liked this video
  const existingLike = await Like.findOneAndDelete({
    video: videoId,
    likedBy: userId,
  });

  if (existingLike) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Video unliked successfully")
      );
  }

  // Create a new like
  await Like.create({
    video: videoId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { liked: true }, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid user");
  }

  const existingLike = await Like.findOneAndDelete({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Comment Unliked successsfully")
      );
  }

  await Like.create({
    comment: commentId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { liked: true }, "Comment Liked Successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid user");
  }

  const existingLike = await Like.findOneAndDelete({
    tweet: tweetId,
    likedBy: userId,
  });

  if (existingLike) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Tweet Unliked successsfully")
      );
  }

  await Like.create({
    tweet: tweetId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { liked: true }, "Tweet Liked Successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid user");
  }

  const likes = await Like.find({
    likedBy: userId,
    video: { $ne: null },
  })
    .populate("video")
    .sort({ createdAt: -1 });

  const likedVideos = likes.map((like) => like.video);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Successfully fetched all liked videos")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
