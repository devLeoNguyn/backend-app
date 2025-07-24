import { useState } from 'react';
import { HiOutlineXMark, HiCloudArrowUp } from 'react-icons/hi2';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { updateEpisode, Episode } from '../../api/ApiCollection';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface EpisodeVideoUploadProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  episode: Episode;
  onSuccess: () => void;
}

const EpisodeVideoUpload = ({ 
  isOpen, 
  setIsOpen, 
  episode,
  onSuccess 
}: EpisodeVideoUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Update episode mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { uri: string } }) => 
      updateEpisode(id, data),
    onSuccess: () => {
      toast.success('Video uploaded successfully');
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update episode');
    }
  });

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File size must be less than 500MB');
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Upload video to Cloudflare Stream
  const uploadVideo = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for video upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('episodeId', episode.id);
      formData.append('episodeTitle', episode.episode_title);

      // Upload to Cloudflare Stream via our backend
      const response = await axios.post(`${API_BASE_URL}/api/upload/video`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });

      if (response.data.status === 'success') {
        const videoUrl = response.data.data.streamUid || response.data.data.playbackUrl;
        
        // Update episode with video URL
        updateMutation.mutate({
          id: episode.id,
          data: { uri: videoUrl }
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: unknown) {
      console.error('Video upload error:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        toast.error(`Upload failed: ${errorMessage}`);
      } else {
        toast.error('Upload failed: Unknown error');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Upload Video
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Episode {episode.episode_number}: {episode.episode_title}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUploading}
          >
            <HiOutlineXMark size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Status */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Current Status:</p>
            <span className={`px-2 py-1 rounded text-sm ${
              episode.uri && episode.uri !== 'pending-upload'
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {episode.uri && episode.uri !== 'pending-upload' ? 'Video Uploaded' : 'Pending Upload'}
            </span>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <HiCloudArrowUp size={48} className="mx-auto text-gray-400 mb-4" />
            
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={isUploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg text-gray-700">
                  Drag and drop your video file here
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-400">
                  Supported formats: MP4, MOV, AVI, MKV (Max: 500MB)
                </p>
              </div>
            )}

            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="video-upload"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-700 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Upload Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Upload Information:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Videos will be processed and optimized for streaming</li>
              <li>• Processing may take a few minutes after upload</li>
              <li>• Supported formats: MP4, MOV, AVI, MKV</li>
              <li>• Maximum file size: 500MB</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadVideo}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </div>
              ) : (
                'Upload Video'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeVideoUpload;
