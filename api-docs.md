# API Documentation

## 1. API Tìm kiếm phim

**Endpoint:** `GET /api/movies/search`

**Query Params:**
- `q`: Từ khoá tìm kiếm (bắt buộc)
- `genre`: Lọc theo thể loại (tùy chọn)
- `movie_type`: Lọc theo loại phim (Phim bộ, Phim lẻ, ...)
- `price_type`: Lọc theo miễn phí/trả phí (free/paid)
- `page`, `limit`: Phân trang

**Trả về:**
```json
{
  "status": "success",
  "total": 123,
  "movies": [
    {
      "_id": "...",
      "title": "Tên phim",
      "description": "...",
      "poster": "...",
      ...
    }
  ]
}
```
**Nguồn dữ liệu:**
- Lấy từ collection `movies`, tìm kiếm theo `movie_title`, `description`, `producer` (full-text search).

---

## 2. API lấy danh sách phim trang Home

**Endpoint:** `GET /api/home`

**Trả về:**
```json
{
  "status": "success",
  "data": {
    "trending": [ ... ],
    "series": [ ... ],
    "movies": [ ... ],
    ...
  }
}
```
- Mỗi section là 1 danh sách phim (trending, phim bộ, phim lẻ, anime, ...)
- Có thể có các section đặc biệt như "Phim Việt Nam", "Phim Hàn Quốc", ...

**Nguồn dữ liệu:**
- Lấy từ collection `movies`, có thể join thêm `genres` để lấy tên thể loại.
- Section trending thường sắp xếp theo `view_count`, các section khác lọc theo `movie_type`, `genre`, ...

---

## 3. API phim thịnh hành (Trending Movies)

**Mục đích:**
- Trả về danh sách các phim đang thịnh hành nhất trên hệ thống.
- Dùng cho slider/banner "Phim thịnh hành" trên trang chủ hoặc các trang chuyên mục.

**Endpoint:**
- `GET /api/home` (section `trending`)
- `GET /api/series/trending` (phim bộ thịnh hành)
- `GET /api/anime/trending` (phim hoạt hình thịnh hành)

**Cách lấy dữ liệu:**
- Lấy từ collection `movies`.
- **Tiêu chí xếp hạng:**
  - Sắp xếp theo `view_count` (lượt xem) giảm dần.
  - Có thể kết hợp thêm `favorite_count` (lượt thích/yêu thích) để tăng độ chính xác.
  - Thường chỉ lấy các phim có `release_status: 'released'` (đã phát hành).
  - Có thể lọc theo thời gian ra mắt (ví dụ: chỉ lấy phim ra mắt trong 30 ngày gần nhất) bằng trường `createdAt` hoặc `production_time`.

**Ví dụ truy vấn:**
```js
Movie.find({ release_status: 'released', createdAt: { $gte: fromDate } })
  .sort({ view_count: -1, favorite_count: -1 })
  .limit(10)
```
- `fromDate` là ngày bắt đầu tính trending (ví dụ: 30 ngày trước).

