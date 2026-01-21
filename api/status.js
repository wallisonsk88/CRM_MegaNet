const { createClient } = require('@libsql/client');

module.exports = async (request, response) => {
    const envCheck = {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'Set' : 'Missing',
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Missing',
        NODE_VERSION: process.version,
    };

    let dbStatus = 'Unknown';
    let dbError = null;

    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        try {
            const client = createClient({
                url: process.env.TURSO_DATABASE_URL,
                authToken: process.env.TURSO_AUTH_TOKEN
            });
            await client.execute('SELECT 1');
            dbStatus = 'Connected';
        } catch (err) {
            dbStatus = 'Connection Failed';
            dbError = err.message;
        }
    } else {
        dbStatus = 'Skipped (Missing Env Vars)';
    }

    response.status(200).json({
        status: 'online',
        message: 'Diagnostic Endpoint',
        db_connection: dbStatus,
        db_error: dbError,
        environment: envCheck,
        timestamp: new Date().toISOString()
    });
}
