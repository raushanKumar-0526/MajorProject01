import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler ( async (req,res) => {

  //get user detail from frontend
  const {fullName, userName, email, password} = req.body

  //validate user
  if(
    [fullName,userName,email,password].some((val) => val?.trim() === "")
  ){
    throw new ApiError(400,"All fields are required");
  }

  //check if user already exist or not
  const existedUser = await User.findOne({
    $or: [{ email }, { userName }]
  })
  if(existedUser){
    throw new ApiError(409, "User already existed")
  }
  
  //check for image, check for avatar
  const avtarLocalPath = req.files?.avatar[0]?.path
  let coverImageLocalPath;
  if(req.files && (Array.isArray(req.files.coverImage)) && (req.files.coverImage.length > 0)){
    coverImageLocalPath = req.files.coverImage[0].path
  }

  //upload image to cloudinary
  const avatar = await uploadToCloudinary(avtarLocalPath)
  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400, "Avatar is required")
  }

  //create user object- crreate entry in db
  const user = await User.create({
    fullName,
    email,
    userName: userName.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  //remove password and refresh token field from res
  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  //check for user creation
  if(!createdUser){
    throw new ApiError(500, "Something went while registering user")
  }

  //return res
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User created successfully")
  )

})

export {registerUser}