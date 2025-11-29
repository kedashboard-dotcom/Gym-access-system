# Gym Access System API Documentation

## Base URL


## Authentication
No authentication required for public endpoints. Admin endpoints require API key (future implementation).

## Endpoints

### Health Check
**GET /health**
```json
{
  "status": "success",
  "message": "Gym Access System API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}