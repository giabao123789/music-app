// prisma/seed.ts
import { PrismaClient, Role, Genre } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data (Vietnamese artists + albums + tracks)...");

  // ====== Password cho tất cả nghệ sĩ demo ======
  const ARTIST_PLAIN_PASSWORD = "Artist123!";
  const passwordHash = await bcrypt.hash(ARTIST_PLAIN_PASSWORD, 10);

  // ====== Dữ liệu nghệ sĩ kiểu Zing (POP / RAP / INDIE) ======
  const artistsData = [
    {
      name: "Jack - J97",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "J97 Collection",
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
          tracks: [
            {
              title: "Sóng Gió",
              duration: 240,
              audioUrl: "https://example.com/audio/j97-song-gio-demo.mp3",
            },
            {
              title: "Hồng Nhan",
              duration: 230,
              audioUrl: "https://example.com/audio/j97-hong-nhan-demo.mp3",
            },
            {
              title: "Bạc Phận",
              duration: 250,
              audioUrl: "https://example.com/audio/j97-bac-phan-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Miu Lê",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "Ballad Miu Lê",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Giá Như Cô Ấy Chưa Xuất Hiện",
              duration: 245,
              audioUrl: "https://example.com/audio/miule-gia-nhu-demo.mp3",
            },
            {
              title: "Yêu Một Người Có Lẽ",
              duration: 230,
              audioUrl: "https://example.com/audio/miule-yeu-mot-nguoi-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Hoài Lâm",
      avatar:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
      albums: [
        {
          title: "Hoài Lâm Hits",
          coverUrl:
            "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg",
          tracks: [
            {
              title: "Hoa Nở Không Màu",
              duration: 260,
              audioUrl:
                "https://example.com/audio/hoailam-hoa-no-khong-mau-demo.mp3",
            },
            {
              title: "Buồn Làm Chi Em Ơi",
              duration: 245,
              audioUrl:
                "https://example.com/audio/hoailam-buon-lam-chi-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Trúc Nhân",
      avatar:
        "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
      albums: [
        {
          title: "Trúc Nhân Collection",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Thật Bất Ngờ",
              duration: 220,
              audioUrl:
                "https://example.com/audio/trucnhan-that-bat-ngo-demo.mp3",
            },
            {
              title: "Sáng Mắt Chưa",
              duration: 210,
              audioUrl:
                "https://example.com/audio/trucnhan-sang-mat-chua-demo.mp3",
            },
            {
              title: "Bốn Chữ Lắm",
              duration: 230,
              audioUrl:
                "https://example.com/audio/trucnhan-bon-chu-lam-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Văn Mai Hương",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "Ballad Của Hương",
          coverUrl:
            "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg",
          tracks: [
            {
              title: "Nếu Như Anh Đến",
              duration: 230,
              audioUrl:
                "https://example.com/audio/vmh-neu-nhu-anh-den-demo.mp3",
            },
            {
              title: "Một Ngàn Nỗi Đau",
              duration: 250,
              audioUrl:
                "https://example.com/audio/vmh-mot-ngan-noi-dau-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Đông Nhi",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "The Best Of Đông Nhi",
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
          tracks: [
            {
              title: "Bad Boy",
              duration: 215,
              audioUrl:
                "https://example.com/audio/dongnhi-bad-boy-demo.mp3",
            },
            {
              title: "Xin Anh Đừng",
              duration: 230,
              audioUrl:
                "https://example.com/audio/dongnhi-xin-anh-dung-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Noo Phước Thịnh",
      avatar:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
      albums: [
        {
          title: "Noo Ballad",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Gạt Đi Nước Mắt",
              duration: 245,
              audioUrl:
                "https://example.com/audio/noo-gat-di-nuoc-mat-demo.mp3",
            },
            {
              title: "Như Phút Ban Đầu",
              duration: 250,
              audioUrl:
                "https://zingmp3.vn/bai-hat/Vet-Nang-Cuoi-Troi-Soobin/IW9IDZAW.html",
            },
          ],
        },
      ],
    },
    {
      name: "Bích Phương",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "Bích Phương Collection",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Bùa Yêu",
              duration: 230,
              audioUrl: "https://example.com/audio/bp-bua-yeu-demo.mp3",
            },
            {
              title: "Bao Giờ Lấy Chồng",
              duration: 215,
              audioUrl:
                "https://example.com/audio/bp-bao-gio-lay-chong-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Hòa Minzy",
      avatar:
        "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
      albums: [
        {
          title: "Ballad Hòa Minzy",
          coverUrl:
            "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
          tracks: [
            {
              title: "Rời Bỏ",
              duration: 250,
              audioUrl:
                "https://example.com/audio/hoaminzy-roi-bo-demo.mp3",
            },
            {
              title: "Không Thể Cùng Nhau Suốt Kiếp",
              duration: 280,
              audioUrl:
                "https://example.com/audio/hoaminzy-khong-the-cung-nhau-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Hương Giang",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "Drama Series",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Anh Đang Ở Đâu Đấy Anh",
              duration: 260,
              audioUrl: "https://example.com/audio/hg-adaa-demo.mp3",
            },
            {
              title: "Anh Ta Bỏ Em Rồi",
              duration: 250,
              audioUrl:
                "https://example.com/audio/hg-anh-ta-bo-em-roi-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "JustaTee",
      avatar:
        "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
      albums: [
        {
          title: "R&B Vibes",
          coverUrl:
            "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
          tracks: [
            {
              title: "Bâng Khuâng",
              duration: 220,
              audioUrl: "https://example.com/audio/jt-bang-khuang-demo.mp3",
            },
            {
              title: "Thằng Điên",
              duration: 240,
              audioUrl: "https://example.com/audio/jt-thang-dien-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Karik",
      avatar:
        "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
      albums: [
        {
          title: "Rap Karik",
          coverUrl:
            "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
          tracks: [
            {
              title: "Người Lạ Ơi",
              duration: 230,
              audioUrl:
                "https://example.com/audio/karik-nguoi-la-oi-demo.mp3",
            },
            {
              title: "Anh Không Đòi Quà",
              duration: 215,
              audioUrl:
                "https://example.com/audio/karik-anh-khong-doi-qua-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Wowy",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "Rap Wowy",
          coverUrl:
            "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg",
          tracks: [
            {
              title: "Đêm Cô Đơn",
              duration: 220,
              audioUrl: "https://example.com/audio/wowy-dem-co-don-demo.mp3",
            },
            {
              title: "Thiên Đàng",
              duration: 230,
              audioUrl: "https://example.com/audio/wowy-thien-dang-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Soobin Hoàng Sơn",
      avatar:
        "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
      albums: [
        {
          title: "Soobin Ballad",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Phía Sau Một Cô Gái",
              duration: 250,
              audioUrl:
                "https://example.com/audio/soobin-phia-sau-mot-co-gai-demo.mp3",
            },
            {
              title: "Ngày Mai Em Đi",
              duration: 240,
              audioUrl:
                "https://example.com/audio/soobin-ngay-mai-em-di-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Rhymastic",
      avatar:
        "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
      albums: [
        {
          title: "Producer Mode",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Yêu 5",
              duration: 230,
              audioUrl:
                "https://example.com/audio/rhymastic-yeu-5-demo.mp3",
            },
            {
              title: "Nước Mắt",
              duration: 225,
              audioUrl:
                "https://example.com/audio/rhymastic-nuoc-mat-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Orange",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "Orange Vibes",
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
          tracks: [
            {
              title: "Người Lạ Ơi",
              duration: 230,
              audioUrl:
                "https://example.com/audio/orange-nguoi-la-oi-demo.mp3",
            },
            {
              title: "Tình Nhân Ơi",
              duration: 245,
              audioUrl:
                "https://example.com/audio/orange-tinh-nhan-oi-demo.mp3",
            },
          ],
        },
      ],
    },

    {
      name: "Sơn Tùng M-TP",
      avatar:
        "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
      albums: [
        {
          title: "M-TP Hits Collection",
          coverUrl:
            "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg",
          tracks: [
            {
              title: "Có Chắc Yêu Là Đây",
              duration: 250,
              audioUrl: "https://example.com/audio/mtp-co-chac-yeu-la-day.mp3",
            },
            {
              title: "Chúng Ta Của Hiện Tại",
              duration: 300,
              audioUrl:
                "https://example.com/audio/mtp-chung-ta-cua-hien-tai.mp3",
            },
            {
              title: "Lạc Trôi",
              duration: 260,
              audioUrl: "https://example.com/audio/mtp-lac-troi.mp3",
            },
            {
              title: "Nơi Này Có Anh",
              duration: 245,
              audioUrl: "https://example.com/audio/mtp-noi-nay-co-anh.mp3",
            },
          ],
        },
        {
          title: "Sky Tour Live",
          coverUrl:
            "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg",
          tracks: [
            {
              title: "Chạy Ngay Đi (Live)",
              duration: 280,
              audioUrl: "https://example.com/audio/mtp-chay-ngay-di-live.mp3",
            },
            {
              title: "Em Của Ngày Hôm Qua (Live)",
              duration: 265,
              audioUrl:
                "https://example.com/audio/mtp-em-cua-ngay-hom-qua-live.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "HIEUTHUHAI",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "Dreamy Night",
          coverUrl:
            "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg",
          tracks: [
            {
              title: "Nghe Như Tình Yêu",
              duration: 210,
              audioUrl:
                "https://example.com/audio/hth-nghe-nhu-tinh-yeu-demo.mp3",
            },
            {
              title: "Vệ Tinh",
              duration: 195,
              audioUrl: "https://example.com/audio/hth-ve-tinh-demo.mp3",
            },
            {
              title: "Lời Đường Mật",
              duration: 205,
              audioUrl:
                "https://example.com/audio/hth-loi-duong-mat-demo.mp3",
            },
          ],
        },
        {
          title: "Playah Mode",
          coverUrl:
            "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
          tracks: [
            {
              title: "Bật Nhạc Lên",
              duration: 188,
              audioUrl:
                "https://example.com/audio/hth-bat-nhac-len-demo.mp3",
            },
            {
              title: "Ngủ Một Mình",
              duration: 222,
              audioUrl:
                "https://example.com/audio/hth-ngu-mot-minh-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Đen Vâu",
      avatar:
        "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
      albums: [
        {
          title: "Lối Nhỏ",
          coverUrl:
            "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
          tracks: [
            {
              title: "Lối Nhỏ",
              duration: 212,
              audioUrl: "https://example.com/audio/den-loi-nho-demo.mp3",
            },
            {
              title: "Hai Triệu Năm",
              duration: 204,
              audioUrl:
                "https://example.com/audio/den-hai-trieu-nam-demo.mp3",
            },
            {
              title: "Ta Cứ Đi Cùng Nhau",
              duration: 230,
              audioUrl:
                "https://example.com/audio/den-ta-cu-di-cung-nhau-demo.mp3",
            },
          ],
        },
        {
          title: "Mười Năm",
          coverUrl:
            "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
          tracks: [
            {
              title: "Mười Năm",
              duration: 245,
              audioUrl: "https://example.com/audio/den-muoi-nam-demo.mp3",
            },
            {
              title: "Đi Theo Bóng Mặt Trời",
              duration: 260,
              audioUrl:
                "https://example.com/audio/den-di-theo-bong-mat-troi-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Hoàng Dũng",
      avatar:
        "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
      albums: [
        {
          title: "25",
          coverUrl:
            "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg",
          tracks: [
            {
              title: "Nàng Thơ",
              duration: 270,
              audioUrl: "https://example.com/audio/hd-nang-tho-demo.mp3",
            },
            {
              title: "Chẳng Nói Nên Lời",
              duration: 240,
              audioUrl:
                "https://example.com/audio/hd-chang-noi-nen-loi-demo.mp3",
            },
            {
              title: "Yên",
              duration: 230,
              audioUrl: "https://example.com/audio/hd-yen-demo.mp3",
            },
          ],
        },
        {
          title: "Love Songs",
          coverUrl:
            "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg",
          tracks: [
            {
              title: "Đôi Lời Tình Ca",
              duration: 245,
              audioUrl:
                "https://example.com/audio/hd-doi-loi-tinh-ca-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Tăng Duy Tân",
      avatar:
        "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
      albums: [
        {
          title: "Bên Trên Tầng Lầu",
          coverUrl:
            "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
          tracks: [
            {
              title: "Bên Trên Tầng Lầu",
              duration: 240,
              audioUrl:
                "https://example.com/audio/tdt-ben-tren-tang-lau-demo.mp3",
            },
            {
              title: "Dạ Vũ",
              duration: 220,
              audioUrl: "https://example.com/audio/tdt-da-vu-demo.mp3",
            },
          ],
        },
        {
          title: "Hit Collection",
          coverUrl:
            "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
          tracks: [
            {
              title: "Yêu Rồi Đấy",
              duration: 215,
              audioUrl: "https://example.com/audio/tdt-yeu-roi-day-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "MIN",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "MIN Collection",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Có Em Chờ",
              duration: 235,
              audioUrl: "https://example.com/audio/min-co-em-cho-demo.mp3",
            },
            {
              title: "Ghen",
              duration: 210,
              audioUrl: "https://example.com/audio/min-ghen-demo.mp3",
            },
            {
              title: "Trên Tình Bạn Dưới Tình Yêu",
              duration: 248,
              audioUrl:
                "https://example.com/audio/min-tren-tinh-ban-demo.mp3",
            },
          ],
        },
        {
          title: "Love Songs",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Yêu",
              duration: 220,
              audioUrl: "https://example.com/audio/min-yeu-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Đức Phúc",
      avatar:
        "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
      albums: [
        {
          title: "Ballad Hits",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Ánh Nắng Của Anh",
              duration: 250,
              audioUrl:
                "https://example.com/audio/dp-anh-nang-cua-anh-demo.mp3",
            },
            {
              title: "Hơn Cả Yêu",
              duration: 260,
              audioUrl:
                "https://example.com/audio/dp-hon-ca-yeu-demo.mp3",
            },
          ],
        },
        {
          title: "Love Stories",
          coverUrl:
            "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
          tracks: [
            {
              title: "Ta Còn Yêu Nhau",
              duration: 240,
              audioUrl:
                "https://example.com/audio/dp-ta-con-yeu-nhau-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "ERIK",
      avatar:
        "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
      albums: [
        {
          title: "Pop Viet",
          coverUrl:
            "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
          tracks: [
            {
              title: "Sau Tất Cả",
              duration: 255,
              audioUrl:
                "https://example.com/audio/erik-sau-tat-ca-demo.mp3",
            },
            {
              title: "Chạm Đáy Nỗi Đau",
              duration: 245,
              audioUrl:
                "https://example.com/audio/erik-cham-day-noi-dau-demo.mp3",
            },
          ],
        },
        {
          title: "Remix Vibes",
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
          tracks: [
            {
              title: "Em Không Sai Chúng Ta Sai (Remix)",
              duration: 230,
              audioUrl:
                "https://example.com/audio/erik-em-khong-sai-remix-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "AMEE",
      avatar:
        "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
      albums: [
        {
          title: "DreAMee",
          coverUrl:
            "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
          tracks: [
            {
              title: "Ex’s Hate Me",
              duration: 220,
              audioUrl:
                "https://example.com/audio/amee-exs-hate-me-demo.mp3",
            },
            {
              title: "Anh Nhà Ở Đâu Thế",
              duration: 210,
              audioUrl:
                "https://example.com/audio/amee-anh-nha-o-dau-the-demo.mp3",
            },
          ],
        },
        {
          title: "Pop Teen",
          coverUrl:
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg",
          tracks: [
            {
              title: "Đen Đá Không Đường",
              duration: 205,
              audioUrl:
                "https://example.com/audio/amee-den-da-khong-duong-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Vũ",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "Hành Tinh Song Song",
          coverUrl:
            "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg",
          tracks: [
            {
              title: "Lạ Lùng",
              duration: 250,
              audioUrl: "https://example.com/audio/vu-la-lung-demo.mp3",
            },
            {
              title: "Bước Qua Nhau",
              duration: 260,
              audioUrl:
                "https://example.com/audio/vu-buoc-qua-nhau-demo.mp3",
            },
          ],
        },
        {
          title: "Indie Nights",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Đợi",
              duration: 230,
              audioUrl: "https://example.com/audio/vu-doi-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Thịnh Suy",
      avatar:
        "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
      albums: [
        {
          title: "Indie Chill",
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
          tracks: [
            {
              title: "Một Đêm Say",
              duration: 230,
              audioUrl:
                "https://example.com/audio/ts-mot-dem-say-demo.mp3",
            },
            {
              title: "Thắc Mắc",
              duration: 210,
              audioUrl:
                "https://example.com/audio/ts-thac-mac-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Ngọt",
      avatar:
        "https://images.pexels.com/photos/167404/pexels-photo-167404.jpeg",
      albums: [
        {
          title: "Ngọt 3",
          coverUrl:
            "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
          tracks: [
            {
              title: "Em Dạo Này",
              duration: 240,
              audioUrl:
                "https://example.com/audio/ngot-em-dao-nay-demo.mp3",
            },
            {
              title: "Cho Tôi Lang Thang",
              duration: 220,
              audioUrl:
                "https://example.com/audio/ngot-cho-toi-lang-thang-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Binz",
      avatar:
        "https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg",
      albums: [
        {
          title: "Rap Viet",
          coverUrl:
            "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg",
          tracks: [
            {
              title: "Bigcityboi",
              duration: 215,
              audioUrl:
                "https://example.com/audio/binz-bigcityboi-demo.mp3",
            },
            {
              title: "OK",
              duration: 205,
              audioUrl: "https://example.com/audio/binz-ok-demo.mp3",
            },
          ],
        },
      ],
    },
    {
      name: "Low G",
      avatar:
        "https://images.pexels.com/photos/819530/pexels-photo-819530.jpeg",
      albums: [
        {
          title: "Winter Rap",
          coverUrl:
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          tracks: [
            {
              title: "Anh Đã Ổn Hơn",
              duration: 230,
              audioUrl:
                "https://example.com/audio/lowg-anh-da-on-hon-demo.mp3",
            },
            {
              title: "Real Love",
              duration: 218,
              audioUrl:
                "https://example.com/audio/lowg-real-love-demo.mp3",
            },
          ],
        },
      ],
    },
  ];

  // ====== 2. Tạo dữ liệu trong DB ======
  for (const artistData of artistsData) {
    const email =
      artistData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "") + "@demo.artist";

    // User nghệ sĩ (ROLE = ARTIST)
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: artistData.name,
      },
      create: {
        email,
        password: passwordHash,
        role: Role.ARTIST,
        verified: true,
        name: artistData.name,
      },
    });

    // Artist record
    let artist = await prisma.artist.findFirst({
      where: { userId: user.id },
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: artistData.name,
          avatar: artistData.avatar,
          userId: user.id,
        },
      });
    }

    // Albums + Tracks
    for (const albumData of artistData.albums) {
      let album = await prisma.album.findFirst({
        where: {
          title: albumData.title,
          artistId: artist.id,
        },
      });

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumData.title,
            coverUrl: albumData.coverUrl,
            artistId: artist.id,
            releaseAt: new Date(),
          },
        });
      }

      for (const track of albumData.tracks) {
        const existed = await prisma.track.findFirst({
          where: {
            title: track.title,
            artistId: artist.id,
          },
        });

        if (existed) continue;

        await prisma.track.create({
          data: {
            title: track.title,
            duration: track.duration,
            coverUrl: albumData.coverUrl ?? artistData.avatar,
            audioUrl: track.audioUrl,
            artistId: artist.id,
            albumId: album.id,
          },
        });
      }
    }
  }

  // ============================================
  // 🎵 AUTO-GENERATE 150 RANDOM TRACKS (ĐỢT 3)
  // ============================================
  console.log("🔄 Generating 150 auto-random tracks...");

  // Lấy tất cả nghệ sĩ từ DB
  const allArtists = await prisma.artist.findMany({
    include: { albums: true },
  });

  if (allArtists.length === 0) {
    console.warn("⚠ Không tìm thấy artist nào để random track!");
  } else {
    const randomTitles = [
      "Giấc Mơ Màu Tím",
      "Vệt Nắng Cuối Trời",
      "Đi Qua Mùa Hạ",
      "Khoảng Lặng",
      "Hẹn Một Mai",
      "Những Ngày Đẹp Trời",
      "Một Lần Cuối",
      "Nơi Tình Yêu Bắt Đầu",
      "Vỡ",
      "Gọi Anh",
      "Đêm Trắng",
      "Tan Vào Mây",
      "Mùa Yêu Đầu",
      "Phút Ban Đầu",
      "Cuộc Vui Cô Đơn",
      "Lạc Bước",
      "Ánh Trăng Nói Hộ Lòng Tôi",
    ];

    for (let i = 0; i < 150; i++) {
      const artist = allArtists[Math.floor(Math.random() * allArtists.length)];

      if (!artist.albums.length) continue;

      const album =
        artist.albums[Math.floor(Math.random() * artist.albums.length)];

      // Không còn "(Auto Demo xx)" nữa, chỉ lấy base title
      const title =
        randomTitles[Math.floor(Math.random() * randomTitles.length)];

      await prisma.track.create({
        data: {
          title,
          duration: 150 + Math.floor(Math.random() * 180),
          coverUrl:
            album.coverUrl ||
            artist.avatar ||
            "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
          audioUrl:
            "https://cdn.pixabay.com/download/audio/2022/11/06/audio_d132bfae5e.mp3?filename=lofi-study-112191.mp3", // audio demo free
          artistId: artist.id,
          albumId: album.id,
        },
      });
    }
  }

  console.log("🎉 Auto-random 150 tracks generated!");

  // ============================================
  // 🎨 GÁN GENRE, BIO, LYRICS, POPULARITY
  // ============================================
  console.log("🎨 Assigning genres, bios, lyrics & popularity...");

  const genrePool: Genre[] = [
    Genre.POP,
    Genre.BALLAD,
    Genre.RAP,
    Genre.INDIE,
    Genre.RNB,
    Genre.EDM,
    Genre.OTHER,
  ];

  // --- Artist: mainGenre + bio ---
  const allArtists2 = await prisma.artist.findMany();

  for (const artist of allArtists2) {
    const genre =
      artist.mainGenre ??
      genrePool[Math.floor(Math.random() * genrePool.length)];

    const niceGenreName =
      genre === Genre.POP
        ? "pop"
        : genre === Genre.BALLAD
        ? "ballad"
        : genre === Genre.RAP
        ? "rap / hip-hop"
        : genre === Genre.INDIE
        ? "indie"
        : genre === Genre.RNB
        ? "R&B"
        : genre === Genre.EDM
        ? "electronic / EDM"
        : "đa màu sắc";

    const bio =
      artist.bio ??
      `${artist.name} là nghệ sĩ ${niceGenreName} Việt Nam trên Music App, với phong cách giàu cảm xúc và giai điệu gần gũi. Các bản nhạc của ${artist.name} phù hợp để nghe mỗi ngày, từ lúc học tập, làm việc cho đến những buổi tối thư giãn.`;

    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        mainGenre: genre,
        bio,
      },
    });
  }

  // --- Track: genre + lyrics + popularity ---
  const allTracks2 = await prisma.track.findMany();

  for (const track of allTracks2) {
    const genre =
      track.genre ?? genrePool[Math.floor(Math.random() * genrePool.length)];

    const popularity =
      track.popularity && track.popularity > 0
        ? track.popularity
        : 30 + Math.floor(Math.random() * 70); // 30 - 99

    const lyricLines = [
      `${track.title} vang lên giữa không gian quen thuộc,`,
      "giai điệu chạm khẽ những ký ức tưởng chừng đã ngủ quên.",
      "ta khẽ ngân nga theo vài câu hát,",
      "để thấy lòng mình nhẹ đi một chút, dù chỉ là trong phút chốc.",
    ];

    await prisma.track.update({
      where: { id: track.id },
      data: {
        genre,
        popularity,
        lyrics: track.lyrics ?? lyricLines.join("\n"),
      },
    });
  }

  // ============================================
  // 🎧 AUTO-GEN PLAYLIST + TOP CHARTS
  // ============================================
  console.log("🎧 Generating system playlists & top charts...");

  // User hệ thống để đứng tên các playlist đề xuất
  let systemUser = await prisma.user.findUnique({
    where: { email: "system@musicapp.local" },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "system@musicapp.local",
        password: passwordHash, // dùng chung hash nghệ sĩ, cho nhanh
        role: Role.ADMIN,
        verified: true,
        name: "Music App System",
      },
    });
  }

  const tracksForPlaylist = await prisma.track.findMany({
    orderBy: { popularity: "desc" },
  });

  if (tracksForPlaylist.length === 0) {
    console.warn("⚠ Không có track nào để tạo playlist!");
  } else {
    const topHits = tracksForPlaylist.slice(0, 40);
    const balladTracks = tracksForPlaylist
      .filter((t) => t.genre === Genre.BALLAD || t.genre === Genre.POP)
      .slice(0, 40);

    const rapTracks = tracksForPlaylist
      .filter((t) => t.genre === Genre.RAP)
      .slice(0, 40);

    const indieTracks = tracksForPlaylist
      .filter((t) => t.genre === Genre.INDIE)
      .slice(0, 40);

    const shuffled = [...tracksForPlaylist].sort(() => Math.random() - 0.5);
    const recommendedTracks = shuffled.slice(0, 40);

    async function createOrReplacePlaylist(
      name: string,
      tracks: { id: string }[],
    ) {
      if (!tracks.length) return;

      let playlist = await prisma.playlist.findFirst({
        where: { name, userId: systemUser!.id },
      });

      if (!playlist) {
        playlist = await prisma.playlist.create({
          data: {
            name,
            userId: systemUser!.id,
          },
        });
      }

      // Xoá items cũ, thêm lại cho sạch
      await prisma.playlistTrack.deleteMany({
        where: { playlistId: playlist.id },
      });

      let order = 0;
      for (const t of tracks) {
        await prisma.playlistTrack.create({
          data: {
            playlistId: playlist.id,
            trackId: t.id,
            order: order++,
          },
        });
      }
    }

    await createOrReplacePlaylist("Top Hits Việt Nam", topHits);
    await createOrReplacePlaylist("Ballad Việt Buồn", balladTracks);
    await createOrReplacePlaylist("Rap Việt Bật Lửa", rapTracks);
    await createOrReplacePlaylist("Indie Việt Đêm Khuya", indieTracks);
    await createOrReplacePlaylist("Gợi ý cho bạn", recommendedTracks);
    await createOrReplacePlaylist("Có thể bạn thích", recommendedTracks);
  }

  console.log("✅ System playlists & top charts generated!");

  console.log("✅ Genres, bios, lyrics & popularity updated!");

  console.log("✅ Seed xong Vietnamese artists + albums + tracks!");
  console.log("Mật khẩu mặc định cho nghệ sĩ demo:", ARTIST_PLAIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
