import React from 'react';

const FileUpload = ({ onFileLoaded, recordCount }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        onFileLoaded(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Загрузка данных
      </h2>
      <div className="flex items-center space-x-4">
        <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Выбрать файл
          <input 
            type="file" 
            accept=".txt,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        {recordCount > 0 && (
          <span className="text-sm text-gray-600">
            Загружено записей: <span className="font-semibold">{recordCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
