# Python FastAPI Best Practices

## Programming Style and Code Organization

### Functional Programming
- Prefer pure functions and declarative programming, avoid unnecessary classes
- Reduce code duplication through iteration and modularization

### Naming Conventions
- Use descriptive variable names (e.g., `is_active`, `has_permission`)
- Files and directories use lowercase with underscores (e.g., `routers/user_routes.py`)

### RORO Pattern
- **R**eceive **O**bject, **R**eturn **O**bject

## Function Definition and Async Handling

### Sync Operations
```python
# Use def for pure functions
def calculate_total(items: list[Item]) -> float:
    return sum(item.price * item.quantity for item in items)
```

### Async Operations
```python
# Use async def for I/O-bound tasks
async def fetch_user(user_id: int) -> User:
    return await db.users.get(user_id)
```

### Type Hints
- All function signatures must include type annotations

```python
from typing import Optional

async def get_user(
    user_id: int,
    include_deleted: bool = False
) -> Optional[User]:
    ...
```

## Data Validation and Serialization

### Pydantic Models
```python
from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    age: int | None = None

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### Avoid Raw Dictionaries
- Don't use raw dictionaries for data passing
- Always use Pydantic models

## Project Structure

```
app/
  main.py
  routers/
    users.py
    auth.py
  models/
    user.py
  schemas/
    user.py
  services/
    user_service.py
  utils/
    helpers.py
  config.py
```

File structure: Exported routers → Sub-routers → Helper functions → Static content → Type definitions (models/schemas)

## Conditional Statements

```python
# Single line without braces for simple conditions
if condition: do_something()

# Early returns
def process_data(data: dict) -> Result:
    if not data:
        return Result.empty()
    
    if data.is_invalid():
        raise ValueError("Invalid data")
    
    return Result.success(transform(data))
```

## Error Handling and Middleware

### Expected Errors
```python
from fastapi import HTTPException, status

async def get_user(user_id: int):
    user = await db.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
```

### Unexpected Errors
```python
from fastapi import Request
from fastapi.responses import JSONResponse

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

### Lifecycle Management
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()

app = FastAPI(lifespan=lifespan)
```

## Performance Optimization

### Async Operations
```python
# All database calls and external API requests use async
async def get_users():
    async with db.session() as session:
        result = await session.execute(select(User))
        return result.scalars().all()
```

### Caching
```python
from functools import lru_cache
import redis

redis_client = redis.Redis()

async def get_cached_data(key: str):
    cached = await redis_client.get(key)
    if cached:
        return json.loads(cached)
    
    data = await fetch_expensive_data()
    await redis_client.setex(key, 3600, json.dumps(data))
    return data
```

### Lazy Loading
```python
# Use lazy loading for large datasets
async def get_users_paginated(skip: int = 0, limit: int = 100):
    query = select(User).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
```

## Recommended Stack

- **FastAPI** with Pydantic v2
- **Async database libraries** (asyncpg/aiomysql)
- **SQLAlchemy 2.0** (if ORM functionality needed)
- **Alembic** for migrations

## Example Router

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    return await user_service.get_users(skip, limit)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin)
):
    return await user_service.create_user(user_data)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```
