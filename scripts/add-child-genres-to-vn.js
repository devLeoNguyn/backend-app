const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

// const Genre = require('../models/Genre');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const parentGenreId = '6847d080101e640d01a0c37f'; // Phim Việt Nam

  const childGenres = [
    { genre_name: 'Hành động', description: 'Phim hành động Hoạt Hình', parent_genre: parentGenreId, is_parent: false, sort_order: 1 },
    { genre_name: 'Kinh dị', description: 'Phim kinh dị Hoạt Hình', parent_genre: parentGenreId, is_parent: false, sort_order: 2 },
    { genre_name: 'Tình cảm', description: 'Phim tình cảm Hoạt Hình', parent_genre: parentGenreId, is_parent: false, sort_order: 3 },
  ];

  for (const child of childGenres) {
    // Luôn tạo mới, không kiểm tra trùng tên
    await Genre.create(child);
    console.log(`Đã tạo mới thể loại: ${child.genre_name}`);
  }

  await mongoose.disconnect();
  console.log('Hoàn thành!');
}

main().catch(console.error);