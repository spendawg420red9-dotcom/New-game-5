
import React from 'react';
import ReactDOM from 'react-dom/client';
import { installProceduralTextures } from './proceduralTextures';
import { initUserModels } from './userModels';
import { initUserVideos } from './userVideos';
installProceduralTextures();
import App from './App';
import { ErrorGuard } from './components/ErrorGuard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
Promise.all([initUserModels(), initUserVideos()]).finally(() => {
  root.render(
    <React.StrictMode>
      <ErrorGuard retries={1} label="app"><App /></ErrorGuard>
    </React.StrictMode>
  );
});
