# Node.js + Express + JWT + MongoDB Rules

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Frontend**: React.js (for admin panel)
- **Authentication**: JWT (JSON Web Tokens)
- **Version Control**: Git
- **Deployment**: Docker (optional)

## Development Strategy

1. **Follow User Requirements Exactly** - Develop strictly according to specified user flows and game rules
2. **Strategic Planning First** - Before starting each feature, plan in detail with pseudocode
3. **Provide Example Flow** - Show pseudocode example for weekly score processing

## Code Style and Structure

### Project Structure
```
src/
  controllers/
  models/
  routes/
  middleware/
    auth.js
    validation.js
  services/
  utils/
  config/
    db.js
    jwt.js
  app.js
  server.js
```

### Express App Setup
```javascript
// app.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

module.exports = app
```

## Authentication with JWT

### JWT Middleware
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = auth
```

### Auth Controller
```javascript
// controllers/auth.js
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    res.json({ token, user: { id: user._id, email: user.email } })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { login }
```

## MongoDB Models

```javascript
// models/User.js
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true })

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)
```

## Route Organization

```javascript
// routes/users.js
const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { getUsers, getUser, updateUser, deleteUser } = require('../controllers/users')

router.get('/', auth, getUsers)
router.get('/:id', auth, getUser)
router.put('/:id', auth, updateUser)
router.delete('/:id', auth, deleteUser)

module.exports = router
```

## Key Implementation Points

- Limit users to max 3 requests per pool
- Track requests and entries separately (numbered 1, 2, 3)
- Implement payment status tracking in request model
- Create entries only after admin approval and payment
- Implement state transitions: Request (pending → approved → entry created)

## Code Quality Requirements

- Follow RESTful API best practices
- Implement proper error handling and input validation
- Ensure code is secure and efficient

## Error Handling Pattern

```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Usage
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find()
  res.json(users)
}))
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```
