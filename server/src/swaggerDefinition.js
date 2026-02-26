module.exports = {
  openapi: '3.0.0',
  info: {
    title: '易宿酒店预订平台 API',
    version: '1.0.0'
  },
  servers: [
    { url: 'http://127.0.0.1:4100' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AuthSmsSend: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          username: { type: 'string' }
        }
      },
      AuthRegister: {
        type: 'object',
        required: ['password', 'role', 'code'],
        properties: {
          phone: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['merchant', 'admin'] },
          code: { type: 'string' }
        }
      },
      AuthLogin: {
        type: 'object',
        required: ['password'],
        properties: {
          phone: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      AdminStatusUpdate: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected', 'offline', 'restore'] },
          rejectReason: { type: 'string' }
        }
      },
      RoomType: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          hotel_id: { type: 'number' },
          name: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'number' },
          images: { type: 'array', items: { type: 'string' } }
        }
      },
      Promotion: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          value: { type: 'number' }
        }
      },
      Hotel: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          merchant_id: { type: 'number' },
          name: { type: 'string' },
          name_en: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          star_rating: { type: 'number' },
          opening_time: { type: 'string' },
          description: { type: 'string' },
          facilities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { type: 'string' } },
          nearby_attractions: { type: 'array', items: { type: 'string' } },
          nearby_transport: { type: 'array', items: { type: 'string' } },
          nearby_malls: { type: 'array', items: { type: 'string' } },
          promotions: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } },
          status: { type: 'string' },
          reject_reason: { type: 'string' },
          created_at: { type: 'string' }
        }
      },
      HotelInput: {
        type: 'object',
        required: ['name', 'address', 'city'],
        properties: {
          name: { type: 'string' },
          name_en: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          star_rating: { type: 'number' },
          opening_time: { type: 'string' },
          description: { type: 'string' },
          facilities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { type: 'string' } },
          nearby_attractions: { type: 'array', items: { type: 'string' } },
          nearby_transport: { type: 'array', items: { type: 'string' } },
          nearby_malls: { type: 'array', items: { type: 'string' } },
          promotions: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } },
          roomTypes: { type: 'array', items: { $ref: '#/components/schemas/RoomType' } }
        }
      }
    }
  }
}
