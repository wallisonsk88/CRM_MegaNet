module.exports = (request, response) => {
    const envCheck = {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'Set' : 'Missing',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Missing',
        NODE_VERSION: process.version,
    };

    response.status(200).json({
        status: 'online',
        message: 'Diagnostic Endpoint',
        environment: envCheck,
        timestamp: new Date().toISOString()
    });
}
