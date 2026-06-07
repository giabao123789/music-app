# Music App

**Ứng dụng nghe nhạc trực tuyến** với kiến trúc microservice gồm backend NestJS và frontend Next.js.  
Cho phép người dùng phát nhạc, tạo playlist, theo dõi nghệ sĩ, bình luận và quản lý yêu thích.  
Hỗ trợ đầy đủ phân quyền **USER**, **ARTIST**, **ADMIN** với các dashboard riêng biệt.

---

## Tech Stack

### Frontend (`web/`)

| Công nghệ          | Version            |
| ------------------ | ------------------ |
| **Framework**      | Next.js ^14.2.0    |
| **UI Library**     | React ^18.2.0      |
| **Animation**      | Framer Motion ^12.38.0 |
| **Icons**          | Lucide React ^1.7.0   |
| **Charts**         | Recharts ^3.5.1    |
| **Drag & Drop**    | @dnd-kit/core ^6.3.1 / @dnd-kit/sortable ^10.0.0 |
| **HTTP Client**    | Axios ^1.13.2      |
| **Auth**           | NextAuth ^4.24.13 + jsonwebtoken ^9.0.2 |
| **Styling**        | Tailwind CSS ^3.4.0 |
| **Language**       | TypeScript ^5.4.0  |

### Backend (`api/`)

| Công nghệ          | Version            |
| ------------------ | ------------------ |
| **Framework**      | NestJS ^10.0.0     |
| **Runtime**        | Node.js 18 (Docker base) |
| **Language**       | TypeScript ^5.9.3  |
| **Auth**           | Passport (JWT) ^0.7.0 + @nestjs/jwt ^11.0.1 + @nestjs/passport ^11.0.5 |
| **Database ORM**   | Prisma ^6.18.0 + @prisma/client ^6.18.0 |
| **Database**       | MongoDB ^7.0.0     |
| **Validation**     | class-validator ^0.14.4 |
| **File Upload**    | Multer ^2.0.2      |
| **Media Upload**   | Cloudinary ^2.10.0 |
| **Metadata**       | music-metadata ^11.10.3 |
| **Email**          | Nodemailer ^7.0.10 |
| **Password Hash**  | bcrypt ^6.0.0 + bcryptjs ^3.0.3 |
| **HTTP Client**    | Axios ^1.13.6 + node-fetch ^2.7.0 |
| **Date**           | date-fns ^4.1.0    |
| **UUID**           | uuid ^13.0.0       |

### DevOps

| Công nghệ          | Chi tiết                                         |
| ------------------ | ------------------------------------------------ |
| **Container**      | Docker (multi-stage build, Node 18 Alpine)       |
| **Deploy**         | Render (Docker cho API, Node cho Web)            |
| **CI/CD Blueprint**| render.yaml (Render Blueprint)                   |

---

## Features (đã implement)

### Authentication & Users
- [x] Đăng ký qua email + OTP (2 bước: gửi OTP → xác nhận OTP)
- [x] Đăng nhập với JWT access token
- [x] Quên mật khẩu / Reset mật khẩu qua OTP
- [x] Phân quyền: USER, ARTIST, ADMIN
- [x] Xác thực qua NextAuth (credentials provider) + JWT

### Tracks
- [x] Danh sách track public (có filter theo q, genre, artistId, limit)
- [x] Top tracks theo popularity
- [x] Chi tiết track
- [x] +1 lượt nghe (increment play / popularity)
- [x] Soft delete (deletedAt)
- [x] Upload track + phân tích metadata

### Albums
- [x] CRUD albums
- [x] Liên kết track với album

### Playlists
- [x] Tạo playlist theo user
- [x] Danh sách playlist của user
- [x] Thêm/xoá track trong playlist
- [x] Reorder tracks (drag & drop)
- [x] Đổi tên playlist
- [x] Xoá playlist
- [x] Playlists system (home, system)

### Favorites
- [x] Thêm/xoá track yêu thích
- [x] Danh sách yêu thích của user

