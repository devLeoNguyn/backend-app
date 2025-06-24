var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

// Swagger 
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

var app = express();

//connect moongose
require('dotenv').config();
const mongoose = require('mongoose');

// Test Cloudflare connection
const { testCloudflareConnection } = require('./utils/cloudflare.config');
const cloudflareStreamService = require('./services/cloudflare-stream.service');

// Enable CORS
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//---------Routes----------
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const movieRoutes = require('./routes/movie.routes');
const episodeRoutes = require('./routes/episode.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const paymentRoutes = require('./routes/payment.routes');
const rentalRoutes = require('./routes/rental.routes');
const ratingRoutes = require('./routes/rating.routes');
const genreRoutes = require('./routes/genre.routes');
const watchingRoutes = require('./routes/watching.routes');
const homeRoutes = require('./routes/home.routes');

const videoRoutes = require('./routes/video.routes');
const seriesRoutes = require('./routes/series.routes');
const uploadRoutes = require('./routes/upload.routes');
const animeRoutes = require('./routes/anime.routes');


// Đăng ký routes
app.use('/', indexRouter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/watching', watchingRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/video-url', videoRoutes);
app.use('/api/series', seriesRoutes);

app.use('/api/anime', animeRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/api/categories', require('./routes/category.routes'));

// Swagger Documentation
const swaggerPath = path.join(__dirname, 'swagger.yaml');
const swaggerDocument = YAML.load(swaggerPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  const error = req.app.get('env') === 'development' ? err : {};

  // return error as JSON
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: error
  });
});

//mongoose connect
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection;
    console.log("MongoDB connected to:", db.name);
    
    // Test Cloudflare connection sau khi MongoDB connected
    console.log('Testing Cloudflare Images connection...');
    await testCloudflareConnection();
    
    console.log('Testing Cloudflare Stream connection...');
    await cloudflareStreamService.testConnection();
    
    // Initialize cron jobs for rental system
    console.log('Initializing rental cron jobs...');
    const cronService = require('./services/cron.service');
    cronService.init();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

module.exports = app;
