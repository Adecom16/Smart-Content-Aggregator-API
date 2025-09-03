"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.swaggerUiInstance = exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart Content Aggregator API',
            version: '1.0.0',
            description: ' A smart content aggregation API with AI-powered features including:',
            contact: {
                name: 'API Support',
                email: 'support@aggregator.com'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://j.com/api'
                    : 'http://localhost:3000/api',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
            }
        ],
        components: {
            schemas: {
                Article: {
                    type: 'object',
                    required: ['title', 'content', 'author'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Unique identifier',
                            example: '65f1a2b3c4d5e6f7g8h9i0j1'
                        },
                        title: {
                            type: 'string',
                            minLength: 5,
                            maxLength: 200,
                            description: 'Article title',
                            example: 'Introduction to Machine Learning'
                        },
                        content: {
                            type: 'string',
                            minLength: 50,
                            description: 'Article content',
                            example: 'Machine learning is a subset of artificial intelligence that focuses on...'
                        },
                        author: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 100,
                            description: 'Article author',
                            example: 'John Doe'
                        },
                        summary: {
                            type: 'string',
                            maxLength: 500,
                            description: 'Article summary (auto-generated if not provided)',
                            example: 'This article introduces the basics of machine learning...'
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Article tags',
                            example: ['machine-learning', 'ai', 'technology']
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                User: {
                    type: 'object',
                    required: ['username'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Unique identifier',
                            example: '65f1a2b3c4d5e6f7g8h9i0j2'
                        },
                        username: {
                            type: 'string',
                            minLength: 3,
                            maxLength: 30,
                            pattern: '^[a-zA-Z0-9_]+$',
                            description: 'Unique username',
                            example: 'johndoe123'
                        },
                        interests: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'User interests for recommendations',
                            example: ['technology', 'science', 'sports']
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                Interaction: {
                    type: 'object',
                    required: ['userId', 'articleId', 'interactionType'],
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Unique identifier',
                            example: '65f1a2b3c4d5e6f7g8h9i0j3'
                        },
                        userId: {
                            type: 'string',
                            description: 'User ID',
                            example: '65f1a2b3c4d5e6f7g8h9i0j2'
                        },
                        articleId: {
                            type: 'string',
                            description: 'Article ID',
                            example: '65f1a2b3c4d5e6f7g8h9i0j1'
                        },
                        interactionType: {
                            type: 'string',
                            enum: ['view', 'like', 'share', 'comment'],
                            description: 'Type of interaction',
                            example: 'like'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Interaction timestamp'
                        }
                    }
                },
                Recommendation: {
                    type: 'object',
                    properties: {
                        article: {
                            $ref: '#/components/schemas/Article'
                        },
                        score: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                            description: 'Recommendation score (0-1)',
                            example: 0.85
                        },
                        reasons: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Reasons for recommendation',
                            example: ['Matches your interests: technology, ai', 'Popular among users']
                        }
                    }
                },
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Request success status'
                        },
                        message: {
                            type: 'string',
                            description: 'Response message'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data'
                        }
                    }
                },
                PaginationResponse: {
                    allOf: [
                        { $ref: '#/components/schemas/ApiResponse' },
                        {
                            type: 'object',
                            properties: {
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        total: {
                                            type: 'integer',
                                            description: 'Total number of items'
                                        },
                                        limit: {
                                            type: 'integer',
                                            description: 'Items per page'
                                        },
                                        offset: {
                                            type: 'integer',
                                            description: 'Offset from start'
                                        },
                                        page: {
                                            type: 'integer',
                                            description: 'Current page number'
                                        },
                                        totalPages: {
                                            type: 'integer',
                                            description: 'Total number of pages'
                                        }
                                    }
                                }
                            }
                        }
                    ]
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error type'
                        },
                        message: {
                            type: 'string',
                            description: 'Error message'
                        },
                        details: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Error details'
                        }
                    }
                }
            },
            parameters: {
                LimitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Number of items to return',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    }
                },
                OffsetParam: {
                    name: 'offset',
                    in: 'query',
                    description: 'Number of items to skip',
                    schema: {
                        type: 'integer',
                        minimum: 0,
                        default: 0
                    }
                },
                PageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Page number (alternative to offset)',
                    schema: {
                        type: 'integer',
                        minimum: 1
                    }
                },
                IdParam: {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: 'Resource ID',
                    schema: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$'
                    }
                }
            },
            responses: {
                Success: {
                    description: 'Successful operation',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ApiResponse'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                error: 'Validation Error',
                                details: ['title is required', 'content must be at least 50 characters']
                            }
                        }
                    }
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                error: 'Not Found',
                                message: 'Resource not found'
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                error: 'Internal Server Error',
                                message: 'Something went wrong'
                            }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Articles',
                description: 'Article management operations'
            },
            {
                name: 'Users',
                description: 'User management operations'
            },
            {
                name: 'Interactions',
                description: 'User interaction tracking'
            },
            {
                name: 'Recommendations',
                description: 'AI-powered content recommendations'
            },
        ]
    },
    apis: [
        './src/routes/*.ts',
        './src/server.ts'
    ]
};
exports.specs = (0, swagger_jsdoc_1.default)(options);
exports.swaggerUiInstance = swagger_ui_express_1.default;