### Follows
- [x] Follow/unfollow nghệ sĩ
- [x] Danh sách follower của nghệ sĩ

### Comments
- [x] Bình luận trên track
- [x] Xem bình luận theo track

### Artist Dashboard
- [x] Quản lý tracks của nghệ sĩ
- [x] Upload track (audio + cover)
- [x] Chỉnh sửa thông tin track
- [x] Thống kê (biểu đồ với Recharts)

### Admin Panel
- [x] Quản lý tracks (list, search, filter, update, soft delete)
- [x] Quản lý artists
- [x] Quản lý albums
- [x] Gửi notification khi admin cập nhật/xoá track

### Notifications
- [x] Notification cho nghệ sĩ (khi admin cập nhật/xoá track)
- [x] Collection Notification riêng trong MongoDB

### Recommendations
- [x] Module gợi ý (recommendations)

### OTP / Email
- [x] Gửi OTP qua email (Nodemailer SMTP)
- [x] OTP cho: REGISTER, RESET_PASSWORD, LOGIN

### Other
- [x] Health check endpoint
- [x] Upload file (multer + Cloudinary)
- [x] CORS config
- [x] Prisma seed

---

## Project Structure

```
music-app/
├── api/                          # Backend NestJS
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma schema (MongoDB)
│   │   ├── seed.ts               # Seed data
│   │   └── migrations/           # Prisma migrations
│   ├── src/
│   │   ├── main.ts               # Entry point
│   │   ├── app.module.ts         # Root module
│   │   ├── health.controller.ts  # Health check
│   │   ├── admin/                # Admin controllers
│   │   ├── albums/               # Album module
│   │   ├── artist/               # Artist module
│   │   ├── auth/                 # Auth module (JWT, Passport, guards)
│   │   ├── comments/             # Comments module
│   │   ├── common/               # Shared utilities
│   │   ├── favorites/            # Favorites module
│   │   ├── follows/              # Follows module
│   │   ├── mail/                 # Mail module (Nodemailer)
│   │   ├── notifications/        # Notifications module
│   │   ├── otp/                  # OTP module
│   │   ├── playlists/            # Playlists module
│   │   ├── prisma/               # Prisma service
│   │   ├── recommendations/      # Recommendations module
│   │   ├── tracks/               # Tracks module
│   │   └── upload/               # Upload module (Multer + Cloudinary)
│   ├── Dockerfile                # Multi-stage Docker build
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env
│
├── web/                          # Frontend Next.js
│   ├── app/
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Homepage
│   │   ├── loading.tsx
│   │   ├── admin/                # Admin pages
│   │   ├── albums/               # Album pages
│   │   ├── api/                  # Next.js API routes (proxy)
│   │   ├── artist/               # Artist dashboard
│   │   ├── artists/              # Artist listing/detail
│   │   ├── auth/                 # Auth pages
│   │   ├── components/           # Shared components
│   │   ├── discover/             # Discover page
│   │   ├── favorites/            # Favorites page
│   │   ├── forgot-password/      # Forgot password page
│   │   ├── login/                # Login page
│   │   ├── playlists/            # Playlist pages
│   │   ├── providers/            # React providers (Player, Auth)
│   │   ├── register/             # Register page
│   │   ├── reset-password/       # Reset password page
│   │   ├── track/                # Track detail page
│   │   ├── tracks/               # Tracks listing
│   │   └── utils/                # Utilities
│   ├── components/               # Shared components
│   │   ├── AdminGuard.tsx
│   │   ├── ArtistCollectionsRow.tsx
│   │   ├── PlayerBar.tsx
│   │   ├── PlaylistSelectDialog.tsx
│   │   └── PlaylistTrackCard.tsx
│   ├── lib/
│   │   ├── auth.ts               # NextAuth config
│   │   ├── authFetch.ts          # Auth fetch helper
│   │   └── config.ts             # API base URL
│   ├── types/                    # TypeScript type definitions
│   ├── public/
│   │   ├── genres/               # Genre images
│   │   └── icons/                # SVG icons
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── postcss.config.js
│
├── .gitignore
├── Procfile                      # Render Procfile
├── render.yaml                   # Render Blueprint (deploy config)
└── RENDER_DEPLOY.md              # Deployment guide
```

