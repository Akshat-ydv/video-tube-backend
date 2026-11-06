import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 1. Get video statistics
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: userId,
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        videoIds: { $push: "$_id" },
      },
    },
  ]);

  // 2. Handle channel with no videos
  const stats = videoStats[0] || {
    totalVideos: 0,
    totalViews: 0,
    videoIds: [],
  };

  // 3. Get total subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  // 4. Get total likes on channel videos
  const totalLikes = stats.videoIds.length
    ? await Like.countDocuments({
        video: { $in: stats.videoIds },
      })
    : 0;

  // 5. Prepare response
  const channelStats = {
    totalVideos: stats.totalVideos,
    totalViews: stats.totalViews,
    totalSubscribers,
    totalLikes,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelStats,
        "Channel statistics fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 1. Get pagination details
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  // 2. Calculate skip
  const skip = (pageNumber - 1) * limitNumber;

  // 3. Fetch videos and total count simultaneously
  const [videos, totalVideos] = await Promise.all([
    Video.find({ owner: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),

    Video.countDocuments({ owner: userId }),
  ]);

  // 4. Calculate pagination details
  const totalPages = Math.ceil(totalVideos / limitNumber);

  const pagination = {
    totalVideos,
    totalPages,
    currentPage: pageNumber,
    limit: limitNumber,
    hasNextPage: pageNumber < totalPages,
    hasPrevPage: pageNumber > 1,
  };

  // 5. Return response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination,
      },
      "Channel videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
