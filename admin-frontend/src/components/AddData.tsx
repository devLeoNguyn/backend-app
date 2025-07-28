import React, { ChangeEvent, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createProduct, fetchParentGenres } from '../api/ApiCollection';
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
  
  // States cho genre selection - theo flow EditData
  // State for multiple parent genres
  const [selectedParents, setSelectedParents] = React.useState<string[]>([]);
  // State for selected child genre per parent
  const [selectedChildren, setSelectedChildren] = React.useState<{ [parentId: string]: string }>({});
  
  // Fetch parent genres
  const { data: parentGenres = [] } = useQuery<Genre[]>({
    queryKey: ['parentGenres'],
    queryFn: fetchParentGenres
  });
  
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // add product/movie - Updated fields
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [productionTime, setProductionTime] = React.useState('');
  const [producer, setProducer] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [movieType, setMovieType] = React.useState('');
  const [totalEpisodes, setTotalEpisodes] = React.useState('');
  const [releaseStatus, setReleaseStatus] = React.useState('Đã phát hành');
  const [eventStartTime, setEventStartTime] = React.useState(''); // Thêm field cho thể thao
  const [sendNotification, setSendNotification] = React.useState(false); // Toggle notification
  const [formProductIsEmpty, setFormProductIsEmpty] = React.useState(true);

  // Validation states cho error messages - theo EditData
  const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});

  // Hàm lấy tập giao các thể loại con theo genre_name giữa các parent đã chọn - theo EditData
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

  // Hàm tìm genre theo tên
  const findGenreByName = (genreName: string): Genre | undefined => {
    return parentGenres.find(genre => 
      genre.genre_name.toLowerCase() === genreName.toLowerCase()
    );
  };

  // Hàm tự động chọn thể loại dựa trên loại nội dung
  const autoSelectGenreByMovieType = (selectedType: string) => {
    console.log('🎯 Auto-selecting genre for movie type:', selectedType);
    
    // Reset genre selections trước
    setSelectedParents([]);
    setSelectedChildren({});
    
    let targetGenreName = '';
    
    switch (selectedType) {
      case 'Phim bộ':
        targetGenreName = 'Phim bộ';
        break;
      case 'Phim lẻ':
        targetGenreName = 'Phim lẻ';
        break;
      case 'Thể thao':
        targetGenreName = 'Thể thao';
        break;
      default:
        console.log('⚠️ Unknown movie type:', selectedType);
        return;
    }
    
    // Tìm genre tương ứng
    const targetGenre = findGenreByName(targetGenreName);
    if (targetGenre) {
      console.log('✅ Found and auto-selecting genre:', targetGenre.genre_name, 'ID:', targetGenre._id);
      setSelectedParents([targetGenre._id]);
    } else {
      console.warn('⚠️ Genre not found for movie type:', selectedType, 'Genre name:', targetGenreName);
    }
  };

  // Hàm lọc genres để hiển thị dựa trên loại nội dung
  const getFilteredGenres = () => {
    if (movieType === 'Thể thao') {
      // Chỉ hiển thị genre "Thể thao"
      return parentGenres.filter(genre => 
        genre.genre_name.toLowerCase().includes('thể thao')
      );
    } else if (movieType === 'Phim lẻ') {
      // Bỏ "Phim bộ" và "Thể thao", giữ các thể loại khác
      return parentGenres.filter(genre => 
        !genre.genre_name.toLowerCase().includes('phim bộ') &&
        !genre.genre_name.toLowerCase().includes('thể thao')
      );
    } else if (movieType === 'Phim bộ') {
      // Bỏ "Phim lẻ", "Phim chiếu rạp" và "Thể thao", giữ các thể loại khác
      return parentGenres.filter(genre => 
        !genre.genre_name.toLowerCase().includes('phim lẻ') &&
        !genre.genre_name.toLowerCase().includes('phim chiếu rạp') &&
        !genre.genre_name.toLowerCase().includes('thể thao')
      );
    }
    // Hiển thị tất cả genres cho các loại khác hoặc chưa chọn
    return parentGenres;
  };

  // Hàm lấy label phù hợp với ngữ cảnh
  const getContextualLabels = () => {
    if (movieType === 'Thể thao') {
      return {
        title: 'Tên sự kiện thể thao',
        description: 'Mô tả sự kiện thể thao',
        producer: 'Đơn vị tổ chức',
        genre: 'Loại thể thao',
        subGenre: 'Môn thể thao cụ thể',
        timeField: 'Thời gian bắt đầu sự kiện'
      };
    }
    return {
      title: 'Tên phim',
      description: 'Mô tả phim',
      producer: 'Nhà sản xuất',
      genre: 'Thể loại chính',
      subGenre: 'Thể loại phụ',
      timeField: 'Thời gian sản xuất'
    };
  };

  // Hàm kiểm tra có cần hiển thị field thời gian bắt đầu không
  const shouldShowStartTimeField = () => {
    return releaseStatus === 'Sắp phát hành';
  };

  // Hàm kiểm tra có cần hiển thị field số tập không
  const shouldShowEpisodesField = () => {
    return movieType !== 'Thể thao';
  };

  // Hàm kiểm tra có cần hiển thị toggle notification không
  const shouldShowNotificationToggle = () => {
    return releaseStatus === 'Đã phát hành';
  };

  const loadImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imageUpload = e.target.files[0];
      setFile(imageUpload);
      setPreview(URL.createObjectURL(imageUpload));
    }
  };

  // Handler for selecting/deselecting parent genres - theo EditData
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

  // Handler for selecting a child genre for a parent - sửa lại để gán cho tất cả parent có child cùng tên - theo EditData
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

  // Handler cho dropdown thể loại phụ chung - theo EditData
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

  // Mutation for creating product (movie)
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data: unknown) => {
      toast.success('🎬 Phim mới đã được tạo thành công!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setProductionTime('');
      setProducer('');
      setPrice('');
      setMovieType('');
      setTotalEpisodes('');
      setReleaseStatus('Đã phát hành');
      setEventStartTime(''); // Reset event start time
      setSendNotification(false); // Reset notification toggle
      setFile(null);
      setPreview(null);
      
      // Reset genre states
      setSelectedParents([]);
      setSelectedChildren({});
      
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

  // Validation function sử dụng movieValidation module - theo EditData
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

    // Thêm validation cho event_start_time khi cần thiết
    if (releaseStatus === 'Sắp phát hành' && movieType === 'Thể thao' && !eventStartTime) {
      errors.eventStartTime = 'Vui lòng nhập thời gian bắt đầu sự kiện';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field blur for real-time validation - theo EditData
  const handleFieldBlur = (fieldName: keyof MovieFormData, value: string | File | undefined) => {
    const updatedErrors = validateOnBlur(fieldName, value, validationErrors);
    setValidationErrors(updatedErrors);
  };

  // In the form submit handler, build the genres array
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form trước khi submit
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin đã nhập');
      return;
    }

    if (slug === 'product') {
      // Xây dựng mảng genres IDs từ selections - LUÔN thêm tất cả parent và child, loại trùng
      let selectedGenreIds: string[] = [];
      selectedParents.forEach(parentId => selectedGenreIds.push(parentId));
      Object.values(selectedChildren).forEach(childId => selectedGenreIds.push(childId));
      selectedGenreIds = Array.from(new Set(selectedGenreIds)); // loại trùng

      // Tự động set số tập = 1 cho thể thao
      const finalEpisodeCount = movieType === 'Thể thao' ? 1 : parseInt(totalEpisodes) || 1;

      const productData = {
        title,
        description,
        production_time: productionTime,
        genres: selectedGenreIds, // <-- send array of genre ids
        producer,
        price: parseFloat(price) || 0,
        movie_type: movieType,
        total_episodes: finalEpisodeCount,
        release_status: releaseStatus,
        event_start_time: movieType === 'Thể thao' && releaseStatus === 'Sắp phát hành' ? eventStartTime : '',
        poster_file: file || undefined,
        send_notification: sendNotification // Thêm flag gửi notification
      };

      console.log('🎬 Submitting new movie:', productData);
      console.log('🎯 Selected genre info:', {
        selectedGenreIds,
        selectedParents,
        selectedChildren,
        parentGenres: parentGenres.length,
        hasGenreChanged: selectedGenreIds.length > 0
      });
      
      createProductMutation.mutate(productData);
    }
  };

  // Reset genre states when modal opens/closes - theo EditData
  React.useEffect(() => {
    if (!isOpen) {
      // Reset genre selections khi modal đóng
      setSelectedParents([]);
      setSelectedChildren({});
      // Reset image states khi đóng modal
      setPreview(null);
      setFile(null);
      // Reset event start time
      setEventStartTime('');
      // Reset notification toggle
      setSendNotification(false);
    } else {
      // Reset genre states when modal opens
      console.log('🔄 Modal opened, resetting genre states...');
      setSelectedParents([]);
      setSelectedChildren({});
      setEventStartTime('');
      setSendNotification(false);
    }
  }, [isOpen]);

  // Updated validation for movie form - theo EditData
  React.useEffect(() => {
    // Reset validation errors when form changes
    setValidationErrors({});
    
    const requiredFields = [title, producer, price, movieType, releaseStatus];
    const hasValidGenre = selectedParents.length > 0; // At least one parent genre selected
    
    // Thêm validation cho event_start_time khi cần thiết
    const hasValidEventTime = releaseStatus === 'Sắp phát hành' && movieType === 'Thể thao' ? !!eventStartTime : true;
    
    // Thêm validation cho totalEpisodes khi không phải thể thao
    const hasValidEpisodes = movieType === 'Thể thao' ? true : !!totalEpisodes;
    
    const isFormEmpty = requiredFields.some(field => field === '') || !hasValidGenre || !hasValidEventTime || !hasValidEpisodes;
    setFormProductIsEmpty(isFormEmpty);
  }, [title, producer, price, movieType, totalEpisodes, releaseStatus, selectedParents, eventStartTime]);

  if (!isOpen || slug !== 'product') return null;

  // Lấy labels phù hợp với ngữ cảnh
  const labels = getContextualLabels();
  const filteredGenres = getFilteredGenres();

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
                <label className="label">
                  <span className="label-text">{labels.title} <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder={movieType === 'Thể thao' ? 'Nhập tên sự kiện thể thao' : 'Tên phim'}
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
                  <span className="label-text">{labels.description} <span className="text-error">*</span></span>
                </label>
                <textarea
                  placeholder={movieType === 'Thể thao' ? 'Mô tả sự kiện thể thao' : 'Mô tả phim'}
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
              
              {/* Field thời gian - hiển thị khác nhau tùy theo loại nội dung và trạng thái */}
              {movieType === 'Thể thao' && shouldShowStartTimeField() ? (
                // Field thời gian bắt đầu sự kiện cho thể thao upcoming với datetime-local
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">{labels.timeField} <span className="text-error">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`input input-bordered w-full ${validationErrors.eventStartTime ? 'input-error' : ''}`}
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {validationErrors.eventStartTime && (
                    <div className="label">
                      <span className="label-text-alt text-error">{validationErrors.eventStartTime}</span>
                    </div>
                  )}
                </div>
              ) : (
                // Field thời gian sản xuất cho phim hoặc thể thao đã phát hành
              <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Ngày sản xuất <span className="text-error">*</span></span>
                  </label>
                <input
                  type="date"
                  placeholder="Thời gian sản xuất"
                    className={`input input-bordered w-full ${validationErrors.productionTime ? 'input-error' : ''}`}
                  value={productionTime}
                  onChange={(e) => setProductionTime(e.target.value)}
                    onBlur={() => handleFieldBlur('productionTime', productionTime)}
                  min="1900-01-01"
                  max={`${new Date().getFullYear() + 1}-12-31`}
                />
                  {validationErrors.productionTime && (
                    <div className="label">
                      <span className="label-text-alt text-error">{validationErrors.productionTime}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Kiểu nội dung - CHUYỂN LÊN TRÊN ĐỂ CHỌN TRƯỚC */}
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


                <label className="label">
                  <span className="label-text">Kiểu nội dung<span className="text-error">*</span></span>
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
                      setTotalEpisodes('2'); // Mặc định 2 tập cho phim bộ
                    } else if (selectedType === 'Thể thao') {
                      setTotalEpisodes('1'); // Thể thao thường 1 trận
                    }
                    
                    // Tự động chọn thể loại dựa trên loại nội dung
                    autoSelectGenreByMovieType(selectedType);
                  }}
                  onBlur={() => handleFieldBlur('movieType', movieType)}
                >
                  <option value="">Chọn kiểu nội dung</option>
                  <option value="Phim lẻ">🎬 Phim lẻ</option>
                  <option value="Phim bộ">🎬 Phim bộ</option>
                  <option value="Thể thao">⚽ Thể thao</option>
                </select>
                {validationErrors.movieType && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationErrors.movieType}</span>
                  </div>
                )}
              </div>
              
              {/* Current Genres Display - Based on current selection state - theo EditData */}
              {(selectedParents.length > 0 || Object.keys(selectedChildren).length > 0) && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-base-content mb-2">
                    {movieType === 'Thể thao' ? 'Loại thể thao hiện tại:' : 'Thể loại hiện tại:'}
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
                          title={movieType === 'Thể thao' ? `Môn thể thao của ${parent.genre_name}` : `Thể loại phụ của ${parent.genre_name}`}
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

              {/* Genre Selection - CHỈ HIỂN THỊ KHI ĐÃ CHỌN LOẠI NỘI DUNG */}
              {movieType && (
              <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">{labels.genre} <span className="text-error">*</span></span>
                  </label>
                <div className="flex flex-wrap gap-2">
                    {filteredGenres.map((parent) => (
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
              )}

              {/* For each selected parent, render a child genre dropdown */}
              {/* Nếu có nhiều parent và có child genre chung, render một dropdown duy nhất - theo EditData */}
              {movieType && (() => {
                const commonChildren = getCommonChildGenres();
                if (selectedParents.length > 1 && commonChildren.length > 0) {
                  // Dropdown duy nhất cho child genre chung
                  return (
                    <div className="form-control w-full mt-2">
                      <label className="label">
                        <span className="label-text">
                          {movieType === 'Thể thao' ? 'Môn thể thao chung cho các loại thể thao đã chọn' : 'Thể loại phụ chung cho các thể loại chính đã chọn'}
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
                          {movieType === 'Thể thao' ? 'Chọn môn thể thao chung' : 'Chọn thể loại phụ chung'}
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
                  // Render dropdown cho từng parent như cũ
                  return selectedParents.map(parentId => {
                const parent = parentGenres.find(g => g._id === parentId);
                const children = parent?.children || [];
                    if (children.length === 0) return null;
                return (
                  <div key={parentId} className="form-control w-full mt-2">
                        <label className="label">
                          <span className="label-text">
                            {movieType === 'Thể thao' 
                              ? `Môn thể thao cho ${parent?.genre_name}` 
                              : `Thể loại phụ cho ${parent?.genre_name}`
                            }
                          </span>
                        </label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedChildren[parentId] || ''}
                      onChange={e => handleSelectChild(parentId, e.target.value)}
                    >
                          <option value="">
                            {movieType === 'Thể thao' ? 'Chọn môn thể thao' : 'Chọn thể loại phụ'}
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
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">{labels.producer} <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder={movieType === 'Thể thao' ? 'Nhập tên đơn vị tổ chức' : 'Nhà sản xuất'}
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
                  placeholder="Giá (VND)"
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

              {/* Field số tập - CHỈ HIỂN THỊ KHI KHÔNG PHẢI THỂ THAO */}
              {shouldShowEpisodesField() && (
              <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Số tập <span className="text-error">*</span></span>
                  </label>
                <input
                  type="number"
                  placeholder="Số tập"
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
                      movieType === 'Phim bộ' ? 'Phim bộ tối thiểu 2 tập, tối đa 1000 tập' :
                      'Số tập của phim'
                    }
                  />
                  <div className="label">
                    <span className="label-text-alt text-xs">
                      {movieType === 'Phim lẻ' && '🎬 Phim lẻ: luôn 1 tập (tự động)'}
                      {movieType === 'Phim bộ' && '📺 Phim bộ: tối thiểu 2 tập, tối đa 1000 tập'}
                    </span>
                    {validationErrors.episodeCount && (
                      <span className="label-text-alt text-error">{validationErrors.episodeCount}</span>
                    )}
                  </div>
                  </div>
                )}

              {/* Thông báo cho thể thao khi ẩn field số tập */}
              {!shouldShowEpisodesField() && (
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>⚽ Thể thao: Tự động ghi nhận 1 trận đấu</span>
              </div>
              )}

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Trạng thái phát hành</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={releaseStatus}
                  onChange={(e) => setReleaseStatus(e.target.value)}
                >
                  <option value="Sắp phát hành">⏰ Sắp phát hành</option>
                  <option value="Đã phát hành">✅ Đã phát hành</option>
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
                  <span className="label-text">Poster phim <span className="text-error">*</span></span>
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
                  required
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
              disabled={formProductIsEmpty || createProductMutation.isPending}
            >
              {createProductMutation.isPending ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Đang tạo...
                </>
              ) : (
                movieType === 'Thể thao' ? 'Tạo sự kiện thể thao' : 'Tạo phim'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddData;
