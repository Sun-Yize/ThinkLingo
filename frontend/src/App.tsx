import React from 'react';
import { ThemeProvider } from './utils/theme';
import TranslationChat from './components/TranslationChat';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <TranslationChat />
      </div>
    </ThemeProvider>
  );
}

export default App;
