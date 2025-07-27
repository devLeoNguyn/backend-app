import React, { ChangeEvent, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createProduct, fetchParentGenres } from '../api/ApiCollection';
import { 
  validateMovieForm, 
  validateOnBlur, 
  isFormValid, 
  clearFieldError,
  type MovieFormData,
  type ValidationErrors 
} from '../validation/movieValidation';

interface Genre {
  _id: string;
  genre_name: string;
  parent_genre?: {
    _id: string;
    genre_name: string;
  } | string | null;
  is_parent: boolean;
  children?: Genre[];
  description?: string;
  is_active: boolean;
  sort_order: number;
}

interface AddDataProps {
  slug: string;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddData: React.FC<AddDataProps> = ({
  slug,
  isOpen,
  setIsOpen,
}) => {
  // React Query setup
  const queryClient = useQueryClient();
  
  // States cho genre selection
  // State for multiple parent genres
  const [selectedParents, setSelectedParents] = React.useState<string[]>([]);
  // State for selected child genre per parent
  const [selectedChildren, setSelectedChildren] = React.useState<{ [parentId: string]: string }>({});
  
  // Fetch parent genres
  const { data: parentGenres = [] } = useQuery<Genre[]>({
    queryKey: ['parentGenres'],
    queryFn: fetchParentGenres
  });

  // Fetch child genres based on selected parent
  // const { data: childGenres = [] } = useQuery<Genre[]>({
  //   queryKey: ['childGenres', selectedParentGenre],
  //   queryFn: () => fetchChildGenres(selectedParentGenre),
  //   enabled: !!selectedParentGenre
  // });
  
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // add product/movie - Updated fields
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [productionTime, setProductionTime] = React.useState('');
  // Remove single genre state
  // Remove: const [genre, setGenre] = React.useState('');
  const [producer, setProducer] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [movieType, setMovieType] = React.useState('');
  const [totalEpisodes, setTotalEpisodes] = React.useState('');
  const [releaseStatus, setReleaseStatus] = React.useState('Đã phát hành');
  const [formProductIsEmpty, setFormProductIsEmpty] = React.useState(true);

  // State lưu lỗi validation
  const [errors, setErrors] = React.useState<ValidationErrors>({});

  const loadImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imageUpload = e.target.files[0];
      setFile(imageUpload);
      setPreview(URL.createObjectURL(imageUpload));
    }
  };

  // Handler for selecting/deselecting parent genres
  const handleSelectParent = (parentId: string, checked: boolean) => {
    if (checked) {
      setSelectedParents(prev => [...prev, parentId]);
    } else {
      setSelectedParents(prev => prev.filter(id => id !== parentId));
      setSelectedChildren(prev => {
        const newChildren = { ...prev };
        delete newChildren[parentId];
        return newChildren;
      });
    }
  };

  // Handler for selecting a child genre for a parent
  const handleSelectChild = (parentId: string, childId: string) => {
    // Prevent duplicate child selection across parents
    if (Object.values(selectedChildren).includes(childId)) {
      toast.error('Thể loại con này đã được chọn cho cha khác!');
      return;
    }
    setSelectedChildren(prev => ({ ...prev, [parentId]: childId }));
  };

  // Mutation for creating product (movie)
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data: unknown) => {
      toast.success('🎬 Phim mới đã được tạo thành công!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setProductionTime('');
      // Remove single genre state
      // Remove: setGenre('');
      setProducer('');
      setPrice('');
      setMovieType('');
      setTotalEpisodes('');
      setReleaseStatus('Đã phát hành');
      setFile(null);
      setPreview(null);
      
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['allproducts'] });
      console.log('✅ Movie created:', data);
    },
    onError: (error: any) => {
      let errorMessage = 'Lỗi không xác định';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ Lỗi khi tạo phim: ${errorMessage}`);
    }
  });

  // Validate form sử dụng module validation
  const validateForm = () => {
    const formData: MovieFormData = {
      title,
      description,
      productionTime,
      producer,
      price,
      movieType,
      episodeCount: totalEpisodes,
      status: releaseStatus,
      poster: file || undefined
    };
    
    const newErrors = validateMovieForm(formData);

    // Validate at least one parent genre is selected
    if (selectedParents.length === 0) {
      newErrors.parentGenres = 'Phải chọn ít nhất một thể loại chính';
    }

    // Validate no duplicate child genres
    const childIds = Object.values(selectedChildren);
    const uniqueChildIds = Array.from(new Set(childIds));
    if (childIds.length !== uniqueChildIds.length) {
      newErrors.childGenres = 'Không được chọn trùng thể loại phụ giữa các thể loại chính';
    }
    
    setErrors(newErrors);
    return isFormValid(newErrors);
  };

  // In the form submit handler, build the genres array
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (slug === 'product') {
      // Collect all selected parent ids and child ids (no duplicates)
      let genres = [...selectedParents, ...Object.values(selectedChildren)];
      genres = Array.from(new Set(genres));

      const productData = {
        title,
        description,
        production_time: productionTime,
        genres, // <-- send array of genre ids
        producer,
        price: parseFloat(price) || 0,
        movie_type: movieType,
        total_episodes: parseInt(totalEpisodes) || 1,
        release_status: releaseStatus,
        event_start_time: '',
        poster_file: file || undefined
      };

      console.log('🎬 Submitting new movie:', productData);
      createProductMutation.mutate(productData);
    }
  };

  // Reset child genre khi parent thay đổi
  React.useEffect(() => {
    // Remove all code that sets or uses selectedParentGenre or setSelectedParentGenre
    // Remove all code that sets or uses genre as a string
  }, []);

  // Updated validation for movie form
  React.useEffect(() => {
    const requiredFields = [
      title,
      description,
      productionTime,
      producer,
      price,
      movieType,
      totalEpisodes,
      releaseStatus
    ];
    // At least one parent genre must be selected
    const hasValidGenre = selectedParents.length > 0;
    const isFormEmpty = requiredFields.some(field => field === '') || !hasValidGenre || file === null;
    setFormProductIsEmpty(isFormEmpty);
  }, [title, description, productionTime, selectedParents, selectedChildren, producer, price, movieType, totalEpisodes, releaseStatus, file]);

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
          <span className="text-2xl font-bold">🎬 Thêm phim mới</span>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Tên phim <span className="text-error">*</span></span></label>
                <input
                  type="text"
                  placeholder="Tên phim"
                  className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    const newErrors = validateOnBlur('title', title, errors);
                    setErrors(newErrors);
                  }}
                />
                {errors.title && <span className="text-error text-xs">{errors.title}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Mô tả phim <span className="text-error">*</span></span></label>
                <textarea
                  placeholder="Mô tả phim"
                  className={`textarea textarea-bordered w-full h-24 ${errors.description ? 'textarea-error' : ''}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    const newErrors = validateOnBlur('description', description, errors);
                    setErrors(newErrors);
                  }}
                />
                {errors.description && <span className="text-error text-xs">{errors.description}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Ngày sản xuất <span className="text-error">*</span></span></label>
                <input
                  type="date"
                  placeholder="Thời gian sản xuất"
                  className={`input input-bordered w-full ${errors.productionTime ? 'input-error' : ''}`}
                  value={productionTime}
                  onChange={(e) => setProductionTime(e.target.value)}
                  onBlur={() => {
                    const newErrors = validateOnBlur('productionTime', productionTime, errors);
                    setErrors(newErrors);
                  }}
                  min="1900-01-01"
                  max={`${new Date().getFullYear() + 1}-12-31`}
                />
                {errors.productionTime && <span className="text-error text-xs">{errors.productionTime}</span>}
              </div>
              
              {/* Genre Selection */}
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Thể loại chính <span className="text-error">*</span></span></label>
                <div className="flex flex-wrap gap-2">
                  {parentGenres.map((parent) => (
                    <label key={parent._id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedParents.includes(parent._id)}
                        onChange={e => handleSelectParent(parent._id, e.target.checked)}
                      />
                      <span>{parent.genre_name}</span>
                    </label>
                  ))}
                </div>
                {errors.parentGenres && <span className="text-error text-xs">{errors.parentGenres}</span>}
              </div>

              {/* For each selected parent, render a child genre dropdown */}
              {selectedParents.map(parentId => {
                const parent = parentGenres.find(g => g._id === parentId);
                // Fetch children for this parent (if not already fetched, you may need to refactor to fetch all children at once)
                const children = parent?.children || [];
                return (
                  <div key={parentId} className="form-control w-full mt-2">
                    <label className="label"><span className="label-text">Thể loại phụ cho {parent?.genre_name}</span></label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedChildren[parentId] || ''}
                      onChange={e => handleSelectChild(parentId, e.target.value)}
                    >
                      <option value="">Chọn thể loại phụ</option>
                      {children.map(child => (
                        <option
                          key={child._id}
                          value={child._id}
                          disabled={Object.values(selectedChildren).includes(child._id) && selectedChildren[parentId] !== child._id}
                        >
                          {child.genre_name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Nhà sản xuất <span className="text-error">*</span></span></label>
                <input
                  type="text"
                  placeholder="Nhà sản xuất"
                  className={`input input-bordered w-full ${errors.producer ? 'input-error' : ''}`}
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  onBlur={() => {
                    const newErrors = validateOnBlur('producer', producer, errors);
                    setErrors(newErrors);
                  }}
                />
                {errors.producer && <span className="text-error text-xs">{errors.producer}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Giá (VND) <span className="text-error">*</span></span></label>
                <input
                  type="number"
                  placeholder="Giá (VND)"
                  className={`input input-bordered w-full ${errors.price ? 'input-error' : ''}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => {
                    const newErrors = validateOnBlur('price', price, errors);
                    setErrors(newErrors);
                  }}
                  min="0"
                />
                {errors.price && <span className="text-error text-xs">{errors.price}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Kiểu nội dung<span className="text-error">*</span></span></label>
                <select
                  className={`select select-bordered w-full ${errors.movieType ? 'select-error' : ''}`}
                  value={movieType}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    setMovieType(selectedType);
                    
                    // Tự động điều chỉnh số tập dựa trên loại phim
                    if (selectedType === 'Phim lẻ') {
                      setTotalEpisodes('1');
                    } else if (selectedType === 'Phim bộ') {
                      setTotalEpisodes('2'); // Mặc định 2 tập cho phim bộ
                    } else if (selectedType === 'Thể thao') {
                      setTotalEpisodes('1'); // Thể thao thường 1 trận
                    }
                  }}
                  onBlur={() => {
                    const newErrors = validateOnBlur('movieType', movieType, errors);
                    setErrors(newErrors);
                  }}
                >
                  <option value="">Chọn kiểu nội dung</option>
                  <option value="Phim lẻ">🎬 Phim lẻ</option>
                  <option value="Phim bộ">🎬 Phim bộ</option>
                  <option value="Thể thao">⚽ Thể thao</option>
                </select>
                {errors.movieType && <span className="text-error text-xs">{errors.movieType}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Số tập <span className="text-error">*</span></span></label>
                <input
                  type="number"
                  placeholder="Số tập"
                  className={`input input-bordered w-full ${errors.totalEpisodes ? 'input-error' : ''} ${movieType === 'Phim lẻ' ? 'input-disabled' : ''}`}
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
                  onBlur={() => {
                    const newErrors = validateOnBlur('episodeCount', totalEpisodes, errors);
                    setErrors(newErrors);
                  }}
                  min={movieType === 'Phim bộ' ? '2' : '1'}
                  max={movieType === 'Phim lẻ' ? '1' : undefined}
                />
                {errors.totalEpisodes && <span className="text-error text-xs">{errors.totalEpisodes}</span>}
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

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Trạng thái phát hành</span></label>
                <select
                  className="select select-bordered w-full"
                  value={releaseStatus}
                  onChange={(e) => setReleaseStatus(e.target.value)}
                >
                  <option value="Đã phát hành">✅ Đã phát hành</option>
                  <option value="Đã kết thúc">🚫 Đã kết thúc</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Poster phim <span className="text-error">*</span></span></label>
                <input
                  type="file"
                  className={`file-input file-input-bordered w-full ${errors.poster ? 'file-input-error' : ''}`}
                  accept="image/*"
                  onChange={(e) => {
                    loadImage(e);
                    // Clear poster error when file is selected
                    if (e.target.files && e.target.files[0]) {
                      const newErrors = clearFieldError(errors, 'poster');
                      setErrors(newErrors);
                    }
                  }}
                  required
                />
                {errors.poster && <span className="text-error text-xs">{errors.poster}</span>}
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
              disabled={formProductIsEmpty || createProductMutation.isPending}
            >
              {createProductMutation.isPending ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Đang tạo...
                </>
              ) : (
                'Tạo phim'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddData;
