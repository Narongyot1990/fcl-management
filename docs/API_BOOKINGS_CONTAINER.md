# Booking Container Update API

## Overview
External integration endpoint to update container information for existing bookings. Validates container numbers against ISO 6346 standard and updates 5 specific container fields.

## Endpoint
```
POST /api/bookings/container
```

## Authentication
Required header: `X-API-Key: <your_api_key>`

**Production API Key**: `yG0CC6FH0j30IdY3hQmJXSOqqJiJSVPnUOOsPzUyues`

### Vercel Environment Setup
To use this endpoint in production, ensure `OCR_API_SECRET` is set in Vercel:

```bash
# Set via Vercel CLI
vercel env add OCR_API_SECRET production
# Enter value: yG0CC6FH0j30IdY3hQmJXSOqqJiJSVPnUOOsPzUyues

# Or via Vercel Dashboard:
# Project Settings → Environment Variables → Add New
# Name: OCR_API_SECRET
# Value: yG0CC6FH0j30IdY3hQmJXSOqqJiJSVPnUOOsPzUyues
# Environment: Production
```

## Request Body
```json
{
  "booking_no":          "BK-2025-001",    // required - must exist in system
  "container_no":        "MSCU1234567",    // required - ISO 6346 validated
  "seal_no":             "SL123456",       // optional
  "container_size":      "40HC",           // optional
  "container_size_code": "45G1",           // optional
  "tare_weight":         "3800"            // optional
}
```

## Field Descriptions
| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `booking_no` | Yes | Booking number that must exist in the system (case-insensitive match) | `BK-2025-001` |
| `container_no` | Yes | Container number validated against ISO 6346 standard | `MSCU1234567` |
| `seal_no` | No | Seal number | `SL123456` |
| `container_size` | No | Container size description | `40HC`, `20`, `40` |
| `container_size_code` | No | ISO type code | `45G1`, `22G1` |
| `tare_weight` | No | Tare weight in KG | `3800` |

## Response Codes

| Status Code | Meaning | Response Body |
|-------------|---------|---------------|
| `200` | Success - container fields updated | `{"updated": true, "booking": {...}}` |
| `401` | Unauthorized - missing/invalid API key | `{"detail": "Invalid or missing X-API-Key"}` |
| `404` | Booking not found | `{"detail": "Booking 'BK-2025-001' not found in the system"}` |
| `422` | Validation error | `{"field": "container_no", "error": "Invalid ISO 6346 check digit..."}` |

## ISO 6346 Container Number Validation

Container numbers must follow the ISO 6346 standard:
- **Format**: 4 letters + 6 digits + 1 check digit (11 characters total)
- **Example**: `MSCU1234567`
  - `MSCU` - Owner code (4 letters)
  - `123456` - Serial number (6 digits)
  - `7` - Check digit

### Validation Rules
1. Regex pattern: `[A-Z]{4}\d{7}`
2. Check digit algorithm:
   - Letters map to values (A=10, B=12, C=13, ..., skipping multiples of 10)
   - Digits map to their numeric value
   - Weighted sum: `total = Σ(value × 2^position)` for positions 0-9
   - Check digit = `total % 11` (if remainder = 10, check digit = 0)

## Usage Examples

### Successful Update
```bash
curl -X POST https://your-domain.com/api/bookings/container \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "booking_no": "BK-2025-001",
    "container_no": "MSCU1234567",
    "seal_no": "SL123456",
    "container_size": "40HC",
    "container_size_code": "45G1",
    "tare_weight": "3800"
  }'
```

Response:
```json
{
  "updated": true,
  "booking": {
    "_id": "...",
    "booking_no": "BK-2025-001",
    "container_no": "MSCU1234567",
    "seal_no": "SL123456",
    "container_size": "40HC",
    "container_size_code": "45G1",
    "tare_weight": "3800",
    "created_at": "2025-03-12T06:00:00Z"
  }
}
```

### Validation Error
```bash
curl -X POST https://your-domain.com/api/bookings/container \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "booking_no": "BK-2025-001",
    "container_no": "INVALID123"
  }'
```

Response:
```json
{
  "field": "container_no",
  "error": "Container number must be 4 letters + 7 digits (e.g. MSCU1234567), got: 'INVALID123'"
}
```

## Implementation Details

### Database Updates
- Only updates the 5 container fields defined in `_UPDATABLE_FIELDS_BOOKING_CONTAINER`
- Uses `booking_no` (case-insensitive) to locate the booking
- Fields set to `null` or omitted are not updated
- Returns the complete updated booking document

### Security
- API key validation via `X-API-Key` header
- All inputs are sanitized (trimmed, uppercased where appropriate)
- ISO 6346 validation prevents malformed container numbers

### Error Handling
- Detailed error messages for debugging
- Proper HTTP status codes for different failure scenarios
- Validation errors include field-specific information

## Integration Notes

1. **Booking must exist**: The endpoint will return 404 if the booking number is not found
2. **ISO 6346 compliance**: Container numbers must pass validation before processing
3. **Partial updates**: Only provided fields are updated; others remain unchanged
4. **Idempotent**: Calling multiple times with same data produces same result
5. **Case handling**: Booking numbers are matched case-insensitively, container numbers are stored in uppercase

## Testing

Use the following test cases to validate integration:

1. **Valid container number**: `MSCU1234567` (check digit 7)
2. **Invalid check digit**: `MSCU1234568` (should return 422)
3. **Invalid format**: `MSC1234567` (should return 422)
4. **Non-existent booking**: Any valid container with fake booking number (should return 404)
5. **Missing API key**: Omit `X-API-Key` header (should return 401)