---

## Setup & Installation

### Prerequisites

- Node.js >= 18
- MongoDB (local hoặc MongoDB Atlas)
- npm

### Environment Variables

#### Backend (`api/.env`)

Tạo file `api/.env` từ `api/.env.example`:

```env
# MongoDB
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/musicapp?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000

# SMTP (optional — để gửi OTP email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Music App
```

#### Frontend (`web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-change-this
```

### Installation

```bash
# Clone repository
git clone https://github.com/giabao123789/music-app.git
cd music-app

# Install backend dependencies
cd api
npm install

# Generate Prisma client
npx prisma generate

# Push schema to MongoDB
npx prisma db push

# (Optional) Seed database
npx prisma db seed

# Install frontend dependencies
cd ../web
npm install
```

### Run locally

```bash
# Terminal 1: Start backend (port 3001)
cd api
npm run start:dev

# Terminal 2: Start frontend (port 3000)
cd web
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

### Auth

| Method | Path                    | Auth     | Description                        |
| ------ | ----------------------- | -------- | ---------------------------------- |
| POST   | `/auth/register-start`  | Public   | Gửi OTP đăng ký                    |
| POST   | `/auth/verify-otp`      | Public   | Xác nhận OTP + tạo user            |
| POST   | `/auth/login`           | Public   | Đăng nhập, trả về JWT              |
| POST   | `/auth/forgot-password` | Public   | Gửi OTP reset mật khẩu             |
| POST   | `/auth/reset-password`  | Public   | Xác nhận OTP + đặt lại mật khẩu    |

### Tracks

| Method | Path              | Auth     | Description                        |
| ------ | ----------------- | -------- | ---------------------------------- |
| GET    | `/tracks`         | Public   | Danh sách track (q, genre, artistId, limit) |
| GET    | `/tracks/top`     | Public   | Top tracks theo popularity          |
| GET    | `/tracks/:id`     | Public   | Chi tiết track                     |
| POST   | `/tracks/:id/play`| Public   | +1 lượt nghe                       |

### Playlists

| Method | Path                                       | Auth     | Description                        |
| ------ | ------------------------------------------ | -------- | ---------------------------------- |
| GET    | `/playlists/home`                          | Public   | Playlists cho trang chủ             |
| GET    | `/playlists/system`                        | Public   | Playlists system                    |
| GET    | `/playlists/:id`                           | Public   | Chi tiết playlist + tracks          |
| POST   | `/users/:userId/playlists`                 | JWT      | Tạo playlist                        |
| GET    | `/users/:userId/playlists`                 | JWT      | Danh sách playlist của user         |
| PATCH  | `/playlists/:id`                           | JWT      | Đổi tên playlist                    |
| DELETE | `/playlists/:id`                           | JWT      | Xoá playlist                        |
| POST   | `/playlists/:id/tracks`                    | JWT      | Thêm track vào playlist             |
| DELETE | `/playlists/:id/tracks/:trackId`           | JWT      | Xoá track khỏi playlist             |
| PATCH  | `/playlists/:id/reorder`                   | JWT      | Sắp xếp lại tracks trong playlist   |

### Favorites

| Method | Path                        | Auth     | Description                        |
| ------ | --------------------------- | -------- | ---------------------------------- |
| POST   | `/favorites/:trackId`       | JWT      | Thêm track yêu thích                |
| DELETE | `/favorites/:trackId`       | JWT      | Xoá track yêu thích                 |
| GET    | `/favorites`                | JWT      | Danh sách yêu thích của user        |

### Follows

