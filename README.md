# Assignment2 CRUD Robots

A React Native Expo app with a FastAPI backend and MongoDB Atlas.

## Prerequisites

- Python 3
- Node.js and npm
- Android emulator
- MongoDB Atlas database named cs3720db with a robots collection

## Backend setup

Open Command Prompt in the backend folder:

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Set your MongoDB connection string. Replace YOUR_ACTUAL_MONGODB_URI
with your own URI, including your database username and password:

```cmd
set "MONGODB_URI=YOUR_ACTUAL_MONGODB_URI"
python -m uvicorn server:app --reload
```

Allow your computer's IP address in Atlas Network Access.

API documentation: http://localhost:8000/docs

## Frontend setup

Open a separate terminal in the fronend folder:

```cmd
npm ci
npx expo start
```

Start the Android emulator, then press a in the Expo terminal.

The app uses http://10.0.2.2:8000 to reach the backend from the
Android emulator. Keep both backend and Expo terminals running.

## Features

- List all robots
- Search for and view one robot
- Add a robot
- Modify a robot
- Delete a robot
- Validate required fields, nonnegative prices, and image URLs
- Display success and error messages

## API endpoints

- GET /robots
- GET /robots/{name}
- POST /robots
- PUT /robots/{name}
- DELETE /robots/{name}

Robot fields: name, price, description, imageUrl.
Robot names must be unique.

## Submission contents

Dependencies and generated folders are excluded.
MongoDB credentials are supplied through MONGODB_URI and are
not included in this submission.