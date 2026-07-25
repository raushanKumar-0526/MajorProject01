import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"

const genrateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false})
    
    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while creating tokens");
  }
}

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


const loginUser = asyncHandler(async (req,res) => { 
  //get data from body
  //login through email or username
  //find user
  //check password
  //generate access and refresh token
  //send cookies

  const {email,userName,password} = req.body
  console.log(email)

  if(!(userName || email)){
    throw new ApiError(400, "username or email required")
  }

  const user = await User.findOne(
    {
      $or: [{userName},{email}]
    }
  )

  if(!user){
    throw new ApiError(404, "User not found");
  }

  const  isPassCorrect = await user.isPasswordCorrect(password)
  if(!isPassCorrect){
    throw new ApiError(401,"Wrong Password")
  }

  const {accessToken,refreshToken} = await genrateAccessTokenAndRefreshToken(user._id)

  const logedinUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(new ApiResponse(
    201,
    {
      user: logedinUser,accessToken,refreshToken
    },
    "User loged in succesfully"
    )
  )

 })

const logoutUser = asyncHandler(async (req,res) => {
  await User.findByIdAndUpdate(req.user._id,
    {
      $set: {
        refreshToken : undefined
      }
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{}, "User logout successfully"))

})

const refreshAccessToken = asyncHandler(async (req,res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
  
 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
 }

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
}