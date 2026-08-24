import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query

    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)

    if (pageNumber < 1) {
        throw new ApiError(400, "Page number must be greater than 0")
    }

    if (limitNumber < 1) {
        throw new ApiError(400, "Limit must be greater than 0")
    }

    const matchStage = {
        isPublished: true
    }

    if (query?.trim()) {
        matchStage.$or = [
            {
                title: {
                    $regex: query.trim(),
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query.trim(),
                    $options: "i"
                }
            }
        ]
    }

    if (userId) {

        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }

        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "views",
        "title",
        "duration"
    ]

    const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt"

    const sortOrder = sortType === "asc" ? 1 : -1

    const aggregate = Video.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: {
                [sortField]: sortOrder
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                id: 1,
                videofile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ])

    const options = {
        page: pageNumber,
        limit: limitNumber
    }

    const videos = await Video.aggregatePaginate(
        aggregate,
        options
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    )

})


const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body

    if (!title?.trim()) {
        throw new ApiError(400, "Video title is required")
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path

    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const videoFile = await uploadToCloudinary(videoFileLocalPath)

    if (!videoFile) {
        throw new ApiError(
            500,
            "Something went wrong while uploading video"
        )
    }

    const thumbnail = await uploadToCloudinary(thumbnailLocalPath)

    if (!thumbnail) {
        throw new ApiError(
            500,
            "Something went wrong while uploading thumbnail"
        )
    }

    const video = await Video.create({
        id: new mongoose.Types.ObjectId().toString(),
        videofile: videoFile.secure_url || videoFile.url,
        owner: req.user._id,
        thumbnail: thumbnail.secure_url || thumbnail.url,
        title: title.trim(),
        description: description?.trim() || "",
        duration: videoFile.duration || 0,
        views: 0,
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id).populate(
        "owner",
        "userName fullName avatar"
    )

    if (!createdVideo) {
        throw new ApiError(
            500,
            "Something went wrong while creating video"
        )
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdVideo,
            "Video published successfully"
        )
    )

})


const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "userName fullName avatar"
    )

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (
        !video.isPublished &&
        video.owner._id.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(404, "Video not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    )

})


const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to update this video"
        )
    }

    if (!title?.trim() && description === undefined && !req.file) {
        throw new ApiError(
            400,
            "At least one field is required to update"
        )
    }

    if (title !== undefined) {

        if (!title.trim()) {
            throw new ApiError(400, "Title cannot be empty")
        }

        video.title = title.trim()
    }

    if (description !== undefined) {
        video.description = description.trim()
    }

    if (req.file) {

        const thumbnail = await uploadToCloudinary(
            req.file.path
        )

        if (!thumbnail) {
            throw new ApiError(
                500,
                "Something went wrong while uploading thumbnail"
            )
        }

        video.thumbnail = thumbnail.secure_url || thumbnail.url
    }

    await video.save()

    const updatedVideo = await Video.findById(video._id).populate(
        "owner",
        "userName fullName avatar"
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedVideo,
            "Video updated successfully"
        )
    )

})


const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to delete this video"
        )
    }

    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Video deleted successfully"
        )
    )

})


const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to change publish status"
        )
    }

    video.isPublished = !video.isPublished

    await video.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            video.isPublished
                ? "Video published successfully"
                : "Video unpublished successfully"
        )
    )

})


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}