import React, { ChangeEvent, FormEvent } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updateProduct, fetchParentGenres } from '../api/ApiCollection';
import { 
  validateMovieForm, 
  validateOnBlur, 
  type ValidationErrors,
  type MovieFormData
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
  // Thêm thông tin genres cho form edit
  genres?: Genre[];
  currentGenreIds?: string[];
}

interface ProductData {
  title?: string;
  description?: string;
  production_time?: string;
  genre?: string;
  genres?: string[]; // Thêm field genres cho cập nhật
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
  
  // States cho genre selection - theo flow AddData
  // State for multiple parent genres
  const [selectedParents, setSelectedParents] = React.useState<string[]>([]);
  // State for selected child genre per parent
  const [selectedChildren, setSelectedChildren] = React.useState<{ [parentId: string]: string }>({});
  
  // Fetch parent genres
  const { data: parentGenres = [] } = useQuery<Genre[]>({
    queryKey: ['parentGenres'],
    queryFn: fetchParentGenres
  });

  // Remove old single genre states
  // const [selectedParentGenre, setSelectedParentGenre] = React.useState('');
  // const [genre, setGenre] = React.useState('');
  
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Form states - Khởi tạo với dữ liệu từ movieData
  const [title, setTitle] = React.useState(movieData?.title || '');
  const [description, setDescription] = React.useState(movieData?.description || '');
  const [productionTime, setProductionTime] = React.useState(
    movieData?.createdAt ? movieData.createdAt.split('T')[0] : ''
  );
  const [producer, setProducer] = React.useState(movieData?.producer || '');
  const [price, setPrice] = React.useState(movieData?.price?.toString() || '0');
  const [movieType, setMovieType] = React.useState(movieData?.movieType || '');
  const [totalEpisodes, setTotalEpisodes] = React.useState(movieData?.totalEpisodes?.toString() || '1');
  const [releaseStatus, setReleaseStatus] = React.useState(
    movieData?.status === 'released' ? 'Đã phát hành' : 
    movieData?.status === 'ended' ? 'Đã kết thúc' : 'Đã phát hành'
  );
  
  const [formProductIsEmpty, setFormProductIsEmpty] = React.useState(false);
  
