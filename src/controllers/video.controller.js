
import { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// 1. Get all videos with search, sorting and pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const currentPage = Number.parseInt(page, 10);
  const pageLimit = Number.parseInt(limit, 10);

  if (
    !Number.isInteger(currentPage) ||
    !Number.isInteger(pageLimit) ||
    currentPage < 1 ||
    pageLimit < 1
  ) {
    throw new ApiError(400, "Invalid page or limit");
  }

  // Prevent excessively large requests
  const safeLimit = Math.min(pageLimit, 100);
  const skip = (currentPage - 1) * safeLimit;

  // Only allow sorting by specific fields
  const allowedSortFields = ["createdAt", "views", "title"];
  const sortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : "createdAt";

  const sortDirection =
    ["asc", "1"].includes(String(sortType).toLowerCase()) ? 1 : -1;

  const filter = {
    isPublished: true,
  };

  // Search by title or description
  if (query?.trim()) {
    const escapedQuery = query.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    filter.$or = [
      { title: { $regex: escapedQuery, $options: "i" } },
      { description: { $regex: escapedQuery, $options: "i" } },
    ];
  }

  // Filter videos by a particular user
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    filter.owner = userId;
  }

  const [videos, totalVideos] = await Promise.all([
    Video.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(safeLimit)
      .populate("owner", "username fullName avatar"),

    Video.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalVideos,
        currentPage,
        totalPages: Math.ceil(totalVideos / safeLimit),
        limit: safeLimit,
      },
      "Videos fetched successfully"
    )
  );
});


// 2. Publish a video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  // Get files uploaded through multer
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail files are required");
  }

  // Upload both files to Cloudinary
  const [videoUpload, thumbnailUpload] = await Promise.all([
    uploadOnCloudinary(videoLocalPath),
    uploadOnCloudinary(thumbnailLocalPath),
  ]);

  if (!videoUpload || !thumbnailUpload) {
    throw new ApiError(500, "Video or thumbnail upload failed");
  }

  const video = await Video.create({
    videoFile: videoUpload.secure_url || videoUpload.url,
    thumbnail: thumbnailUpload.secure_url || thumbnailUpload.url,
    title: title.trim(),
    description: description.trim(),
    duration: videoUpload.duration || 0,
    owner: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, video, "Video published successfully")
  );
});


// 3. Get video by ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Do not allow non-owners to access unpublished videos
  const isOwner =
    video.owner.toString() === req.user?._id?.toString();

  if (!video.isPublished && !isOwner) {
    throw new ApiError(404, "Video not found");
  }

  const videoWithOwner = await video.populate(
    "owner",
    "username fullName avatar"
  );

  return res.status(200).json(
    new ApiResponse(200, videoWithOwner, "Video fetched successfully")
  );
});


// 4. Update video details
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Find video belonging to logged-in user
  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(404, "Video not found or unauthorized");
  }

  const updateFields = {};

  if (title !== undefined) {
    if (!title.trim()) {
      throw new ApiError(400, "Title cannot be empty");
    }

    updateFields.title = title.trim();
  }

  if (description !== undefined) {
    if (!description.trim()) {
      throw new ApiError(400, "Description cannot be empty");
    }

    updateFields.description = description.trim();
  }

  // Upload new thumbnail if provided
  const thumbnailLocalPath =
    req.files?.thumbnail?.[0]?.path || req.file?.path;

  if (thumbnailLocalPath) {
    const thumbnailUpload = await uploadOnCloudinary(
      thumbnailLocalPath
    );

    if (!thumbnailUpload) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    updateFields.thumbnail =
      thumbnailUpload.secure_url || thumbnailUpload.url;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedVideo, "Video updated successfully")
  );
});


// 5. Delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const deletedVideo = await Video.findOneAndDelete({
    _id: videoId,
    owner: req.user._id,
  });

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found or unauthorized");
  }

  return res.status(200).json(
    new ApiResponse(200, deletedVideo, "Video deleted successfully")
  );
});


// 6. Toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(404, "Video not found or unauthorized");
  }

  // Toggle true to false or false to true
  video.isPublished = !video.isPublished;

  await video.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      video,
      `Video ${video.isPublished ? "published" : "unpublished"} successfully`
    )
  );
});


export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
