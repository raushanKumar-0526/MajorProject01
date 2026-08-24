import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    if (!name?.trim()) {
        throw new ApiError(
            400,
            "Playlist name is required"
        )
    }

    const playlist = await PlayList.create({

        name: name.trim(),

        description: description?.trim() || "",

        owner: req.user._id,

        videos: []

    })

    const createdPlaylist = await PlayList.findById(
        playlist._id
    )
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )

    if (!createdPlaylist) {
        throw new ApiError(
            500,
            "Something went wrong while creating playlist"
        )
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdPlaylist,
            "Playlist created successfully"
        )
    )

})


const getUserPlaylists = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(
            400,
            "Invalid user id"
        )
    }

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(
            404,
            "User not found"
        )
    }

    const playlists = await PlayList.find({
        owner: userId
    })
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )
        .sort({
            createdAt: -1
        })

    return res.status(200).json(
        new ApiResponse(
            200,
            playlists,
            "User playlists fetched successfully"
        )
    )

})


const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(
            400,
            "Invalid playlist id"
        )
    }

    const playlist = await PlayList.findById(
        playlistId
    )
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        )
    )

})


const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(
            400,
            "Invalid playlist id"
        )
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video id"
        )
    }

    const playlist = await PlayList.findById(
        playlistId
    )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    if (
        playlist.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to modify this playlist"
        )
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(
            404,
            "Video not found"
        )
    }

    if (playlist.videos.some(
        (id) => id.toString() === videoId.toString()
    )) {
        throw new ApiError(
            400,
            "Video is already in the playlist"
        )
    }

    playlist.videos.push(videoId)

    await playlist.save()

    const updatedPlaylist = await PlayList.findById(
        playlist._id
    )
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video added to playlist successfully"
        )
    )

})


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(
            400,
            "Invalid playlist id"
        )
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video id"
        )
    }

    const playlist = await PlayList.findById(
        playlistId
    )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    if (
        playlist.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to modify this playlist"
        )
    }

    const videoExists = playlist.videos.some(
        (id) => id.toString() === videoId.toString()
    )

    if (!videoExists) {
        throw new ApiError(
            404,
            "Video not found in playlist"
        )
    }

    playlist.videos = playlist.videos.filter(
        (id) => id.toString() !== videoId.toString()
    )

    await playlist.save()

    const updatedPlaylist = await PlayList.findById(
        playlist._id
    )
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video removed from playlist successfully"
        )
    )

})


const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(
            400,
            "Invalid playlist id"
        )
    }

    const playlist = await PlayList.findById(
        playlistId
    )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    if (
        playlist.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to delete this playlist"
        )
    }

    await PlayList.findByIdAndDelete(playlistId)

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Playlist deleted successfully"
        )
    )

})


const updatePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(
            400,
            "Invalid playlist id"
        )
    }

    const playlist = await PlayList.findById(
        playlistId
    )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found"
        )
    }

    if (
        playlist.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to update this playlist"
        )
    }

    if (
        name === undefined &&
        description === undefined
    ) {
        throw new ApiError(
            400,
            "At least one field is required to update"
        )
    }

    if (name !== undefined) {

        if (!name.trim()) {
            throw new ApiError(
                400,
                "Playlist name cannot be empty"
            )
        }

        playlist.name = name.trim()
    }

    if (description !== undefined) {
        playlist.description = description.trim()
    }

    await playlist.save()

    const updatedPlaylist = await PlayList.findById(
        playlist._id
    )
        .populate(
            "owner",
            "userName fullName avatar"
        )
        .populate(
            "videos",
            "id videofile thumbnail title description duration views isPublished"
        )

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist updated successfully"
        )
    )

})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}