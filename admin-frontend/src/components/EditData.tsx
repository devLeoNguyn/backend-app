import React, { ChangeEvent, FormEvent } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updateProduct, fetchParentGenres, fetchChildGenres } from '../api/ApiCollection';

interface Genre {
  _id: string;
  genre_name: string;
  parent_genre?: {
    _id: string;
    genre_name: string;
  } | string | null;
  is_parent: boolean;
  children?: Genre[];
}

interface MovieData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  producer: string;
  price: number;
  movieType: string;
  totalEpisodes: number;
  status: 'released' | 'ended' | string;
  img?: string;
}

interface ProductData {
  title?: string;
  description?: string;
  production_time?: string;
  genre?: string;
  producer?: string;
  price?: number;
  movie_type?: string;
  total_episodes?: number;
  release_status?: string;
  poster_file?: File;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

interface EditDataProps {
  slug: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  movieData: MovieData;
}

const EditData: React.FC<EditDataProps> = ({
  slug,
  isOpen,
  setIsOpen,
  movieData
}) => {
  // React Query setup
  const queryClient = useQueryClient();
  
  // States cho genre selection
  const [selectedParentGenre, setSelectedParentGenre] = React.useState('');
  
  // Fetch parent genres
  const { data: parentGenres = [] } = useQuery<Genre[]>({
    queryKey: ['parentGenres'],
    queryFn: fetchParentGenres
  });

  // Fetch child genres based on selected parent
  const { data: childGenres = [] } = useQuery<Genre[]>({
    queryKey: ['childGenres', selectedParentGenre],
    queryFn: () => fetchChildGenres(selectedParentGenre),
    enabled: !!selectedParentGenre
  });
  
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Form states - Khởi tạo với dữ liệu từ movieData
  const [title, setTitle] = React.useState(movieData?.title || '');
  const [description, setDescription] = React.useState(movieData?.description || '');
  const [productionTime, setProductionTime] = React.useState(
    movieData?.createdAt ? movieData.createdAt.split('T')[0] : ''
  );
  const [genre, setGenre] = React.useState('');
  const [producer, setProducer] = React.useState(movieData?.producer || '');
  const [price, setPrice] = React.useState(movieData?.price?.toString() || '0');
  const [movieType, setMovieType] = React.useState(movieData?.movieType || '');
  const [totalEpisodes, setTotalEpisodes] = React.useState(movieData?.totalEpisodes?.toString() || '1');
  const [releaseStatus, setReleaseStatus] = React.useState(
    movieData?.status === 'released' ? 'Đã phát hành' : 
    movieData?.status === 'ended' ? 'Đã kết thúc' : 'Đã phát hành'
  );
  
  const [formProductIsEmpty, setFormProductIsEmpty] = React.useState(false);

  // Update form data when movieData changes
  React.useEffect(() => {
    if (movieData) {
      setTitle(movieData.title || '');
      setDescription(movieData.description || '');
      setProductionTime(movieData.createdAt ? movieData.createdAt.split('T')[0] : '');
      setProducer(movieData.producer || '');
      setPrice(movieData.price?.toString() || '0');
      setMovieType(movieData.movieType || '');
      setTotalEpisodes(movieData.totalEpisodes?.toString() || '1');
      setReleaseStatus(
        movieData.status === 'released' ? 'Đã phát hành' : 
        movieData.status === 'ended' ? 'Đã kết thúc' : 'Đã phát hành'
      );
    }
  }, [movieData]);

  // Load image handler
  const loadImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imageUpload = e.target.files[0];
      setFile(imageUpload);
      setPreview(URL.createObjectURL(imageUpload));
    }
  };

  // Mutation for updating product (movie)
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, productData }: { productId: string, productData: ProductData }) => 
      updateProduct(productId, productData),
    onSuccess: (data: unknown) => {
      toast.success('🎬 Phim đã được cập nhật thành công!');
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['allproducts'] });
      console.log('✅ Movie updated:', data);
    },
    onError: (error: ApiError) => {
      let errorMessage = 'Lỗi không xác định';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ Lỗi khi cập nhật phim: ${errorMessage}`);
    }
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (slug === 'product') {
      // Get genre name từ selected genre (child hoặc parent nếu không có child)
      let selectedGenreName = '';
      if (genre) {
        const selectedChildGenre = childGenres.find(g => g._id === genre);
        if (selectedChildGenre) {
          selectedGenreName = selectedChildGenre.genre_name;
        }
      } else if (selectedParentGenre) {
        const selectedParent = parentGenres.find(g => g._id === selectedParentGenre);
        if (selectedParent) {
          selectedGenreName = selectedParent.genre_name;
        }
      }
      
      // Chỉ gửi các field đã thay đổi
      const productData: ProductData = {};
      
      if (title !== movieData?.title) productData.title = title;
      if (description !== movieData?.description) productData.description = description;
      if (productionTime) productData.production_time = productionTime;
      if (selectedGenreName) productData.genre = selectedGenreName;
      if (producer !== movieData?.producer) productData.producer = producer;
      if (parseFloat(price) !== movieData?.price) productData.price = parseFloat(price) || 0;
      if (movieType !== movieData?.movieType) productData.movie_type = movieType;
      if (parseInt(totalEpisodes) !== movieData?.totalEpisodes) {
        productData.total_episodes = parseInt(totalEpisodes) || 1;
      }
      
      // Kiểm tra thay đổi release status
      const currentStatusVietnamese = movieData?.status === 'released' ? 'Đã phát hành' : 
                                     movieData?.status === 'ended' ? 'Đã kết thúc' : 'Đã phát hành';
      if (releaseStatus !== currentStatusVietnamese) {
        productData.release_status = releaseStatus;
      }
      
      if (file) productData.poster_file = file;
      
      console.log('🎬 Submitting movie update:', productData);
      console.log('🎯 Selected genre info:', {
        genre,
        selectedParentGenre,
        selectedGenreName,
        childGenres: childGenres.length,
        parentGenres: parentGenres.length
      });
      
      updateProductMutation.mutate({
        productId: movieData.id,
        productData
      });
    }
  };

  // Reset child genre khi parent thay đổi
  React.useEffect(() => {
    setGenre('');
  }, [selectedParentGenre]);

  // Set preview từ dữ liệu có sẵn
  React.useEffect(() => {
    if (movieData?.img && !preview) {
      setPreview(movieData.img);
    }
  }, [movieData, preview]);

  // Validation
  React.useEffect(() => {
    const requiredFields = [title, producer, price, movieType, totalEpisodes, releaseStatus];
    const hasValidGenre = genre || selectedParentGenre;
    const isFormEmpty = requiredFields.some(field => field === '') || !hasValidGenre;
    setFormProductIsEmpty(isFormEmpty);
  }, [title, producer, price, movieType, totalEpisodes, releaseStatus, genre, selectedParentGenre]);

  if (!isOpen || slug !== 'product') return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-[95%] max-w-4xl rounded-lg p-7 bg-base-100 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full flex justify-between pb-5 border-b border-base-content border-opacity-30">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-5 right-3 btn btn-ghost btn-circle"
          >
            <HiOutlineXMark className="text-xl font-bold" />
          </button>
          <span className="text-2xl font-bold">✏️ Chỉnh sửa phim: {movieData?.title}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên phim"
                className="input input-bordered w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              
              <textarea
                placeholder="Mô tả phim"
                className="textarea textarea-bordered w-full h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              
              <input
                type="date"
                placeholder="Thời gian sản xuất"
                className="input input-bordered w-full"
                value={productionTime}
                onChange={(e) => setProductionTime(e.target.value)}
              />
              
              {/* Genre Selection */}
              <select
                className="select select-bordered w-full"
                value={selectedParentGenre}
                onChange={(e) => setSelectedParentGenre(e.target.value)}
              >
                <option value="">Chọn thể loại chính</option>
                {parentGenres.map((genre) => (
                  <option key={genre._id} value={genre._id}>
                    {genre.genre_name}
                  </option>
                ))}
              </select>

              {selectedParentGenre && childGenres.length > 0 && (
                <select
                  className="select select-bordered w-full"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value="">Chọn thể loại phụ</option>
                  {childGenres.map((genre) => (
                    <option key={genre._id} value={genre._id}>
                      {genre.genre_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nhà sản xuất"
                className="input input-bordered w-full"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
              />

              <input
                type="number"
                placeholder="Giá (VND)"
                className="input input-bordered w-full"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
              />

              <select
                className="select select-bordered w-full"
                value={movieType}
                onChange={(e) => {
                  const selectedType = e.target.value;
                  setMovieType(selectedType);
                  
                  // Tự động điều chỉnh số tập dựa trên loại phim
                  if (selectedType === 'Phim lẻ') {
                    setTotalEpisodes('1');
                  } else if (selectedType === 'Phim bộ') {
                    // Chỉ điều chỉnh nếu hiện tại là 1 tập
                    if (totalEpisodes === '1') {
                      setTotalEpisodes('2');
                    }
                  } else if (selectedType === 'Thể thao') {
                    setTotalEpisodes('1'); // Thể thao thường 1 trận
                  }
                }}
              >
                <option value="">Chọn loại phim</option>
                <option value="Phim lẻ">🎬 Phim lẻ</option>
                <option value="Phim bộ">📺 Phim bộ</option>
                <option value="Thể thao">⚽ Thể thao</option>
              </select>

              <div className="form-control w-full">
                <input
                  type="number"
                  placeholder="Số tập"
                  className={`input input-bordered w-full ${movieType === 'Phim lẻ' ? 'input-disabled' : ''}`}
                  value={totalEpisodes}
                  disabled={movieType === 'Phim lẻ'} // Disable cho phim lẻ vì luôn là 1
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseInt(value) || 1;
                    
                    // Kiểm tra ràng buộc dựa trên loại phim
                    if (movieType === 'Phim lẻ' && numValue > 1) {
                      // Phim lẻ chỉ được 1 tập
                      return;
                    } else if (movieType === 'Phim bộ' && numValue < 2) {
                      // Phim bộ tối thiểu 2 tập
                      return;
                    }
                    
                    setTotalEpisodes(value);
                  }}
                  min={movieType === 'Phim bộ' ? '2' : '1'}
                  max={movieType === 'Phim lẻ' ? '1' : undefined}
                  title={
                    movieType === 'Phim lẻ' ? 'Phim lẻ luôn là 1 tập (không thể thay đổi)' :
                    movieType === 'Phim bộ' ? 'Phim bộ tối thiểu 2 tập' :
                    'Số tập của phim'
                  }
                />
                {movieType && (
                  <div className="label">
                    <span className="label-text-alt text-xs">
                      {movieType === 'Phim lẻ' && '🎬 Phim lẻ: luôn 1 tập (tự động)'}
                      {movieType === 'Phim bộ' && '📺 Phim bộ: tối thiểu 2 tập'}
                      {movieType === 'Thể thao' && '⚽ Thể thao: thường 1 trận đấu'}
                    </span>
                  </div>
                )}
              </div>

              <select
                className="select select-bordered w-full"
                value={releaseStatus}
                onChange={(e) => setReleaseStatus(e.target.value)}
              >
                <option value="Đã phát hành">✅ Đã phát hành</option>
                <option value="Đã kết thúc">🚫 Đã kết thúc</option>
              </select>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Poster phim</span>
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept="image/*"
                  onChange={loadImage}
                />
                {preview && (
                  <div className="mt-2">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-40 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formProductIsEmpty || updateProductMutation.isPending}
            >
              {updateProductMutation.isPending ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditData; 