**Trả về:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "title": "Tên phim",
      "poster": "...",
      "view_count": 12345,
      "favorite_count": 678,
      "releaseYear": 2024,
      ...
    }
  ]
}
```
**Giải thích các trường:**
- `_id`: ID phim
- `title`: Tên phim
- `poster`: Ảnh poster
- `view_count`: Lượt xem (dùng để xếp hạng thịnh hành)
- `favorite_count`: Lượt thích/yêu thích (có thể dùng để tăng độ ưu tiên)
- `releaseYear`: Năm phát hành (lấy từ `production_time` hoặc `createdAt`)
- ... (các trường khác tuỳ API)

**Comment chi tiết:**
- Phim thịnh hành là phim có nhiều lượt xem nhất trong một khoảng thời gian (thường là 7, 30 ngày gần nhất).
- Có thể kết hợp thêm lượt thích để ưu tiên phim vừa nhiều view vừa nhiều like.
- Chỉ lấy phim đã phát hành (`release_status: 'released'`).
- Dữ liệu trả về là mảng các phim, dùng cho slider/banner hoặc section "Phim thịnh hành".

---

## 4. API Banner phim (slider/banner thịnh hành, banner phim bộ, banner anime)

**Mục đích:**
- Trả về danh sách phim cho slider/banner ở trang chủ hoặc các trang chuyên mục (phim bộ, anime, ...).

**Luồng xử lý:**
1. **Client gửi request** đến endpoint banner (ví dụ: `/api/series/banner-series`, `/api/anime/banner-list`, ...).
2. **Controller nhận request** và xác định loại banner cần lấy (trending, phim bộ, anime).
3. **Xây dựng tiêu chí lọc phim:**
   - Banner trending: Lọc phim nhiều view nhất, có thể thêm điều kiện thời gian (7/30 ngày gần nhất).
   - Banner phim bộ: Lọc `movie_type: 'Phim bộ'`, sắp xếp theo ngày ra mắt hoặc lượt xem.
   - Banner anime: Lọc phim có `genres` là _id của "Hoạt Hình", có thể kết hợp thêm `movie_type` và thời gian.
4. **Truy vấn collection `movies`** với các điều kiện đã xây dựng, join thêm `genres` nếu cần.
5. **Sắp xếp và lấy top N phim** (thường là 5, 10, 20 tuỳ banner).
6. **Format lại dữ liệu**: chỉ lấy các trường cần thiết cho banner (id, title, poster, description, view_count, ...).
7. **Trả về client**: JSON chứa danh sách phim cho banner.

**Ví dụ truy vấn banner trending:**
```js
Movie.find({ release_status: 'released', createdAt: { $gte: fromDate } })
  .sort({ view_count: -1, favorite_count: -1 })
  .limit(10)
```

**Ví dụ truy vấn banner phim bộ:**
```js
Movie.find({ movie_type: 'Phim bộ', release_status: 'released' })
  .sort({ createdAt: -1 })
  .limit(10)
```

**Ví dụ truy vấn banner anime:**
```js
const animeGenre = await Genre.findOne({ genre_name: /hoạt hình/i });
Movie.find({ genres: animeGenre._id, release_status: 'released' })
  .sort({ view_count: -1 })
  .limit(10)
```

**Trả về:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "title": "Tên phim",
      "poster": "...",
      "description": "...",
      "view_count": 12345,
      ...
    }
  ]
}
```

**Comment chi tiết:**
- Banner là danh sách phim nổi bật, thường dùng cho slider hoặc section đầu trang.
- Tiêu chí lọc có thể thay đổi tuỳ loại banner (trending, phim bộ, anime).
- Dữ liệu trả về là mảng các phim, chỉ lấy các trường cần thiết cho hiển thị banner.
- Có thể truyền thêm query như `bannerLimit` để lấy số lượng phim mong muốn.

---

## 5. API Xem tất cả phim (All Movies)

**Mục đích:**
- Trả về toàn bộ danh sách phim theo tiêu chí (phim bộ, hoạt hình, trending, theo thể loại, ...), thường dùng cho trang "Xem tất cả" hoặc khi người dùng bấm "Xem thêm".

**Luồng xử lý:**
1. **Client gửi request** đến endpoint phù hợp, ví dụ:
   - `/api/series?showAll=true&page=1&limit=20` (tất cả phim bộ)
   - `/api/anime?showAll=true&page=1&limit=20` (tất cả phim hoạt hình)
   - `/api/home?section=trending&showAll=true&page=1&limit=20` (tất cả phim thịnh hành)
   - `/api/movies?movie_type=Phim lẻ&page=1&limit=20` (tất cả phim lẻ)
   - `/api/movies?genre=<id>&page=1&limit=20` (tất cả phim theo thể loại)
2. **Controller nhận request** và đọc các tham số lọc từ query: `movie_type`, `genre`, `showAll`, `page`, `limit`, ...
3. **Xây dựng tiêu chí truy vấn** phù hợp với loại phim cần lấy.
4. **Truy vấn collection `movies`** với các điều kiện đã xây dựng, join thêm `genres` nếu cần.
5. **Sắp xếp, phân trang, format lại dữ liệu** (chỉ lấy các trường cần thiết).
6. **Trả về client**: JSON chứa danh sách phim, tổng số phim, thông tin phân trang.

