import express from 'express';
import { createReview, deleteReview, getServiceProviderReviews, updateReview } from '../controllers/reviewController';
import { protect } from '../utils/jwtVerify';

const router = express.Router();

router.get('/:serviceProviderId', getServiceProviderReviews);

router.use(protect);

router.post('/', createReview);
router.patch('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

export default router;
