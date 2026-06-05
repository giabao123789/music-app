# Deploy lên Render

## Chuẩn bị

1. **MongoDB Atlas** (free): https://www.mongodb.com/cloud/atlas
   - Tạo cluster → Database Access → Network Access (cho phép `0.0.0.0/0`)
   - Copy connection string:
     ```
     mongodb+srv://USER:PASSWORD@cluster.mongodb.net/music_app?retryWrites=true&w=majority
     ```

2. **GitHub**: push code lên repo

## Cách 1: Blueprint (khuyên dùng)

1. Vào https://dashboard.render.com → **New** → **Blueprint**
2. Connect repo `music-app`
3. Render đọc file `render.yaml` và tạo 2 service: `music-api` + `music-web`
4. Khi được hỏi, nhập các biến **sync: false**:
   - `DATABASE_URL` — connection string MongoDB Atlas
   - `SMTP_USER` / `SMTP_PASS` — Gmail App Password (nếu cần gửi email OTP)

## Cách 2: Deploy thủ công

### Backend (`api/`)

| Key | Giá trị |
|-----|---------|
| `DATABASE_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `FRONTEND_URL` | URL frontend Render (vd: `https://music-web.onrender.com`) |
| `SMTP_*` | Cấu hình Gmail (tùy chọn) |

- **Root Directory**: `api`
- **Runtime**: Docker
- **Dockerfile Path**: `./Dockerfile`

### Frontend (`web/`)

| Key | Giá trị |
|-----|---------|
| `BACKEND_URL` | URL API Render (vd: `https://music-api.onrender.com`) |
| `NEXT_PUBLIC_API_URL` | Cùng URL API |
| `NEXTAUTH_URL` | URL frontend Render |
| `NEXTAUTH_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự |

- **Root Directory**: `web`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## File env mẫu

Copy và điền giá trị thật:

```bash
cp api/.env.example api/.env      # local dev
cp web/.env.example web/.env.local
```

Trên Render: paste từng biến vào **Environment** tab của từng service (không upload file `.env`).

## Lưu ý

- Render free tier **sleep sau 15 phút** không có traffic → cold start ~30s
- Upload file audio/image lưu trong `api/uploads/` — **mất khi redeploy** trên Render free. Cân nhắc dùng S3/Cloudinary sau này.
- `NEXTAUTH_SECRET` trên API và Web **phải khác nhau** (mỗi service một secret riêng).
- Gmail App Password: bỏ khoảng trắng (vd: `abcd efgh` → `abcdefgh`).
