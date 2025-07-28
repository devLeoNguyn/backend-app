const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: __dirname + '/../.env' });

const MONGO_URI = process.env.MONGO_URI;
console.log('Đang sử dụng MONGO_URI:', MONGO_URI);
if (!MONGO_URI) {
  console.error('Thiếu biến môi trường MONGO_URI. Kiểm tra lại file .env và vị trí chạy script!');
  process.exit(1);
}
const Genre = require('../models/Genre');

async function addChildGenre() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // Tên thể loại cha cần tìm
  const parentGenreName = 'Phim Chiếu Rạp';
  // Tên thể loại con cần thêm
  const childGenreName = 'Hài hước';

  // Tìm thể loại cha
  const parent = await Genre.findOne({ genre_name: parentGenreName, is_parent: true });
  if (!parent) {
    console.error('Không tìm thấy thể loại cha:', parentGenreName);
    process.exit(1);
  }

  // Kiểm tra nếu đã có thể loại con này
  const existed = parent.children && parent.children.some(child => child.genre_name === childGenreName);
  if (existed) {
    console.log('Thể loại con đã tồn tại.');
    process.exit(0);
  }

  // Tạo thể loại con mới
  const child = new Genre({
    genre_name: childGenreName,
    is_parent: false,
    parent_genre: parent._id
  });
  await child.save();

  // Thêm vào mảng children của parent
  parent.children = parent.children || [];
  parent.children.push(child._id);
  await parent.save();

  console.log('Đã thêm thể loại con "Hài hước" vào thể loại cha "Phim chiếu rạp"');
  mongoose.disconnect();
}

addChildGenre().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
