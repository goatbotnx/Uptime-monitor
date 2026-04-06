```markdown
# Server Monitor System

A complete web-based server monitoring system where you can monitor all your servers/websites via API.

## Features

- Real-time server monitoring
- User-based API Key system
- REST API endpoints
- User friendly dashboard
- Admin panel
- Automatic check (every 1 minute)
- Response time tracking

## Installation

### Requirements
- Node.js (v14 or above)
- MongoDB Atlas account (or local MongoDB)

### Steps

1. **Clone repository**
```bash
git clone <your-repo-url>
cd server-monitor
```

2. **Install dependencies**
```bash
npm install express mongoose express-session bcryptjs axios node-cron ejs
```

3. **Setup database connection**
Change MongoDB URI in `index.js`:
```javascript
const MONGO_URI = "your_mongodb_connection_string";
```

4. **Run application**
```bash
node app.js
```

5. **Open browser**
```
http://localhost:3000
```

## API Endpoints

### 1. Get Monitor Status

**Endpoint:** `GET /api/status`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | Your user API Key |

**Example Request:**
```bash
curl "http://localhost:3000/api/status?key=abc123def456"
```

**Success Response:**
```json
[
  {
    "name": "Google",
    "url": "https://google.com",
    "status": "UP ✅",
    "responseTime": "245ms",
    "lastChecked": "3/4/2026, 10:30:15 AM"
  },
  {
    "name": "My Website",
    "url": "https://example.com",
    "status": "DOWN ❌",
    "responseTime": "N/A",
    "lastChecked": "3/4/2026, 10:30:15 AM"
  }
]
```

**Error Response:**
```json
{
  "error": "API Key is required"
}
```

---

### 2. Add New Monitor

**Endpoint:** `GET /api/add`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | Your user API Key |
| name | string | Yes | Monitor name |
| url | string | Yes | URL to monitor (with http/https) |

**Example Request:**
```bash
curl "http://localhost:3000/api/add?key=abc123def456&name=My%20Site&url=https://example.com"
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Added My Site successfully"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Invalid Key"
}
```

---

### 3. How to Get API Key

1. Register: `POST /register`
2. Login: `POST /login`
3. Go to dashboard and copy your API Key

**API Key format:** 16 character hex string

## Web Routes

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/` | GET | Redirect to dashboard | - |
| `/register` | GET | Registration form | No |
| `/register` | POST | Create user | No |
| `/login` | GET | Login form | No |
| `/login` | POST | User login | No |
| `/dashboard` | GET | User dashboard | Yes |
| `/add-monitor` | POST | Add new monitor | Yes |
| `/delete/:id` | GET | Delete monitor | Yes |
| `/logout` | GET | Logout | - |
| `/admin/login` | GET | Admin login | No |
| `/admin/login` | POST | Admin auth | No |
| `/admin/master` | GET | View all monitors | Yes (Admin) |

## Admin Panel

**Admin Credentials:**
- Username: `nx210`
- Password: `xalmanx210`

**Admin Features:**
- View all monitors from all users
- Delete any monitor

## Usage Examples

### Python
```python
import requests

API_KEY = "your_api_key_here"
BASE_URL = "http://localhost:3000"

# Check status
response = requests.get(f"{BASE_URL}/api/status", params={"key": API_KEY})
print(response.json())

# Add monitor
params = {
    "key": API_KEY,
    "name": "Test Site",
    "url": "https://test.com"
}
response = requests.get(f"{BASE_URL}/api/add", params=params)
print(response.json())
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'http://localhost:3000';

// Check status
axios.get(`${BASE_URL}/api/status`, {
  params: { key: API_KEY }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

// Add monitor
axios.get(`${BASE_URL}/api/add`, {
  params: {
    key: API_KEY,
    name: 'My Site',
    url: 'https://example.com'
  }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));
```

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **View Engine:** EJS
- **Authentication:** Session-based, bcrypt
- **HTTP Client:** Axios
- **Scheduler:** node-cron

## Security Notes

**For production, change:**
- Session secret key
- Admin password
- MongoDB password

## Troubleshooting

**Issue:** Database not connecting
**Solution:** Check MongoDB URI, configure network access

**Issue:** Monitor not updating
**Solution:** Check if cron job is running, see console logs

**Issue:** API not working
**Solution:** Verify API Key is correct, check URL encoding

## License

MIT License
```
