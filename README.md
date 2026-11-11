# xVector Analytics Platform

A full-stack web application for uploading, paginating, analyzing, and visualizing tabular datasets.

## Architecture & Tech Stack
*   **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL
*   **Frontend:** React (Vite), React Router, Axios, React Toastify
*   **Visualizations:** Apache ECharts (`echarts-for-react`)
*   **Security:** Passwords hashed via `bcrypt`. JWT access tokens.
*   **Performance:** O(1) in-memory caches for computations and plot data; synchronous CSV upload so the user is notified only once the file is saved.

## Setup Instructions

### 1. Database (Docker)
Ensure Docker is running, then start the PostgreSQL container:
`docker run --name databoard-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=databoard -p 5432:5432 -d postgres`

### 2. Backend
Navigate to the `backend` directory:
`python -m venv venv`
`source venv/Scripts/activate`
`pip install -r requirements.txt`
`uvicorn main:app --reload`

### 3. Frontend
Navigate to the `frontend` directory:
`npm install`
`npm run dev`

## Fulfilling the Rubric Requirements

### Authentication & Re-Login Strategy
Passwords are securely hashed using `bcrypt` before being stored in PostgreSQL. The backend issues JSON Web Tokens (JWT) upon successful login. 
*   **Expiry & Current Implementation:** The token is configured to expire after a set time (e.g., 30 minutes). Rather than silent token refreshing, this application currently enforces a strict re-login policy for maximum security. A global Axios response interceptor (`src/api/client.js`) watches all incoming network traffic. If the backend rejects a request with a `401 Unauthorized` status (due to an expired or invalid token), the interceptor instantly clears the stale token from `localStorage` and executes a `window.location.reload()`. This securely forces the application state back to the `AuthScreen` component.
*   **Production Scalability (Future Enhancement):** To enhance user experience in a fully deployed environment without sacrificing security, the authentication flow can be migrated to use a short-lived access token alongside a long-lived refresh token stored in an `HttpOnly`, `Secure` cookie. This would allow the Axios interceptor to silently request a new access token via a `/auth/refresh` endpoint, protecting against XSS attacks while keeping the user logged in seamlessly.

### Pagination
Genuine database-level pagination is implemented on the `GET /dataset` route using SQLAlchemy's `.offset()` and `.limit()`. The React frontend passes `?page` and `?limit` queries dynamically, updating the state variables to render "Next" and "Previous" controls only when applicable.

### Testing & Edge Cases
The compute endpoint (`POST /dataset/{id}/compute`) is fully covered by a Pytest integration suite (`tests/test_compute.py`) ensuring stability during numeric operations and custom algorithmic processing. 
*   **Covered Edge Cases:** The test suite verifies that the API safely catches and rejects operations on non-numeric strings, completely empty columns, and columns containing all-null values, returning appropriate `400 Bad Request` HTTP exceptions rather than failing internally. 

To run tests:
`cd backend`
`pytest tests/ -v`

### Technical Assumptions
* **Data Processing:** It is assumed that uploaded CSV datasets are clean enough for pandas parsing without requiring extensive prior sanitization.
* **Algorithmic Complexity:** The implementation of the custom array algorithms assumes numerical columns and operates efficiently based on the necessary sorting requirements before traversal.
* **Environment:** It is assumed the application will be run in a Unix-like environment or WSL, and that Docker is available for the PostgreSQL database instance.