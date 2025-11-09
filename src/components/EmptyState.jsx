import React from 'react';

const EmptyState = () => {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Загрузите файл с данными
      </h3>
      <p className="text-gray-500">
        Выберите TSV/TXT файл с данными активности Revit Server
      </p>
    </div>
  );
};

export default EmptyState;
