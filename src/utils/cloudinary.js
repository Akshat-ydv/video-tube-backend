import { v2 as cloudinary } from "cloudinary";
import { unlink } from "node:fs/promises";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Utility to safely remove local files
const removeLocalFile = async (localFilePath) => {
  try {
    await unlink(localFilePath);
  } catch (error) {
    console.error("Local file cleanup failed:", error.message);
  }
};

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Remove local file after successful upload
    await removeLocalFile(localFilePath);

    return response;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    // Remove local file if upload fails
    await removeLocalFile(localFilePath);

    return null;
  }
};

export { uploadOnCloudinary };
