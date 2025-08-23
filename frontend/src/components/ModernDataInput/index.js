// Main export for ModernDataInput component
export { default } from './ModernDataInput';

// Export subcomponents for direct access if needed
export { default as ManualDataEntry } from './ManualDataEntry';
export { default as FileUpload } from './FileUpload';
export { default as DataPreview } from './DataPreview';

// Export hooks
export * from './hooks/useFileReader';
export * from './hooks/useDataValidation';
export * from './hooks/useApiUpload';

// Export utilities
export * from './utils';