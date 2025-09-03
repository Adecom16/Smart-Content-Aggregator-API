"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const middleware_1 = require("./middleware");
const swagger_1 = require("./config/swagger");
const articles_1 = __importDefault(require("./routes/articles"));
const users_1 = __importDefault(require("./routes/users"));
const interactions_1 = __importDefault(require("./routes/interactions"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
(0, database_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(middleware_1.requestLogger);
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Smart Content Aggregator API',
        version: '1.0.0'
    });
});
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Smart Content Aggregator API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
    }
}));
app.use('/api/articles', articles_1.default);
app.use('/api/users', users_1.default);
app.use('/api/interactions', interactions_1.default);
app.use('/api/recommendations', recommendations_1.default);
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Content Aggregator API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health'
    });
});
app.use(middleware_1.notFound);
app.use(middleware_1.errorHandler);
process.on('SIGINT', async () => {
    process.exit(0);
});
process.on('SIGTERM', async () => {
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
