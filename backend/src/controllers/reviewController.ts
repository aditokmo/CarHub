import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Review from "../models/Review";
import User from "../models/User";
import { PrivateRequest } from "../types";
import { Response } from "express";

const isValidObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

const recalculateRating = async (serviceProviderId: string) => {
    const stats = await Review.aggregate([
        { $match: { serviceProvider: new mongoose.Types.ObjectId(serviceProviderId) } },
        {
            $group: {
                _id: '$serviceProvider',
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await User.findByIdAndUpdate(serviceProviderId, {
            'serviceProviderDetails.rating.average': Math.round(stats[0].avgRating * 10) / 10,
            'serviceProviderDetails.rating.count': stats[0].count
        });
    } else {
        await User.findByIdAndUpdate(serviceProviderId, {
            'serviceProviderDetails.rating.average': 0,
            'serviceProviderDetails.rating.count': 0
        });
    }
};

export const createReview = asyncHandler(async (req: PrivateRequest, res: Response) => {
    const reviewerId = req.id;
    const { serviceProvider, rating, comment } = req.body;

    if (!serviceProvider || !rating) {
        res.status(400).json({ status: 'error', message: 'Service provider and rating are required' });
        return;
    }

    if (!isValidObjectId(serviceProvider)) {
        res.status(400).json({ status: 'error', message: 'Invalid service provider id' });
        return;
    }

    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'customer') {
        res.status(403).json({ status: 'error', message: 'Only customers can leave reviews' });
        return;
    }

    const serviceProviderUser = await User.findById(serviceProvider);
    if (!serviceProviderUser || serviceProviderUser.role !== 'serviceProvider') {
        res.status(404).json({ status: 'error', message: 'Service provider not found' });
        return;
    }

    const existingReview = await Review.findOne({ reviewer: reviewerId, serviceProvider });
    if (existingReview) {
        res.status(400).json({ status: 'error', message: 'You have already reviewed this service provider' });
        return;
    }

    const review = await Review.create({ reviewer: reviewerId, serviceProvider, rating, comment });

    await recalculateRating(serviceProvider);

    res.status(201).json({ status: 'success', review });
});

export const getServiceProviderReviews = asyncHandler(async (req, res) => {
    const { serviceProviderId } = req.params;

    if (!isValidObjectId(serviceProviderId)) {
        res.status(400).json({ status: 'error', message: 'Invalid service provider id' });
        return;
    }

    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider || serviceProvider.role !== 'serviceProvider') {
        res.status(404).json({ status: 'error', message: 'Service provider not found' });
        return;
    }

    const reviews = await Review.find({ serviceProvider: serviceProviderId })
        .populate('reviewer', 'name profileImage')
        .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', reviews });
});

export const updateReview = asyncHandler(async (req: PrivateRequest, res: Response) => {
    const reviewerId = req.id;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!isValidObjectId(reviewId)) {
        res.status(400).json({ status: 'error', message: 'Invalid review id' });
        return;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
        res.status(404).json({ status: 'error', message: 'Review not found' });
        return;
    }

    if (review.reviewer.toString() !== reviewerId) {
        res.status(403).json({ status: 'error', message: 'You can only update your own reviews' });
        return;
    }

    const hasChanges = (rating !== undefined && rating !== review.rating) || (comment !== undefined && comment !== review.comment);

    if (!hasChanges) {
        res.status(400).json({ status: 'error', message: 'No changes detected' });
        return;
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    await recalculateRating(review.serviceProvider.toString());

    res.status(200).json({ status: 'success', review });
});

export const deleteReview = asyncHandler(async (req: PrivateRequest, res: Response) => {
    const reviewerId = req.id;
    const { reviewId } = req.params;

    if (!isValidObjectId(reviewId)) {
        res.status(400).json({ status: 'error', message: 'Invalid review id' });
        return;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
        res.status(404).json({ status: 'error', message: 'Review not found' });
        return;
    }

    if (review.reviewer.toString() !== reviewerId) {
        res.status(403).json({ status: 'error', message: 'You can only delete your own reviews' });
        return;
    }

    const serviceProviderId = review.serviceProvider.toString();

    await review.deleteOne();

    await recalculateRating(serviceProviderId);

    res.status(200).json({ status: 'success', message: 'Review deleted successfully' });
});
