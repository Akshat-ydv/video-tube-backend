import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if(!isValidObjectId(channelId)){
    throw new ApiError("Channel does not exist")
  }
  if(!isValidObjectId(userId)){
    throw new ApiError("Invalid user")
  }

  const isSubscribed = await Subscription.findOneAndDelete({
    subscriber: userId,
    channel: channelId
  });

  if(isSubscribed){
    return  res.status(200).json(new ApiResponse(200, {subscribed: false}, "Usubscribed successfully"))
  }

  const subscribe = await Subscription.create({
    subscriber: userId,
    channel: channelId,
  });

  return res.status(200).json(new ApiResponse(200, {subscribed: true}, "Subscribed successfully"))

});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if(!isValidObjectId(channelId)){
    throw new ApiError("Invalid channel ID")
  }

  const subscribers = await Subscription.find({ channel: channelId })
    .populate("subscriber", "username fullName avatar")
    .sort({ createdAt: -1 });

  const subscriber = subscribers.map((subs) => subs.subscriber);

  return res.status(200).json(new ApiResponse(200, subscriber, "subscribers fetched successfully"))

});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError("Invalid subscriber ID");
  }

  const channels = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username fullName avatar")
    .sort({ createdAt: -1 });

   const channel = channels.map((ch) => ch.channel);

   return res
     .status(200)
     .json(
       new ApiResponse(200, channel, "channels fetched successfully")
     ); 

});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
