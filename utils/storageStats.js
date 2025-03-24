export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const calculateStorageStats = (files = []) => {
  if (!Array.isArray(files)) {
    console.warn('Invalid files array provided to calculateStorageStats');
    files = [];
  }

  const totalFiles = files.length;
  const usedStorage = files.reduce((total, file) => total + (file.Size || 0), 0);
  const allocatedStorage = 10 * 1024 * 1024 * 1024; // 10GB allocation

  return {
    totalFiles,
    usedStorage: formatBytes(usedStorage),
    allocatedStorage: formatBytes(allocatedStorage),
    usagePercentage: ((usedStorage / allocatedStorage) * 100).toFixed(1)
  };
};
