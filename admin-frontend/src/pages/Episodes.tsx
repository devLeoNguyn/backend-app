import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  fetchEpisodesByMovie, 
  deleteEpisode,
  fetchSingleProduct,
  Episode
} from '../api/ApiCollection';
import DataTable from '../components/DataTable';
import EpisodeForm from '../components/episodes/EpisodeForm.tsx';
import EpisodeVideoUpload from '../components/episodes/EpisodeVideoUpload.tsx';
import { HiPlus, HiPencil, HiTrash, HiArrowLeft, HiVideoCamera } from 'react-icons/hi2';

const Episodes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const movieId = searchParams.get('movieId');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if no movieId
  useEffect(() => {
    if (!movieId && !isRedirecting) {
      setIsRedirecting(true);
      navigate('/admin/products');
    }
  }, [movieId, navigate, isRedirecting]);

  // Fetch episodes data
  const { isLoading, isError, data: episodesData } = useQuery({
    queryKey: ['episodes', movieId],
    queryFn: () => fetchEpisodesByMovie(movieId!),
    enabled: !!movieId
  });

  // Fetch movie details
  const { data: movieData } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => fetchSingleProduct(movieId!),
    enabled: !!movieId
  });

  // Delete episode mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEpisode,
    onSuccess: () => {
      toast.success('Episode deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['episodes', movieId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete episode');
    }
  });

  // Early return if no movieId (will redirect via useEffect)
  if (!movieId || isRedirecting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Redirecting to products page...</div>
      </div>
    );
  }

  // Handle add new episode
  const handleAddEpisode = () => {
    setSelectedEpisode(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  // Handle edit episode
  const handleEditEpisode = (rowData: Record<string, unknown>) => {
    const episode = rowData as unknown as Episode;
    setSelectedEpisode(episode);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  // Handle video upload
  const handleVideoUpload = (rowData: Record<string, unknown>) => {
    const episode = rowData as unknown as Episode;
    setSelectedEpisode(episode);
    setIsVideoUploadOpen(true);
  };

  // Handle delete episode
  const handleDeleteEpisode = (rowData: Record<string, unknown>) => {
    const episode = rowData as unknown as Episode;
    if (window.confirm(`Are you sure you want to delete Episode ${episode.episode_number}: ${episode.episode_title}?`)) {
      deleteMutation.mutate(episode.id);
    }
  };

  // DataGrid columns configuration
  const columns: GridColDef[] = [
    {
      field: 'episode_number',
      headerName: 'Episode #',
      width: 100,
      type: 'number'
    },
    {
      field: 'episode_title',
      headerName: 'Title',
      width: 300,
      flex: 1
    },
    {
      field: 'duration',
      headerName: 'Duration (min)',
      width: 130,
      type: 'number'
    },
    {
      field: 'uri',
      headerName: 'Video Status',
      width: 150,
      renderCell: (params) => {
        const hasVideo = params.value && params.value !== 'pending-upload';
        return (
          <div className="flex justify-center">
            <span className={`badge font-medium shadow-md transition-all duration-200 ${
              hasVideo 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            }`}>
              {hasVideo ? '✅ Uploaded' : '⏳ Pending'}
            </span>
          </div>
        );
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditEpisode(params.row)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit Episode"
          >
            <HiPencil size={18} />
          </button>
          <button
            onClick={() => handleVideoUpload(params.row)}
            className="p-1 text-green-600 hover:text-green-800"
            title="Upload Video"
          >
            <HiVideoCamera size={18} />
          </button>
          <button
            onClick={() => handleDeleteEpisode(params.row)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete Episode"
          >
            <HiTrash size={18} />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading episodes. Please try again.</p>
      </div>
    );
  }

  const episodes = episodesData?.data?.episodes || [];
  const movieInfo = episodesData?.data?.movie || movieData || {};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <HiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🎬 Quản lý tập phim
            </h1>
          </div>
        </div>
        
        <button
          onClick={handleAddEpisode}
          className="btn btn-black elegant-black"
        >
          <HiPlus size={20} />
          Thêm tập mới
        </button>
      </div>

      {/* Movie Info Card */}
      {movieInfo && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center gap-4">
            {movieInfo.img && (
              <img 
                src={movieInfo.img} 
                alt={movieInfo.title}
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg">{movieInfo.title}</h3>
              <p className="text-gray-600">Total Episodes: {movieInfo.totalEpisodes || episodes.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Episodes DataTable */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          rows={episodes}
          loading={isLoading}
          checkboxSelection={false}
        />
      </div>

      {/* Episode Form Modal */}
      {isFormOpen && (
        <EpisodeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          movieId={movieId}
          episodeData={selectedEpisode}
          isEditMode={isEditMode}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['episodes', movieId] });
          }}
        />
      )}

      {/* Video Upload Modal */}
      {isVideoUploadOpen && selectedEpisode && (
        <EpisodeVideoUpload
          isOpen={isVideoUploadOpen}
          setIsOpen={setIsVideoUploadOpen}
          episode={selectedEpisode}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['episodes', movieId] });
          }}
        />
      )}
    </div>
  );
};

export default Episodes;
