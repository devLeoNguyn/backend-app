import { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createEpisode, updateEpisode, Episode } from '../../api/ApiCollection';

interface EpisodeFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  movieId: string;
  episodeData?: Episode | null;
  isEditMode: boolean;
  onSuccess: () => void;
}

const EpisodeForm = ({ 
  isOpen, 
  setIsOpen, 
  movieId, 
  episodeData, 
  isEditMode,
  onSuccess 
}: EpisodeFormProps) => {
  const [formData, setFormData] = useState({
    episode_title: '',
    episode_number: 1,
    episode_description: '',
    duration: 120
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when editing
  useEffect(() => {
    if (isEditMode && episodeData) {
      setFormData({
        episode_title: episodeData.episode_title,
        episode_number: episodeData.episode_number,
        episode_description: episodeData.episode_description,
        duration: episodeData.duration
      });
    } else {
      // Reset form for new episode
      setFormData({
        episode_title: '',
        episode_number: 1,
        episode_description: '',
        duration: 120
      });
    }
    setErrors({});
  }, [isEditMode, episodeData, isOpen]);

  // Create episode mutation
  const createMutation = useMutation({
    mutationFn: createEpisode,
    onSuccess: () => {
      toast.success('Episode created successfully');
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create episode');
    }
  });

  // Update episode mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      updateEpisode(id, data),
    onSuccess: () => {
      toast.success('Episode updated successfully');
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update episode');
    }
  });

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.episode_title.trim()) {
      newErrors.episode_title = 'Episode title is required';
    }

    if (!formData.episode_number || formData.episode_number < 1) {
      newErrors.episode_number = 'Episode number must be greater than 0';
    }

    if (!formData.duration || formData.duration < 1) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode && episodeData) {
      updateMutation.mutate({
        id: episodeData.id,
        data: formData
      });
    } else {
      createMutation.mutate({
        ...formData,
        movie_id: movieId
      });
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'episode_number' || name === 'duration' 
        ? parseInt(value) || 0 
        : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Episode' : 'Add New Episode'}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Episode Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Episode Title *
            </label>
            <input
              type="text"
              name="episode_title"
              value={formData.episode_title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.episode_title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter episode title"
              disabled={isLoading}
            />
            {errors.episode_title && (
              <p className="text-red-500 text-sm mt-1">{errors.episode_title}</p>
            )}
          </div>

          {/* Episode Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Episode Number *
            </label>
            <input
              type="number"
              name="episode_number"
              value={formData.episode_number}
              onChange={handleInputChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.episode_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter episode number"
              disabled={isLoading}
            />
            {errors.episode_number && (
              <p className="text-red-500 text-sm mt-1">{errors.episode_number}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.duration ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter duration in minutes"
              disabled={isLoading}
            />
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
            )}
          </div>

          {/* Episode Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Episode Description
            </label>
            <textarea
              name="episode_description"
              value={formData.episode_description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter episode description (optional)"
              disabled={isLoading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditMode ? 'Update Episode' : 'Create Episode'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EpisodeForm;
