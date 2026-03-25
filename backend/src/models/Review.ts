import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema({
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceProvider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;