**Query Params phổ biến:**
- `showAll`: true/false (lấy tất cả hoặc chỉ top)
- `page`, `limit`: Phân trang
- `movie_type`: Lọc theo loại phim (Phim bộ, Phim lẻ, ...)
- `genre`: Lọc theo thể loại

**Ví dụ truy vấn:**
- **Phim bộ:**
  ```js
  Movie.find({ movie_type: 'Phim bộ', release_status: 'released' })
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
  ```
- **Phim hoạt hình:**
  ```js
  const animeGenre = await Genre.findOne({ genre_name: /hoạt hình/i });
  Movie.find({ genres: animeGenre._id, release_status: 'released' })
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
  ```
- **Trending:**
  ```js
  Movie.find({ release_status: 'released', createdAt: { $gte: fromDate } })
    .sort({ view_count: -1, favorite_count: -1 })
    .skip((page-1)*limit)
    .limit(limit)
  ```
- **Theo thể loại:**
  ```js
  Movie.find({ genres: <id>, release_status: 'released' })
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
  ```

**Trả về:**
```json
{
  "status": "success",
  "total": 123,
  "page": 1,
  "limit": 20,
  "movies": [
    {
      "_id": "...",
      "title": "Tên phim",
      "description": "...",
      "poster": "...",
      ...
    }
  ]
}
```

**Giải thích các trường:**
- `status`: Trạng thái trả về (success/error)
- `total`: Tổng số phim tìm được
- `page`, `limit`: Thông tin phân trang
- `movies`: Mảng các phim (id, title, poster, description, ...)

**Comment chi tiết:**
- API "xem tất cả" cho phép client lấy toàn bộ danh sách phim theo tiêu chí, có thể phân trang.
- Dữ liệu lấy từ collection `movies`, join thêm `genres` nếu cần.
- Có thể kết hợp nhiều điều kiện lọc (loại phim, thể loại, trending, ...).
- Trả về JSON, chỉ lấy các trường cần thiết cho hiển thị danh sách phim.

## 5.1. Giải thích chi tiết API Xem tất cả phim

**Mục đích:**
- Cho phép client lấy toàn bộ danh sách phim theo tiêu chí (phim bộ, hoạt hình, trending, theo thể loại, ...), dùng cho trang "Xem tất cả" hoặc "Xem thêm".

**Luồng xử lý chi tiết:**
1. **Client gửi request** đến endpoint phù hợp, ví dụ:
   - `/api/series?showAll=true&page=1&limit=20` (tất cả phim bộ)
   - `/api/anime?showAll=true&page=1&limit=20` (tất cả phim hoạt hình)
   - `/api/home?section=trending&showAll=true&page=1&limit=20` (tất cả phim thịnh hành)
   - `/api/movies?movie_type=Phim lẻ&page=1&limit=20` (tất cả phim lẻ)
   - `/api/movies?genre=<id>&page=1&limit=20` (tất cả phim theo thể loại)
2. **Controller nhận request** và đọc các tham số lọc từ query:
   - `showAll`: true/false (lấy tất cả hay chỉ top)
   - `page`, `limit`: phân trang
   - `movie_type`: lọc theo loại phim (Phim bộ, Phim lẻ, ...)
   - `genre`: lọc theo thể loại
   - Có thể có thêm các filter khác (giá, quốc gia, ...)
3. **Xây dựng tiêu chí truy vấn** phù hợp với loại phim cần lấy:
   - Phim bộ: `{ movie_type: 'Phim bộ', release_status: 'released' }`
   - Phim hoạt hình: `{ genres: <_id Hoạt Hình>, release_status: 'released' }`
   - Trending: `{ release_status: 'released', createdAt: { $gte: fromDate } }`
   - Theo thể loại: `{ genres: <id>, release_status: 'released' }`
4. **Truy vấn collection `movies`** với các điều kiện đã xây dựng, join thêm `genres` nếu cần.
5. **Sắp xếp theo tiêu chí phù hợp:**
   - Phim mới nhất: `{ createdAt: -1 }`
   - Trending: `{ view_count: -1, favorite_count: -1 }`