| Method | Path                              | Auth     | Description                        |
| ------ | --------------------------------- | -------- | ---------------------------------- |
| POST   | `/follows/:artistId`              | JWT      | Follow nghệ sĩ                     |
| DELETE | `/follows/:artistId`              | JWT      | Unfollow nghệ sĩ                   |
| GET    | `/follows/artist/:artistId`       | Public   | Danh sách follower của nghệ sĩ     |

### Comments

| Method | Path                            | Auth     | Description                        |
| ------ | ------------------------------- | -------- | ---------------------------------- |
| POST   | `/comments/track/:trackId`      | JWT      | Thêm bình luận                     |
| GET    | `/comments/track/:trackId`      | Public   | Xem bình luận của track            |

### Artist

| Method | Path                                      | Auth     | Description                        |
| ------ | ----------------------------------------- | -------- | ---------------------------------- |
| GET    | `/artist/me`                              | JWT      | Thông tin artist hiện tại           |
| GET    | `/artist/tracks`                          | JWT      | Danh sách track của artist          |
| POST   | `/artist/tracks`                          | JWT      | Upload track mới                    |
| PATCH  | `/artist/tracks/:trackId`                 | JWT      | Cập nhật track                      |
| DELETE | `/artist/tracks/:trackId`                 | JWT      | Xoá track (soft delete)             |
| GET    | `/artist/stats`                           | JWT      | Thống kê (lượt nghe, track count)   |
| GET    | `/artist`                                 | Public   | Danh sách nghệ sĩ                   |
| GET    | `/artist/:id`                             | Public   | Chi tiết nghệ sĩ                    |

### Admin

| Method | Path                      | Auth     | Description                        |
| ------ | ------------------------- | -------- | ---------------------------------- |
| GET    | `/admin/tracks`           | Admin    | Danh sách tracks (search, filter)   |
| GET    | `/admin/tracks/:id`       | Admin    | Chi tiết track                      |
| PATCH  | `/admin/tracks/:id`       | Admin    | Cập nhật track                      |
| DELETE | `/admin/tracks/:id`       | Admin    | Soft delete track                   |
| GET    | `/admin/artists`          | Admin    | Danh sách nghệ sĩ                   |
| PATCH  | `/admin/artists/:id`      | Admin    | Cập nhật nghệ sĩ                    |
| GET    | `/admin/albums`           | Admin    | Danh sách albums                    |
| PATCH  | `/admin/albums/:id`       | Admin    | Cập nhật album                      |

### Other

| Method | Path        | Auth     | Description                        |
| ------ | ----------- | -------- | ---------------------------------- |
| GET    | `/`          | Public   | Health check                       |
| POST   | `/upload/media` | JWT   | Upload file (cover, audio)          |

> **Lưu ý:** Các endpoint gắn nhãn **JWT** yêu cầu header `Authorization: Bearer <token>`.  
> Các endpoint gắn nhãn **Admin** yêu cầu user có `role: ADMIN`.

---

## Deployment

### Render (dùng Render Blueprint)

Project sử dụng [Render Blueprint](render.yaml) để deploy toàn bộ:

```yaml
services:
  - name: music-api      # Backend: Docker runtime, port 3001
  - name: music-web      # Frontend: Node runtime, Next.js
```

Các bước:

1. Push code lên GitHub
2. Vào [Render Dashboard](https://dashboard.render.com) → New → Blueprint
3. Kết nối repo, Render tự đọc `render.yaml` và deploy cả 2 service
4. Cấu hình `DATABASE_URL`, `SMTP_USER`, `SMTP_PASS` trong Render Dashboard

### Deploy thủ công

```bash
# Backend
cd api
docker build -t music-api .
docker run -p 3001:3001 music-api

# Frontend
cd web
npm run build
npm start
```

### Procfile (dùng cho Heroku / Render Node)

```
web: cd api && npm start
```

---

## Notes

- Database hiện tại dùng **SQLite** (dev.db) cho development local. Production dùng **MongoDB** qua Prisma.
- OTP email cần cấu hình SMTP hợp lệ (Gmail App Password khuyến nghị).
- Upload file dùng Cloudinary ở production, multer (lưu local) ở development.