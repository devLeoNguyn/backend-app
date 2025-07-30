import React from 'react';
import { HiOutlineClipboard, HiOutlineEye } from 'react-icons/hi2';

interface VideoUriDisplayProps {
  uri: string;
  episodeTitle: string;
}

const VideoUriDisplay: React.FC<VideoUriDisplayProps> = ({ uri, episodeTitle }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      // Có thể thêm toast notification ở đây
      console.log('URI copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URI:', error);
    }
  };

  const openInNewTab = () => {
    window.open(uri, '_blank');
  };

  // Kiểm tra xem URI có đúng format không
  const isValidCloudflareUri = uri && uri.includes('customer-xir3z8gmfm10bn16.cloudflarestream.com');

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-base-content">
          Video URI - {episodeTitle}
        </h4>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="btn btn-ghost btn-sm"
            title="Copy URI"
          >
            <HiOutlineClipboard className="w-4 h-4" />
          </button>
          <button
            onClick={openInNewTab}
            className="btn btn-ghost btn-sm"
            title="Open in new tab"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-base-content opacity-70">
          Status: {isValidCloudflareUri ? (
            <span className="text-success">✅ Valid Cloudflare Stream URI</span>
          ) : (
            <span className="text-warning">⚠️ Invalid or missing URI</span>
          )}
        </div>
        
        {uri ? (
          <div className="bg-base-300 p-3 rounded text-sm font-mono break-all">
            {uri}
          </div>
        ) : (
          <div className="bg-base-300 p-3 rounded text-sm text-base-content opacity-50">
            No video URI available
          </div>
        )}
        
        {isValidCloudflareUri && (
          <div className="text-xs text-base-content opacity-70">
            Format: https://customer-xir3z8gmfm10bn16.cloudflarestream.com/[STREAM_UID]/manifest/video.m3u8
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUriDisplay; 