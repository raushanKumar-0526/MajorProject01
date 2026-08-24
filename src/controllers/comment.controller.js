import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const {
        page = 1,
        limit = 10
    } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)

    if (pageNumber < 1) {
        throw new ApiError(
            400,
            "Page number must be greater than 0"
        )
    }

    if (limitNumber < 1) {
        throw new ApiError(
            400,
            "Limit must be greater than 0"
        )
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
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
                    content: 1,
                    video: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: 1,
                        userName: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]),
        {
            page: pageNumber,
            limit: limitNumber
        }
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully"
        )
    )

})


const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const { content } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!content?.trim()) {
        throw new ApiError(
            400,
            "Comment content is required"
        )
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    const createdComment = await Comment.findById(
        comment._id
    ).populate(
        "owner",
        "userName fullName avatar"
    )

    if (!createdComment) {
        throw new ApiError(
            500,
            "Something went wrong while adding comment"
        )
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdComment,
            "Comment added successfully"
        )
    )

})


const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    if (!content?.trim()) {
        throw new ApiError(
            400,
            "Comment content is required"
        )
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (
        comment.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to update this comment"
        )
    }

    comment.content = content.trim()

    await comment.save()

    const updatedComment = await Comment.findById(
        comment._id
    ).populate(
        "owner",
        "userName fullName avatar"
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )

})


const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (
        comment.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to delete this comment"
        )
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Comment deleted successfully"
        )
    )

})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}