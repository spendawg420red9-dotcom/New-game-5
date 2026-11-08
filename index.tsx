
import React from 'react';
import ReactDOM from 'react-dom/client';
import { installProceduralTextures } from './proceduralTextures';
import { initUserModels } from './userModels';
installProceduralTextures();
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
initUserModels().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
