# AI Tally Agent

A full-stack application for processing and managing invoices with AI-powered data extraction.

## Project Structure

```
/ai-tally-agent/
├── /frontend/          # React frontend application
├── /backend/           # Python Flask backend service
├── /firebase/          # Firebase configuration and rules
└── README.md           # This file
```

## Prerequisites

- Node.js (v16 or later)
- Python 3.8+
- Firebase CLI (for deployment)
- Google Cloud SDK (for Firebase Admin)

## Setup Instructions

### 1. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create a .env.local file and add your Firebase config
cp .env.example .env.local
# Edit .env.local with your Firebase config

# Start the development server
npm run dev
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with your Firebase Admin credentials
# GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json

# Start the Flask development server
python main.py
```

### 3. Firebase Setup

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase (in the firebase directory):
   ```bash
   cd firebase
   firebase init
   ```
   - Select Firestore and Hosting
   - Choose your Firebase project
   - Use the existing firestore.rules file
   - Set public directory to "../frontend/dist"
   - Configure as a single-page app: Yes

## Deployment

### Deploy Frontend

```bash
cd frontend
npm run build
cd ../firebase
firebase deploy --only hosting
```

### Deploy Backend

For production, you'll need to deploy the Flask application to a service like Google Cloud Run, Heroku, or AWS Elastic Beanstalk.

## Development Workflow

1. Start the backend server:
   ```bash
   cd backend
   python main.py
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

## Environment Variables

### Frontend (.env.local)
```
VITE_FIREBASE_CONFIG={"apiKey":"...", ...}
VITE_APP_ID=your-app-id
VITE_INITIAL_AUTH_TOKEN=optional-custom-token
```

### Backend (.env)
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
FLASK_ENV=development
FLASK_DEBUG=1
```

## License

This project is licensed under the MIT License.
