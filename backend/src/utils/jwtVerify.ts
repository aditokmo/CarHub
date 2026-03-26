import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { PrivateRequest } from "../types";
import asyncHandler from "express-async-handler";

interface TokenInterface {
    UserInfo: {
        id: string,
    }
}

export const protect = asyncHandler(async (req: PrivateRequest, res: Response, next: NextFunction) => {
    const headersJwt = req.headers?.authorization?.split(" ")?.at(1);
    if (!headersJwt) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
    }

    const token = jwt.verify(headersJwt, process.env.ACCESS_TOKEN!) as TokenInterface;

    const user = await User.findById(token.UserInfo.id);
    if (!user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
    }

    req.id = user._id.toString()
    next();
});