6. **Phân trang:** sử dụng `.skip((page-1)*limit).limit(limit)`
7. **Format lại dữ liệu trả về:** chỉ lấy các trường cần thiết (id, title, poster, description, ...).
8. **Trả về client:**
```json
{
  "status": "success",
  "total": 123,
  "page": 1,
  "limit": 20,
  "movies": [
    {
      "_id": "...",
      "title": "Tên phim",
      "description": "...",
      "poster": "...",
      ...
    }
  ]
}
```

**Ý nghĩa từng trường trả về:**
- `status`: Trạng thái trả về (success/error)
- `total`: Tổng số phim tìm được (dùng cho phân trang, hiển thị tổng số phim)
- `page`: Trang hiện tại (bắt đầu từ 1)
- `limit`: Số phim trên mỗi trang
- `movies`: Mảng các phim, mỗi phim gồm:
  - `_id`: ID phim (dùng cho chi tiết, link, ...)
  - `title`: Tên phim
  - `description`: Mô tả ngắn
  - `poster`: Ảnh poster
  - Các trường khác: `movie_type`, `genres`, `releaseYear`, `view_count`, ... (tùy API)

**Các trường hợp sử dụng thực tế:**
- Trang "Xem tất cả phim bộ": `/api/series?showAll=true&page=2&limit=10`
- Trang "Xem tất cả phim hoạt hình": `/api/anime?showAll=true&page=1&limit=20`
- Trang "Xem tất cả trending": `/api/home?section=trending&showAll=true&page=1&limit=20`
- Trang "Xem tất cả phim theo thể loại": `/api/movies?genre=<id>&page=1&limit=20`

**Ví dụ thực tế:**
- **Request:**
  `GET /api/series?showAll=true&page=2&limit=10`
- **Response:**
```json
{
  "status": "success",
  "total": 35,
  "page": 2,
  "limit": 10,
  "movies": [
    {
      "_id": "665c1b2e7b2e4a001e8e1a2c",
      "title": "Phim bộ 11",
      "description": "Mô tả phim bộ 11",
      "poster": "/images/poster11.jpg"
    },
    ...
  ]
}
```

**Comment chi tiết:**
- API "xem tất cả" cho phép client lấy toàn bộ danh sách phim theo tiêu chí, có thể phân trang.
- Dữ liệu lấy từ collection `movies`, join thêm `genres` nếu cần.
- Có thể kết hợp nhiều điều kiện lọc (loại phim, thể loại, trending, ...).
- Trả về JSON, chỉ lấy các trường cần thiết cho hiển thị danh sách phim.

---

## 6. API toàn bộ phim bộ

**Endpoint:** `GET /api/series` hoặc `GET /api/series/trending` hoặc `GET /api/series/banner-series`

**Query Params:**
- `showAll`: true/false (lấy tất cả hoặc chỉ top)
- `page`, `limit`: Phân trang

**Trả về:**
```json
{
  "status": "success",
  "data": {
    "banner": { ... },
    "recommended": { ... }
  }
}
```
- Hoặc trả về danh sách phim bộ dạng grid/banner.

**Nguồn dữ liệu:**
- Lấy từ collection `movies` với điều kiện `movie_type: 'Phim bộ'`, `release_status: 'released'`.
- Có thể join thêm `genres` để lấy tên thể loại.

---

## 7. API toàn bộ phim hoạt hình

**Endpoint:** `GET /api/anime` hoặc `GET /api/anime/series` hoặc `GET /api/anime/banner-list`

**Query Params:**
- `page`, `limit`: Phân trang
- `bannerLimit`: Số lượng phim cho banner (nếu có)

**Trả về:**
```json
{
  "status": "success",
  "data": {
    "banner": { ... },
    "recommended": { ... }
  }
}
```
- Hoặc trả về danh sách phim hoạt hình trending, phim bộ, phim lẻ, ...

**Nguồn dữ liệu:**
- Lấy từ collection `movies` với điều kiện `genres` là _id của thể loại "Hoạt Hình" (tìm trong collection `genres`), có thể lọc thêm `movie_type`.

---

## Ghi chú chung
- Tất cả API đều trả về JSON.
- Các trường trả về có thể thay đổi tuỳ vào controller, nhưng luôn có status, data/movies, và các trường cơ bản của phim.
- Nguồn dữ liệu chủ yếu lấy từ collection `movies`, join thêm `genres` nếu cần. 