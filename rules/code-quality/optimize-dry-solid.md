# Optimize Code - DRY & SOLID Principles

## Core Principles

### DRY (Don't Repeat Yourself)

- **Eliminate Duplication**: Never copy-paste code. Extract common functionality into reusable functions, components, or modules.
- **Single Source of Truth**: Each piece of knowledge should have a single, authoritative representation.
- **Abstraction Layers**: Use appropriate abstraction to hide implementation details.

### SOLID Principles

#### Single Responsibility Principle (SRP)
- A class/module should have only one reason to change
- Each function should do one thing well
- Separate concerns clearly

#### Open/Closed Principle (OCP)
- Software entities should be open for extension, closed for modification
- Use interfaces and abstractions to allow extension
- Avoid modifying existing code when adding features

#### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for their base types
- Derived classes must enhance, not break, base functionality

#### Interface Segregation Principle (ISP)
- Many client-specific interfaces are better than one general-purpose interface
- Don't force clients to depend on methods they don't use

#### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- High-level modules shouldn't depend on low-level modules

## Optimization Strategies

### Code Organization
```
src/
  components/     # Reusable UI components
  hooks/          # Custom React hooks
  utils/          # Pure utility functions
  services/       # API and business logic
  types/          # TypeScript type definitions
  constants/      # Application constants
```

### Refactoring Checklist

1. **Identify Duplication**
   - Look for similar code blocks
   - Check for repeated patterns
   - Note similar function signatures

2. **Extract Common Logic**
   - Create utility functions
   - Build custom hooks
   - Design reusable components

3. **Apply Design Patterns**
   - Factory Pattern for object creation
   - Strategy Pattern for algorithms
   - Observer Pattern for events

4. **Simplify Conditionals**
   - Use early returns
   - Extract complex conditions
   - Replace nested ifs with guard clauses

### Performance Optimization

- **Memoization**: Use `useMemo` and `useCallback` appropriately
- **Lazy Loading**: Load components and data on demand
- **Code Splitting**: Split bundles for faster initial load
- **Debouncing/Throttling**: Control high-frequency events

## Code Quality Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Cyclomatic Complexity | < 10 | Number of independent paths |
| Function Length | < 50 lines | Lines per function |
| File Length | < 300 lines | Lines per file |
| Coupling | Low | Dependencies between modules |
| Cohesion | High | Related code together |

## Anti-Patterns to Avoid

1. **God Objects**: Classes that know/do too much
2. **Spaghetti Code**: Tangled, hard-to-follow logic
3. **Copy-Paste Programming**: Duplicated code
4. **Premature Optimization**: Optimizing before measuring
5. **Magic Numbers**: Unexplained numeric constants
6. **Deep Nesting**: More than 3 levels of indentation

## Example: Before and After

### Before (Violates DRY & SRP)
```javascript
function processUser(user) {
  // Validation
  if (!user.email || !user.email.includes('@')) {
    throw new Error('Invalid email');
  }
  if (!user.name || user.name.length < 2) {
    throw new Error('Invalid name');
  }
  
  // Database operations
  const db = connectDB();
  const existing = db.query('SELECT * FROM users WHERE email = ?', [user.email]);
  if (existing) {
    throw new Error('User exists');
  }
  db.query('INSERT INTO users...', [user]);
  
  // Email sending
  const transporter = nodemailer.createTransport({...});
  transporter.sendMail({...});
  
  // Logging
  logger.info('User created', user);
}
```

### After (Follows DRY & SOLID)
```javascript
// utils/validation.js
export const validateEmail = (email) => email?.includes('@');
export const validateName = (name) => name?.length >= 2;

// services/userService.js
export class UserService {
  constructor(db, emailService, logger) {
    this.db = db;
    this.emailService = emailService;
    this.logger = logger;
  }
  
  async create(userData) {
    this.validate(userData);
    await this.ensureUnique(userData.email);
    const user = await this.db.insert(userData);
    await this.emailService.sendWelcome(user);
    this.logger.info('User created', user);
    return user;
  }
  
  validate(userData) {
    if (!validateEmail(userData.email)) throw new ValidationError('Invalid email');
    if (!validateName(userData.name)) throw new ValidationError('Invalid name');
  }
  
  async ensureUnique(email) {
    const existing = await this.db.findByEmail(email);
    if (existing) throw new ConflictError('User exists');
  }
}
```

## Quick Reference

- **DRY**: Extract → Reuse → Maintain
- **SRP**: One responsibility per module
- **OCP**: Extend, don't modify
- **LSP**: Subtypes must honor contracts
- **ISP**: Small, focused interfaces
- **DIP**: Depend on abstractions
