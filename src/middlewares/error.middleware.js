const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message;
    const data = err.data || null;
    const success = err.success || false;

    return res.status(statusCode).json({
        statusCode,
        success,
        message,
        data
    })
}

export { errorMiddleware }