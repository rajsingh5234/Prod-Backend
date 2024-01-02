import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { User } from "../User/user.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";

const generateRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId);
        const refreshToken = user.generateRefreshToken();

        return refreshToken;

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // get user details from req
    const { username, email, password } = req.body;
    const requiredFields = ["username", "email", "password"];

    for (let field of requiredFields) {
        const fieldValue = req.body[field];
        if (!fieldValue || !fieldValue.trim()) {
            throw new ApiError(400, `${field} is required`);
        }
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    // check for avatar image
    const avatarLocalPath = req.files?.avatar[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // upload avatar image to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Couldn't upload avatar");
    }

    // register user
    const user = await User.create({
        username,
        email,
        password,
        avatar: avatar.url
    })

    // const createdUser = await User.findById(user._id).select("-password -avatar")
    const createdUser = await User.findById(user._id).select("-password")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    // get login details from req
    const { username, email, password } = req.body;

    // validate login details
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // check if user with this login details exists or not
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User with this username or email does not exists")
    }

    // check if password is correct or not
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials")
    }

    // generate refresh token
    const refreshToken = await generateRefreshToken(user._id);

    const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production"
        // secure: true // now only on https it will work, so for development remove this field 
    }

    // remove unwanted fiels that are not required to send in response
    user.password = undefined;

    return res.status(200).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200, { user, refreshToken }, "User logged in successfully")
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production"
        // secure: true // now only on https it will work, so for development remove this field
    }

    return res.status(200).clearCookie("refreshToken", options).json(
        new ApiResponse(200, {}, "User logged out")
    )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Incorrect old password")
    }

    user.password = newPassword;
    // await user.save({validateBeforeSave: false});
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password updated successfully")
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
})

const updatedAccountDetails = asyncHandler(async (req, res) => {
    const { username, email } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                username,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "User account updated successfully")
    )
})

// best practice:- files update karne ke liye alag api route banao
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Something went wrong while updating avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select("-password")

    // TODO:- before sending avatar plz delete previous file from cloudinary

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updatedAccountDetails,
    updateUserAvatar
}