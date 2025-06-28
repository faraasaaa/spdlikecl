import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Download, Check, Loader } from 'lucide-react-native';
import { downloadService } from '../services/downloadService';

interface DownloadButtonProps {
  trackId: string;
  size?: number;
  color?: string;
  onDownloadStart?: () => void;
  onDownloadComplete?: (success: boolean, message: string) => void;
}

export function DownloadButton({ 
  trackId, 
  size = 20, 
  color = '#1DB954',
  onDownloadStart,
  onDownloadComplete
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(downloadService.isDownloaded(trackId));

  useEffect(() => {
    // Listen for download state changes
    const handleDownloadChange = () => {
      setIsDownloaded(downloadService.isDownloaded(trackId));
      setIsDownloading(downloadService.isDownloading(trackId));
    };

    downloadService.addListener(handleDownloadChange);
    
    // Initial check
    setIsDownloaded(downloadService.isDownloaded(trackId));
    setIsDownloading(downloadService.isDownloading(trackId));

    return () => {
      downloadService.removeListener(handleDownloadChange);
    };
  }, [trackId]);

  const handleDownload = async () => {
    if (isDownloaded || isDownloading) return;

    setIsDownloading(true);
    onDownloadStart?.();
    
    try {
      const result = await downloadService.downloadSong(trackId);
      
      if (result.success) {
        setIsDownloaded(true);
      }
      
      onDownloadComplete?.(result.success, result.message);
    } catch (error) {
      onDownloadComplete?.(false, 'Failed to download song');
    } finally {
      setIsDownloading(false);
    }
  };

  const getIcon = () => {
    if (isDownloading) {
      return <Loader size={size} color={color} />;
    }
    if (isDownloaded) {
      return <Check size={size} color={color} />;
    }
    return <Download size={size} color={color} />;
  };

  return (
    <TouchableOpacity
      style={[styles.button, isDownloaded && styles.downloadedButton]}
      onPress={handleDownload}
      disabled={isDownloading || isDownloaded}
      activeOpacity={0.7}
    >
      {getIcon()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  downloadedButton: {
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
    borderColor: '#1DB954',
  },
});