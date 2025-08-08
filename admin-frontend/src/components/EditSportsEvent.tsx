import React, { ChangeEvent, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateProduct, fetchParentGenres } from '../api/ApiCollection';
import { 
  validateMovieForm, 
  validateOnBlur, 
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

interface SportsEventData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  producer: string;
  price: number;
  movieType: string;
  totalEpisodes: number;
  status: 'released' | 'ended' | 'upcoming' | string;
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

interface EditSportsEventProps {
  slug: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sportsEventData: SportsEventData;
}

/**
 * ⚽ EditSportsEvent Component - Form chỉnh sửa sự kiện thể thao:
 * 1. Sử dụng production_time cho thời gian bắt đầu sự kiện
 * 2. Tự động set movie_type = 'Thể thao' (không đổi được)
 * 3. Tự động set total_episodes = 1 (không đổi được)
 * 4. Chỉ hiển thị genres liên quan đến thể thao
 * 5. Load và cập nhật thông tin sự kiện thể thao hiện có
 */

const EditSportsEvent: React.FC<EditSportsEventProps> = ({
  slug,
  isOpen,
  setIsOpen,
  sportsEventData
}) => {
  // React Query setup
  const queryClient = useQueryClient();
  
  // States cho genre selection
  const [selectedParents, setSelectedParents] = React.useState<string[]>([]);
  const [selectedChildren, setSelectedChildren] = React.useState<{ [parentId: string]: string }>({});
  
  // Fetch parent genres
  const { data: parentGenres = [] } = useQuery<Genre[]>({
    queryKey: ['parentGenres'],
    queryFn: fetchParentGenres
  });
  
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Form states - Khởi tạo với dữ liệu từ sportsEventData
  const [title, setTitle] = React.useState(sportsEventData?.title || '');
  const [description, setDescription] = React.useState(sportsEventData?.description || '');
  const [productionTime, setProductionTime] = React.useState('');
  const [producer, setProducer] = React.useState(sportsEventData?.producer || '');
  const [price, setPrice] = React.useState(sportsEventData?.price?.toString() || '0');
  const [releaseStatus, setReleaseStatus] = React.useState(
    sportsEventData?.status === 'released' ? 'Đã phát hành' : 
    sportsEventData?.status === 'ended' ? 'Đã kết thúc' : 
    sportsEventData?.status === 'upcoming' ? 'Sắp phát hành' : 'Đã phát hành'
  );
  const [sendNotification, setSendNotification] = React.useState(false);
  
  const [formProductIsEmpty, setFormProductIsEmpty] = React.useState(false);
  
  // Validation states
  const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});

  // Hàm lấy tập giao các thể loại con theo genre_name giữa các parent đã chọn
  const getCommonChildGenres = () => {
    if (selectedParents.length < 2) return [];
    const childrenArrays = selectedParents
      .map(parentId => {
        const parent = parentGenres.find(g => g._id === parentId);
        return parent?.children || [];
      });
    if (childrenArrays.some(arr => arr.length === 0)) return [];
    const genreNameCount: Record<string, number> = {};
    childrenArrays.forEach(arr => {
      arr.forEach(child => {
        genreNameCount[child.genre_name] = (genreNameCount[child.genre_name] || 0) + 1;
      });
    });
    const commonGenreNames = Object.entries(genreNameCount)
      .filter(([, count]) => count === childrenArrays.length)
      .map(([name]) => name);
    const firstParentChildren = childrenArrays[0];
    return firstParentChildren.filter(child => commonGenreNames.includes(child.genre_name));
  };

  // Hàm lọc genres chỉ hiển thị thể thao
  const getSportsGenres = () => {
    return parentGenres.filter(genre => 
      genre.genre_name.toLowerCase().includes('thể thao')
    );
  };

  // Hàm kiểm tra có cần hiển thị field ngày sản xuất không
  const shouldShowProductionDateField = () => {
    const shouldShow = releaseStatus === 'Sắp phát hành';
    console.log('🔍 shouldShowProductionDateField:', { 
      releaseStatus, 
      shouldShow,
      productionTime 
    });
    return shouldShow;
  };

  // Hàm kiểm tra có cần hiển thị toggle notification không
  const shouldShowNotificationToggle = () => {
    return releaseStatus === 'Đã phát hành';
  };

  // Validation function
  const validateForm = () => {
    const formData: MovieFormData = {
      title,
      description,
      productionTime,
      producer,
      price,
      movieType: 'Thể thao', // Luôn là thể thao
      episodeCount: '1', // Luôn là 1
      status: releaseStatus,
      poster: file || undefined
    };

    const errors = validateMovieForm(formData);
    
    // Thêm validation cho genres
    if (selectedParents.length === 0) {
      errors.genres = 'Phải chọn ít nhất một loại thể thao';
    }

    // Thêm validation cho production_time khi trạng thái là "Sắp phát hành"
    if (releaseStatus === 'Sắp phát hành' && !productionTime) {
      errors.productionTime = 'Vui lòng nhập thời gian bắt đầu sự kiện thể thao';
    }

    // Clear productionTime error if status is not "Sắp phát hành"
    if (releaseStatus !== 'Sắp phát hành' && errors.productionTime) {
      console.log('🧹 Clearing productionTime error because status is not "Sắp phát hành"');
      delete errors.productionTime;
    }

    console.log('📋 Final validation errors:', errors);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field blur for real-time validation
  const handleFieldBlur = (fieldName: keyof MovieFormData, value: string | File | undefined) => {
    const updatedErrors = validateOnBlur(fieldName, value, validationErrors);
    setValidationErrors(updatedErrors);
  };

  // Handler for selecting/deselecting parent genres
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

  // Handler for selecting a child genre for a parent
  const handleSelectChild = (parentId: string, childId: string) => {
    // Tìm genre_name của child vừa chọn
    const parent = parentGenres.find(g => g._id === parentId);
    const childGenre = parent?.children?.find(child => child._id === childId);
    if (!childGenre) return;

    // Tìm tất cả parent đang được chọn có child cùng genre_name
    const affectedParents = selectedParents.filter(pid => {
      const p = parentGenres.find(g => g._id === pid);
      return p?.children?.some(child => child.genre_name === childGenre.genre_name);
    });

    // Tìm đúng childId cho từng parent (có thể khác nhau nếu DB có nhiều child cùng tên)
    const newSelectedChildren: { [parentId: string]: string } = { ...selectedChildren };
    affectedParents.forEach(pid => {
      const p = parentGenres.find(g => g._id === pid);
      const matchingChild = p?.children?.find(child => child.genre_name === childGenre.genre_name);
      if (matchingChild) {
        newSelectedChildren[pid] = matchingChild._id;
      }
    });

    setSelectedChildren(newSelectedChildren);
  };

  // Handler cho dropdown thể loại phụ chung
  const handleSelectCommonChild = (genreName: string) => {
    const newSelectedChildren = { ...selectedChildren };
    selectedParents.forEach(parentId => {
      const parent = parentGenres.find(g => g._id === parentId);
      const matchingChild = parent?.children?.find(child => child.genre_name.toLowerCase() === genreName.toLowerCase());
      if (matchingChild) {
        newSelectedChildren[parentId] = matchingChild._id;
      }
    });
    setSelectedChildren(newSelectedChildren);
  };

  // Update form data when sportsEventData changes
  React.useEffect(() => {
    if (sportsEventData) {
      console.log('🔄 Loading sports event data into form:', {
        title: sportsEventData.title,
        status: sportsEventData.status,
        createdAt: sportsEventData.createdAt
      });
      
      setTitle(sportsEventData.title || '');
      setDescription(sportsEventData.description || '');
      
      // Chỉ set productionTime nếu status là "Sắp phát hành" hoặc có createdAt
      const shouldSetProductionTime = sportsEventData.status === 'upcoming' || sportsEventData.createdAt;
      setProductionTime(shouldSetProductionTime && sportsEventData.createdAt ? sportsEventData.createdAt.slice(0, 16) : '');
      
      setProducer(sportsEventData.producer || '');
      setPrice(sportsEventData.price?.toString() || '0');
      setReleaseStatus(
        sportsEventData.status === 'released' ? 'Đã phát hành' : 
        sportsEventData.status === 'ended' ? 'Đã kết thúc' : 
        sportsEventData.status === 'upcoming' ? 'Sắp phát hành' : 'Đã phát hành'
      );
      
      // Reset notification toggle
      setSendNotification(false);
      
      // Reset file và set preview từ sportsEventData
      setFile(null);
      setPreview(sportsEventData.img || null);
      
      console.log('✅ Sports event form data loaded successfully');
    }
  }, [sportsEventData]);

  // Reset states when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset states khi modal đóng
      setSelectedParents([]);
      setSelectedChildren({});
      setPreview(null);
      setFile(null);
      setProductionTime('');
      setSendNotification(false);
    } else {
      // Reset states when modal opens (before data loads)
      console.log('🔄 Sports modal opened, resetting states...');
      setSelectedParents([]);
      setSelectedChildren({});
      setProductionTime('');
      setSendNotification(false);
    }
  }, [isOpen]);

  // Initialize genres khi cả sportsEventData và parentGenres đều sẵn sàng
  React.useEffect(() => {
    // Chỉ initialize khi modal đang mở và có data mới
    if (sportsEventData?.genres && sportsEventData.genres.length > 0 && parentGenres.length > 0 && isOpen) {
      console.log('🎯 Initializing sports form with current genres:', sportsEventData.genres);
      console.log('🎯 Available parent genres:', parentGenres);
      
      const currentGenres = sportsEventData.genres;
      const newSelectedParents: string[] = [];
      const newSelectedChildren: { [parentId: string]: string } = {};
      
      // Phân loại parent và child genres
      currentGenres.forEach(genre => {
        console.log('🔍 Processing sports genre:', {
          id: genre._id,
          name: genre.genre_name,
          is_parent: genre.is_parent,
          parent_genre: genre.parent_genre
        });
        
        if (genre.is_parent || !genre.parent_genre) {
          // Đây là parent genre
          newSelectedParents.push(genre._id);
          console.log('✅ Added parent sports genre:', genre.genre_name, 'ID:', genre._id);
        } else {
          // Đây là child genre - tìm parent ID
          const parentId = typeof genre.parent_genre === 'string' 
            ? genre.parent_genre 
            : genre.parent_genre?._id;
          
          if (parentId) {
            newSelectedChildren[parentId] = genre._id;
            console.log('✅ Added child sports genre:', genre.genre_name, 'ID:', genre._id, 'for parent ID:', parentId);
            
            // Đảm bảo parent cũng được chọn
            if (!newSelectedParents.includes(parentId)) {
              newSelectedParents.push(parentId);
              console.log('✅ Also added parent ID:', parentId, 'for child');
            }
          } else {
            console.warn('⚠️ Child sports genre without valid parent_genre:', genre);
          }
        }
      });
      
      console.log('🎯 Final sports genre selection to set:', { 
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
      
      console.log('🎯 Sports genre state initialization completed');
    } else {
      console.log('🚫 Sports genre initialization skipped:', {
        hasGenres: !!sportsEventData?.genres?.length,
        genresCount: sportsEventData?.genres?.length || 0,
        hasParentGenres: parentGenres.length > 0,
        parentGenresCount: parentGenres.length,
        isOpen
      });
    }
  }, [sportsEventData?.genres, parentGenres, isOpen, sportsEventData?.id]);

  // Load image handler
  const loadImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imageUpload = e.target.files[0];
      setFile(imageUpload);
      setPreview(URL.createObjectURL(imageUpload));
    }
  };

  // Mutation for updating sports event
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, productData }: { productId: string, productData: ProductData }) => 
      updateProduct(productId, productData),
    onSuccess: (data: unknown) => {
      toast.success('⚽ Sự kiện thể thao đã được cập nhật thành công!');
      setIsOpen(false);
      
      // Invalidate tất cả queries liên quan
      queryClient.invalidateQueries({ queryKey: ['allproducts'] });
      queryClient.invalidateQueries({ queryKey: ['singleProduct'] });
      queryClient.invalidateQueries({ queryKey: ['movie'] });
      
      console.log('✅ Sports event updated:', data);
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
      
      toast.error(`❌ Lỗi khi cập nhật sự kiện thể thao: ${errorMessage}`);
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
      // Xây dựng mảng genres IDs từ selections
      let selectedGenreIds: string[] = [];
      selectedParents.forEach(parentId => selectedGenreIds.push(parentId));
      Object.values(selectedChildren).forEach(childId => selectedGenreIds.push(childId));
      selectedGenreIds = Array.from(new Set(selectedGenreIds)); // loại trùng

      // Chỉ gửi các field đã thay đổi
      const productData: ProductData = {};
      
      if (title !== sportsEventData?.title) productData.title = title;
      if (description !== sportsEventData?.description) productData.description = description;
      if (productionTime) productData.production_time = productionTime;
      
      // LUÔN gửi genres để đảm bảo replace hoàn toàn
      productData.genres = selectedGenreIds;
      
      console.log('🎯 Sports genre comparison:', {
        current: sportsEventData?.currentGenreIds || [],
        new: selectedGenreIds
      });
      
      if (producer !== sportsEventData?.producer) productData.producer = producer;
      if (parseFloat(price) !== sportsEventData?.price) productData.price = parseFloat(price) || 0;
      
      // Kiểm tra thay đổi release status
      const currentStatusVietnamese = sportsEventData?.status === 'released' ? 'Đã phát hành' : 
                                     sportsEventData?.status === 'ended' ? 'Đã kết thúc' : 
                                     sportsEventData?.status === 'upcoming' ? 'Sắp phát hành' : 'Đã phát hành';
      if (releaseStatus !== currentStatusVietnamese) {
        productData.release_status = releaseStatus;
      }
      
      if (file) productData.poster_file = file;
      
      console.log('⚽ Submitting sports event update:', productData);
      console.log('🎯 Selected sports genre info:', {
        selectedGenreIds,
        selectedParents,
        selectedChildren,
        parentGenres: parentGenres.length
      });
      
      updateProductMutation.mutate({
        productId: sportsEventData.id,
        productData
      });
    }
  };

  // Form validation effect
  React.useEffect(() => {
    // Reset validation errors when form changes
    setValidationErrors({});
    
    const requiredFields = [title, producer, price, releaseStatus];
    const hasValidGenre = selectedParents.length > 0;
    
    // Thêm validation cho production_time khi trạng thái là "Sắp phát hành"
    const hasValidProductionTime = releaseStatus === 'Sắp phát hành' ? !!productionTime : true;
    
    const isFormEmpty = requiredFields.some(field => field === '') || !hasValidGenre || !hasValidProductionTime;
    
    console.log('🔍 Sports form validation check:', {
      requiredFields: requiredFields.map(f => f ? 'filled' : 'empty'),
      hasValidGenre,
      hasValidProductionTime,
      isFormEmpty
    });
    
    setFormProductIsEmpty(isFormEmpty);
  }, [title, producer, price, releaseStatus, selectedParents, productionTime]);

  if (!isOpen || slug !== 'product') return null;

  const sportsGenres = getSportsGenres();

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
          <span className="text-2xl font-bold">⚽ Chỉnh sửa sự kiện thể thao: {sportsEventData?.title}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tên sự kiện thể thao <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên sự kiện thể thao"
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
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Mô tả sự kiện thể thao <span className="text-error">*</span></span>
                </label>
                <textarea
                  placeholder="Nhập mô tả chi tiết về sự kiện thể thao"
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
              
              {/* Field thời gian bắt đầu sự kiện - chỉ cho sự kiện upcoming */}
              {shouldShowProductionDateField() && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Thời gian bắt đầu sự kiện <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`input input-bordered w-full ${validationErrors.productionTime ? 'input-error' : ''}`}
                    value={productionTime}
                    onChange={(e) => setProductionTime(e.target.value)}
                    onBlur={() => handleFieldBlur('productionTime', productionTime)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {validationErrors.productionTime && (
                    <div className="label">
                      <span className="label-text-alt text-error">{validationErrors.productionTime}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Đơn vị tổ chức <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên đơn vị tổ chức"
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

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Giá (VND) <span className="text-error">*</span></span>
                </label>
                <input
                  type="number"
                  placeholder="Nhập giá vé"
                  className={`input input-bordered w-full ${validationErrors.price ? 'input-error' : ''}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => handleFieldBlur('price', price)}
                  min="0"
                />
                {validationErrors.price && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.price}</span>
                  </div>
                )}
              </div>
              
              {/* Current Genres Display */}
              {(selectedParents.length > 0 || Object.keys(selectedChildren).length > 0) && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-base-content mb-2">
                    Loại thể thao hiện tại:
                  </h4>
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
                          title={`Môn thể thao của ${parent.genre_name}`}
                        >
                          {parent.genre_name} - {childGenre.genre_name}
                        </span>
                      );
                    })}
                  </div>
                  {/* Debug info */}
                  <div className="text-xs text-base-content opacity-50 mt-2">
                    Debug: Parents={selectedParents.length}, Children={Object.keys(selectedChildren).length}
                  </div>
                </div>
              )}

              {/* Genre Selection - hiển thị tất cả genres thể thao */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Loại thể thao <span className="text-error">*</span></span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sportsGenres.map((parent) => {
                    const isChecked = selectedParents.includes(parent._id);
                    return (
                      <label key={parent._id} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary checkbox-sm"
                          checked={isChecked}
                          onChange={e => handleSelectParent(parent._id, e.target.checked)}
                        />
                        <span className="text-sm">{parent.genre_name}</span>
                      </label>
                    );
                  })}
                </div>
                {validationErrors.genres && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.genres}</span>
                  </div>
                )}
              </div>

              {/* For each selected parent, render a child genre dropdown */}
              {(() => {
                const commonChildren = getCommonChildGenres();
                if (selectedParents.length > 1 && commonChildren.length > 0) {
                  // Dropdown duy nhất cho child genre chung
                  return (
                    <div className="form-control w-full mt-2">
                      <label className="label">
                        <span className="label-text">
                          Môn thể thao chung cho các loại thể thao đã chọn
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={(() => {
                          const selectedNames = selectedParents
                            .map(pid => {
                              const childId = selectedChildren[pid];
                              const parent = parentGenres.find(g => g._id === pid);
                              const child = parent?.children?.find(c => c._id === childId);
                              return child?.genre_name || '';
                            })
                            .filter(Boolean);
                          if (
                            selectedNames.length === selectedParents.length &&
                            selectedNames.every(n => n === selectedNames[0])
                          ) {
                            return selectedNames[0];
                          }
                          return '';
                        })()}
                        onChange={e => handleSelectCommonChild(e.target.value)}
                      >
                        <option value="">
                          Chọn môn thể thao chung
                        </option>
                        {commonChildren.map(child => (
                          <option key={child.genre_name} value={child.genre_name}>
                            {child.genre_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                } else {
                  // Render dropdown cho từng parent
                  return selectedParents.map(parentId => {
                    const parent = parentGenres.find(g => g._id === parentId);
                    const children = parent?.children || [];
                    if (children.length === 0) return null;
                    return (
                      <div key={parentId} className="form-control w-full mt-2">
                        <label className="label">
                          <span className="label-text">
                            Môn thể thao cho {parent?.genre_name}
                          </span>
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={selectedChildren[parentId] || ''}
                          onChange={e => handleSelectChild(parentId, e.target.value)}
                        >
                          <option value="">
                            Chọn môn thể thao
                          </option>
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
                  });
                }
              })()}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Thông báo cho thể thao */}
              <div className="text-xs text-base-content opacity-70">
                ⚽ Thể thao: Tự động ghi nhận 1 trận đấu
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Trạng thái phát hành <span className="text-error">*</span></span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={releaseStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setReleaseStatus(newStatus);
                    
                    // Reset notification khi chuyển từ "Sắp phát hành" sang "Đã phát hành"
                    if (newStatus === 'Đã phát hành' && releaseStatus === 'Sắp phát hành') {
                      setSendNotification(false);
                    }
                    
                    // Reset production time khi chuyển từ "Đã phát hành" sang "Sắp phát hành"
                    if (newStatus === 'Sắp phát hành' && releaseStatus === 'Đã phát hành') {
                      setProductionTime('');
                    }
                  }}
                >
                  <option value="Sắp phát hành">⏰ Sắp phát hành</option>
                  <option value="Đã phát hành">✅ Đã phát hành</option>
                  <option value="Đã kết thúc">🏁 Đã kết thúc</option>
                </select>
              </div>

              {/* Toggle notification - CHỈ HIỂN THỊ KHI TRẠNG THÁI LÀ "ĐÃ PHÁT HÀNH" */}
              {shouldShowNotificationToggle() && (
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">📢 Gửi thông báo ngay đến người dùng</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                    />
                  </label>
                  <div className="label">
                    <span className="label-text-alt text-xs">
                      Khi bật, hệ thống sẽ gửi push notification ngay lập tức đến tất cả người dùng
                    </span>
                  </div>
                </div>
              )}

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Poster sự kiện</span>
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

          <div className="mt-6 flex justify-between items-center">
            {/* Debug info */}
            <div className="text-xs text-base-content opacity-50">
              Debug: releaseStatus={releaseStatus}
            </div>
            
            <div className="flex gap-2">
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
                    Đang cập nhật...
                  </>
                ) : (
                  'Cập nhật sự kiện thể thao'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSportsEvent;
