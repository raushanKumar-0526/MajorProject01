import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {

    const userId = req.user._id

    const channelObjectId = new mongoose.Types.ObjectId(
        userId
    )

    const videoStats = await Video.aggregate([

        {
            $match: {
                owner: channelObjectId
            }
        },

        {
            $group: {
                _id: null,

                totalVideos: {
                    $sum: 1
                },

                totalViews: {
                    $sum: "$views"
                },

                videoIds: {
                    $push: "$_id"
                }
            }
        }

    ])

    const totalVideos = videoStats.length > 0
        ? videoStats[0].totalVideos
        : 0

    const totalViews = videoStats.length > 0
        ? videoStats[0].totalViews
        : 0

    const videoIds = videoStats.length > 0
        ? videoStats[0].videoIds
        : []

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    })

    const totalLikes = videoIds.length > 0
        ? await Like.countDocuments({
            video: {
                $in: videoIds
            }
        })
        : 0

    const stats = {

        totalVideos,

        totalViews,

        totalSubscribers,

        totalLikes

    }

    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Channel stats fetched successfully"
        )
    )

})


const getChannelVideos = asyncHandler(async (req, res) => {

    const userId = req.user._id

    const videos = await Video.find({
        owner: userId
    })
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .sort({
            createdAt: -1
        })

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        )
    )

})


export {
    getChannelStats,
    getChannelVideos
}