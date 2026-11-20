import { Router } from "express";

import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Get all videos / Publish a video
router
  .route("/")
  .get(getAllVideos)
  .post(
    verifyJWT,
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    publishAVideo
  );

// Toggle publish status
router.patch("/toggle/publish/:videoId", verifyJWT, togglePublishStatus);

// Get, update or delete a video
router
  .route("/:videoId")
  .get(getVideoById)
  .patch(
    verifyJWT,
    upload.fields([{ name: "thumbnail", maxCount: 1 }]),
    updateVideo
  )
  .delete(verifyJWT, deleteVideo);

export default router;
