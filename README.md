# ProgressIQ API

## Overview
This is the backend API for the ProgressIQ application, which provides a smart activity reporting dashboard for students and mentors.

## Getting Started

### Prerequisites
- Node.js
- MongoDB

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ProgressIQ
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your environment variables:
   ```
   MONGODB_URI=<your_mongodb_uri>
   PORT=3000
   JWT_SECRET=<your_jwt_secret>
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### API Endpoints
- **POST** `/api/auth/login` - Admin, Mentor, and Student login (body: email, password)

**Admin-only endpoints** (requires Authorization header: `Bearer <token>`; role: `ADMIN`):
- **POST** `/api/admin/students` - Add a student (creates both `User` and `Student`)
- **GET** `/api/admin/students` - List students
- **PUT** `/api/admin/students/:id` - Update student
- **DELETE** `/api/admin/students/:id` - Delete student
- **POST** `/api/admin/mentors` - Add mentor
- **GET** `/api/admin/mentors` - List mentors
- **PUT** `/api/admin/mentors/:id` - Update mentor
- **DELETE** `/api/admin/mentors/:id` - Delete mentor
- **POST** `/api/admin/mappings` - Map students to a mentor (body: `{ mentorId, studentIds: [] }`)

**Mentor endpoints** (role: `MENTOR`):
- **GET** `/api/mentors/assigned-students?mentorId=<mentorId>` - Get assigned students
- **POST** `/api/mentors/approve` - Approve entity (body: entityType, entityId, studentId, status)
- **POST** `/api/mentors/feedback` - Give feedback (body: studentId, message)
- **POST** `/api/mentors/points` - Award points (body: studentId, source, points)

**Student endpoints** (role: `STUDENT`):
- **GET** `/api/students/dashboard` - Get sample dashboard data
- **POST** `/api/students/daily-log` - Submit daily activity (body: date, activity, hoursSpent)

### Testing with Postman
1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
2. Install packages: `npm install`.
3. Seed admin user: `npm run seed` (will use `ADMIN_EMAIL` & `ADMIN_PASSWORD`).
4. Start dev server: `npm run dev`.
5. Login using `POST /api/auth/login` with JSON:
```json
{
  "email": "admin@progressiq.local",
  "password": "ChangeMe123!"
}
```
6. Copy the returned token and add header `Authorization: Bearer <token>` for protected endpoints.

Example: Create student (Admin only)
POST /api/admin/students
```json
{
  "email": "student1@example.com",
  "firstName": "Thayanithi",
  "lastName": "S",
  "gender": "Male",
  "dob": "2006-08-15",
  "phone": "9025391287",
  "parentName": "Senthil Kumar",
  "parentPhone": "9876543210",
  "place": "Coimbatore",
  "department": "CSE",
  "year": "3rd Year",
  "academicYear": "2025-2026"
}
```

## Folder Structure ✅
```
Backend/
├── api/
│   ├── controllers/        # admin, mentor, student, auth controllers
│   ├── middleware/         # auth, security, error handling
│   ├── models/             # mongoose schemas for all collections
│   ├── routes/             # route files grouped by role
│   ├── utils/              # jwt helpers, seed script, etc.
│   └── index.ts            # app + DB connection + server start
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```