  // Validation states cho error messages
  const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});

  // Validation function sử dụng movieValidation module
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

    const errors = validateMovieForm(formData);
    
    // Thêm validation cho genres
    if (selectedParents.length === 0) {
      errors.genres = 'Phải chọn ít nhất một thể loại chính';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field blur for real-time validation
  const handleFieldBlur = (fieldName: keyof MovieFormData, value: string | File | undefined) => {
    const updatedErrors = validateOnBlur(fieldName, value, validationErrors);
    setValidationErrors(updatedErrors);
  };

  // Handler for selecting/deselecting parent genres - theo AddData
  const handleSelectParent = (parentId: string, checked: boolean) => {
    console.log('🎯 handleSelectParent:', { parentId, checked, currentParents: selectedParents });
    if (checked) {
      setSelectedParents(prev => {
        const newParents = [...prev, parentId];
        console.log('🎯 Adding parent:', parentId, 'New parents:', newParents);
        return newParents;
      });
    } else {
      setSelectedParents(prev => {
        const newParents = prev.filter(id => id !== parentId);
        console.log('🎯 Removing parent:', parentId, 'New parents:', newParents);
        return newParents;
      });
      setSelectedChildren(prev => {
        const newChildren = { ...prev };
        delete newChildren[parentId];
        console.log('🎯 Removing children for parent:', parentId, 'New children:', newChildren);
        return newChildren;
      });
    }
  };

  // Handler for selecting a child genre for a parent - theo AddData
  const handleSelectChild = (parentId: string, childId: string) => {
    console.log('🎯 handleSelectChild:', { parentId, childId, currentChildren: selectedChildren });
    
    if (childId === '') {
      // User selected "Chọn thể loại phụ" - remove child for this parent
      setSelectedChildren(prev => {
        const newChildren = { ...prev };
        delete newChildren[parentId];
        console.log('🎯 Removing child for parent:', parentId, 'New children:', newChildren);
        return newChildren;
      });
      return;
    }

    // Check if this child is already selected for a different parent
    const isChildSelectedElsewhere = Object.entries(selectedChildren).some(
      ([otherParentId, otherChildId]) => otherParentId !== parentId && otherChildId === childId
    );
    
    if (isChildSelectedElsewhere) {
      console.warn('Child genre already selected for another parent');
      toast.error('Thể loại phụ này đã được chọn cho thể loại chính khác');
      return;
    }

    // Set/replace the child for this parent
    setSelectedChildren(prev => {
      const newChildren = { ...prev, [parentId]: childId };
      console.log('🎯 Setting child:', childId, 'for parent:', parentId, 'New children:', newChildren);
      return newChildren;
    });
  };

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
      
      // Reset file và set preview từ movieData
      setFile(null);
      setPreview(movieData.img || null);
    }
  }, [movieData]);

  // Reset genre states when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset genre selections when modal closes
      setSelectedParents([]);
      setSelectedChildren({});
      // Reset image states khi đóng modal
      setPreview(null);
      setFile(null);
    } else {
      // Reset genre states when modal opens (before data loads)
      console.log('🔄 Modal opened, resetting genre states...');
      setSelectedParents([]);
      setSelectedChildren({});
    }
  }, [isOpen]);

  // Initialize genres khi cả movieData và parentGenres đều sẵn sàng
  React.useEffect(() => {
    // Chỉ initialize khi modal đang mở và có data mới
    if (movieData?.genres && movieData.genres.length > 0 && parentGenres.length > 0 && isOpen) {
      console.log('🎯 Initializing form with current genres:', movieData.genres);
      console.log('🎯 Available parent genres:', parentGenres);
      
      // Log detailed structure
      console.log('🔍 DETAILED MOVIE GENRES STRUCTURE:');
      movieData.genres.forEach((genre, index) => {
        console.log(`Genre ${index + 1}:`, {
          id: genre._id,
          name: genre.genre_name,
          is_parent: genre.is_parent,
          parent_genre: genre.parent_genre,
          parent_genre_type: typeof genre.parent_genre,
          parent_genre_structure: genre.parent_genre
        });
      });
      
      console.log('🔍 AVAILABLE PARENT GENRES FROM API:');
      parentGenres.forEach((parent, index) => {
        console.log(`Parent ${index + 1}:`, {
          id: parent._id,
          name: parent.genre_name,
          is_parent: parent.is_parent,
          children_count: parent.children?.length || 0,
          children: parent.children?.map(c => ({ id: c._id, name: c.genre_name })) || []
        });
      });
      
      const currentGenres = movieData.genres;
      const newSelectedParents: string[] = [];
      const newSelectedChildren: { [parentId: string]: string } = {};
      
      // Phân loại parent và child genres
      currentGenres.forEach(genre => {
        console.log('🔍 Processing genre:', {
          id: genre._id,
          name: genre.genre_name,
          is_parent: genre.is_parent,
          parent_genre: genre.parent_genre
        });
        
        if (genre.is_parent || !genre.parent_genre) {
          // Đây là parent genre
          newSelectedParents.push(genre._id);
          console.log('✅ Added parent genre:', genre.genre_name, 'ID:', genre._id);
        } else {
          // Đây là child genre - tìm parent ID
          const parentId = typeof genre.parent_genre === 'string' 
            ? genre.parent_genre 
            : genre.parent_genre?._id;
          
          if (parentId) {
            newSelectedChildren[parentId] = genre._id;
            console.log('✅ Added child genre:', genre.genre_name, 'ID:', genre._id, 'for parent ID:', parentId);
            
            // Đảm bảo parent cũng được chọn
            if (!newSelectedParents.includes(parentId)) {
              newSelectedParents.push(parentId);
              console.log('✅ Also added parent ID:', parentId, 'for child');
            }
          } else {
            console.warn('⚠️ Child genre without valid parent_genre:', genre);
          }
        }
      });
      
      console.log('🎯 Final genre selection to set:', { 
        newSelectedParents, 
        newSelectedChildren,
        parentCount: newSelectedParents.length,
        childCount: Object.keys(newSelectedChildren).length 
      });
      
      // Use functional update to avoid dependency issues
      setSelectedParents(() => {
        console.log('🔄 Setting selectedParents to:', newSelectedParents);
        return newSelectedParents;
      });
      setSelectedChildren(() => {
        console.log('🔄 Setting selectedChildren to:', newSelectedChildren);
        return newSelectedChildren;
      });
      
      console.log('🎯 State initialization completed');
    } else {
      console.log('🚫 Genre initialization skipped:', {
        hasGenres: !!movieData?.genres?.length,
        genresCount: movieData?.genres?.length || 0,
        hasParentGenres: parentGenres.length > 0,
        parentGenresCount: parentGenres.length,
        isOpen
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieData?.genres, parentGenres, isOpen, movieData?.id]); // Thêm movieData.id để re-init khi edit movie khác

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
      
      // Invalidate tất cả queries liên quan
      queryClient.invalidateQueries({ queryKey: ['allproducts'] });
      // Invalidate single movie cache để force re-fetch khi edit lại
      queryClient.invalidateQueries({ queryKey: ['singleProduct'] });
      queryClient.invalidateQueries({ queryKey: ['movie'] });
      
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
    
    // Validate form trước khi submit
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin đã nhập');
      return;
    }
    
    if (slug === 'product') {
      // Xây dựng mảng genres IDs từ selections - FIXED: Thêm CẢ parent VÀ child
      let selectedGenreIds: string[] = [];
      
      // LUÔN thêm tất cả parent genres được chọn
      selectedParents.forEach(parentId => {
        selectedGenreIds.push(parentId);
        console.log('➕ Adding parent genre ID:', parentId);
      });
      
      // LUÔN thêm tất cả child genres được chọn
      Object.values(selectedChildren).forEach(childId => {
        selectedGenreIds.push(childId);
        console.log('➕ Adding child genre ID:', childId);
      });
      
      // Remove duplicates just in case
      selectedGenreIds = Array.from(new Set(selectedGenreIds));
      
      console.log('🎯 NEW Genre selection logic (both parent + child):', {
        selectedParents,
        selectedChildren, 
        finalGenreIds: selectedGenreIds,
        totalGenres: selectedGenreIds.length,
        shouldHaveBothParentAndChild: Object.keys(selectedChildren).length > 0
      });
      
      // Chỉ gửi các field đã thay đổi
      const productData: ProductData = {};
      
      if (title !== movieData?.title) productData.title = title;
      if (description !== movieData?.description) productData.description = description;
      if (productionTime) productData.production_time = productionTime;
      
      // LUÔN gửi genres để đảm bảo replace hoàn toàn
      // So sánh với genres hiện tại để log thay đổi
      const currentGenreIds = movieData?.currentGenreIds || [];
      const hasGenreChanged = selectedGenreIds.length !== currentGenreIds.length || 
                             !selectedGenreIds.every(id => currentGenreIds.includes(id));
      
      // Luôn gửi genres array để backend replace hoàn toàn
      productData.genres = selectedGenreIds;
      
      console.log('🎯 Genre comparison:', {
        current: currentGenreIds,
        new: selectedGenreIds,
        hasChanged: hasGenreChanged
      });
      
      console.log('🚀 [SUBMIT] Final data being sent to API:', {
        productData,
        genres: productData.genres,
        movieId: movieData?.id
      });
      
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
        selectedGenreIds,
        selectedParents,
        selectedChildren,
        parentGenres: parentGenres.length,
        hasGenreChanged: selectedGenreIds.length > 0
      });
      
      updateProductMutation.mutate({
        productId: movieData.id,
        productData
      });
    }
  };

  // Validation - cập nhật để sử dụng new genre states và validation function
  React.useEffect(() => {
    // Reset validation errors when form changes
    setValidationErrors({});
    
    const requiredFields = [title, producer, price, movieType, totalEpisodes, releaseStatus];
    const hasValidGenre = selectedParents.length > 0; // At least one parent genre selected
    const isFormEmpty = requiredFields.some(field => field === '') || !hasValidGenre;
    setFormProductIsEmpty(isFormEmpty);
  }, [title, producer, price, movieType, totalEpisodes, releaseStatus, selectedParents]);

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
              {/* Title Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tên phim <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên phim"
                  className={`input input-bordered w-full ${validationErrors.title ? 'input-error' : ''}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleFieldBlur('title', title)}
                  maxLength={200}
                />
                {validationErrors.title && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.title}</span>
                  </div>
                )}
              </div>
              
              {/* Description Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Mô tả phim <span className="text-error">*</span></span>
                </label>
                <textarea
                  placeholder="Nhập mô tả chi tiết về phim"
                  className={`textarea textarea-bordered w-full h-24 ${validationErrors.description ? 'textarea-error' : ''}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', description)}
                  maxLength={2000}
                />
                <div className="label">
                  <span className="label-text-alt">{description.length}/2000 ký tự</span>
                  {validationErrors.description && (
                    <span className="label-text-alt text-error">{validationErrors.description}</span>
                  )}
                </div>
              </div>
              
              {/* Production Time Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Thời gian sản xuất <span className="text-error">*</span></span>
                </label>
                <input
                  type="date"
                  className={`input input-bordered w-full ${validationErrors.productionTime ? 'input-error' : ''}`}
                  value={productionTime}
                  onChange={(e) => setProductionTime(e.target.value)}
                  onBlur={() => handleFieldBlur('productionTime', productionTime)}
                />
                {validationErrors.productionTime && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.productionTime}</span>
                  </div>
                )}
              </div>
              
              {/* Current Genres Display - Based on current selection state */}
              {(selectedParents.length > 0 || Object.keys(selectedChildren).length > 0) && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-base-content mb-2">Thể loại hiện tại:</h4>
                  <div className="flex flex-wrap gap-2">
                    {/* Show selected parent genres (only those without selected children) */}
                    {selectedParents
                      .filter(parentId => !selectedChildren[parentId])
                      .map(parentId => {
                        const parent = parentGenres.find(g => g._id === parentId);
                        return parent ? (
                          <span 
                            key={`parent-${parent._id}`} 
                            className="badge badge-primary badge-sm"
                          >
                            {parent.genre_name}
                          </span>
                        ) : null;
                      })}
                    
                    {/* Show selected child genres với tên parent */}
                    {Object.entries(selectedChildren).map(([parentId, childId]) => {
                      // Find parent genre
                      const parent = parentGenres.find(g => g._id === parentId);
                      // Find child genre in parent's children
                      const childGenre = parent?.children?.find(child => child._id === childId);
                      
                      if (!parent || !childGenre) return null;
                      
                      return (
                        <span 
                          key={`child-${childGenre._id}`} 
                          className="badge badge-primary badge-sm"
                          title={`Thể loại phụ của ${parent.genre_name}`}
                        >
                          {parent.genre_name} - {childGenre.genre_name}
                        </span>
                      );
                    })}
                  </div>
                  {/* Debug info - có thể xóa sau khi test */}
                  <div className="text-xs text-base-content opacity-50 mt-2">
                    Debug: Parents={selectedParents.length}, Children={Object.keys(selectedChildren).length}
                  </div>
                </div>
              )}

              {/* Genre Selection - theo AddData flow */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Thể loại chính <span className="text-error">*</span></span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {parentGenres.map((parent) => (
                    <label key={parent._id} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={selectedParents.includes(parent._id)}
                        onChange={e => handleSelectParent(parent._id, e.target.checked)}
                      />
                      <span className="text-sm">{parent.genre_name}</span>
                    </label>
                  ))}
                </div>
                {validationErrors.genres && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.genres}</span>
                  </div>
                )}
              </div>

              {/* For each selected parent, render a child genre dropdown */}
              {selectedParents.map(parentId => {
                const parent = parentGenres.find(g => g._id === parentId);
                const children = parent?.children || [];
                
                // Only render dropdown if parent has children
                if (children.length === 0) return null;
                
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
              {/* Producer Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Nhà sản xuất <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên nhà sản xuất"
                  className={`input input-bordered w-full ${validationErrors.producer ? 'input-error' : ''}`}
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  onBlur={() => handleFieldBlur('producer', producer)}
                  maxLength={100}
                />
                {validationErrors.producer && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.producer}</span>
                  </div>
                )}
              </div>

              {/* Price Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Giá phim (VND) <span className="text-error">*</span></span>
                </label>
                <input
                  type="number"
                  placeholder="Nhập giá phim"
                  className={`input input-bordered w-full ${validationErrors.price ? 'input-error' : ''}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => handleFieldBlur('price', price)}
                  min="0"
                  max="1000000"
                  step="1000"
                />
                <div className="label">
                  <span className="label-text-alt">Giá từ 0 đến 1,000,000 VND</span>
                  {validationErrors.price && (
                    <span className="label-text-alt text-error">{validationErrors.price}</span>
                  )}
                </div>
              </div>

              {/* Movie Type Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Loại phim <span className="text-error">*</span></span>
                </label>
                <select
                  className={`select select-bordered w-full ${validationErrors.movieType ? 'select-error' : ''}`}
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
                  onBlur={() => handleFieldBlur('movieType', movieType)}
                >
                  <option value="">Chọn loại phim</option>
                  <option value="Phim lẻ">🎬 Phim lẻ</option>
                  <option value="Phim bộ">📺 Phim bộ</option>
                  <option value="Thể thao">⚽ Thể thao</option>
                </select>
                {validationErrors.movieType && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.movieType}</span>
                  </div>
                )}
              </div>

              {/* Total Episodes Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Số tập <span className="text-error">*</span></span>
                </label>
                <input
                  type="number"
                  placeholder="Nhập số tập"
                  className={`input input-bordered w-full ${movieType === 'Phim lẻ' ? 'input-disabled' : ''} ${validationErrors.episodeCount ? 'input-error' : ''}`}
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
                  onBlur={() => handleFieldBlur('episodeCount', totalEpisodes)}
                  min={movieType === 'Phim bộ' ? '2' : '1'}
                  max={movieType === 'Phim lẻ' ? '1' : '1000'}
                  title={
                    movieType === 'Phim lẻ' ? 'Phim lẻ luôn là 1 tập (không thể thay đổi)' :
                    movieType === 'Phim bộ' ? 'Phim bộ tối thiểu 2 tập' :
                    'Số tập của phim'
                  }
                />
                <div className="label">
                  <span className="label-text-alt text-xs">
                    {movieType === 'Phim lẻ' && '🎬 Phim lẻ: luôn 1 tập (tự động)'}
                    {movieType === 'Phim bộ' && '📺 Phim bộ: tối thiểu 2 tập, tối đa 1000 tập'}
                    {movieType === 'Thể thao' && '⚽ Thể thao: thường 1 trận đấu'}
                  </span>
                  {validationErrors.episodeCount && (
                    <span className="label-text-alt text-error">{validationErrors.episodeCount}</span>
                  )}
                </div>
              </div>

              {/* Release Status Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Trạng thái phát hành <span className="text-error">*</span></span>
                </label>
                <select
                  className={`select select-bordered w-full ${validationErrors.status ? 'select-error' : ''}`}
                  value={releaseStatus}
                  onChange={(e) => setReleaseStatus(e.target.value)}
                  onBlur={() => handleFieldBlur('status', releaseStatus)}
                >
                  <option value="Đã phát hành">✅ Đã phát hành</option>
                  <option value="Đã kết thúc">🚫 Đã kết thúc</option>
                </select>
                {validationErrors.status && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.status}</span>
                  </div>
                )}
              </div>

              {/* Poster Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Poster phim</span>
                  <span className="label-text-alt">JPG, PNG, WebP - Tối đa 10MB</span>
                </label>
                <input
                  type="file"
                  className={`file-input file-input-bordered w-full ${validationErrors.poster ? 'file-input-error' : ''}`}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    loadImage(e);
                    if (e.target.files && e.target.files[0]) {
                      handleFieldBlur('poster', e.target.files[0]);
                    }
                  }}
                />
                {validationErrors.poster && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.poster}</span>
                  </div>
                )}
                {preview && (
                  <div className="mt-2">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-40 object-cover rounded-lg border-2 border-base-300"
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