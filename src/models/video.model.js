import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  videofile: {
    type: String,
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  thumbnail: {
    type: String,
    required: true
  },
  title: {
    type:String,
    required: true,
    trim: true,
  },
  description: {
    type: String
  },
  duration: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: true,
  }
},
{
  timestamps: true
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)