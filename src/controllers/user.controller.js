import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  // get user from frontend
  // validation - not empty
  // check if user already exists : by username, email
  // chech for images, check for avatar
  // upload them to cloudnary, and check if avatar uploaded or not
  // create user object - create entry in db
  // remove password and refresh token field fron response
  // check for user creation
  // return res

  const {username, fullName, email, password} = req.body;

  if([username, fullName, email, password].some((field) => field?.trim() === "")){
    throw new ApiError(400, "All fields are required")
  } // if any of them if empty .some() returns true (read .some() on docs)

  /* IMPORTANT - we can also add validator file which validates user inputs such as isEmail
  and many other is is well made in PROJECT 21 you can see it there */

  const existedUser = await User.findOne({
    $or: [{username}, {email}]
  })

  if(existedUser){
    throw new ApiError(409, "User with email or username already exists")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    password,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))

  

})

export { registerUser };
