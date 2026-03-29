import React from 'react';
import Editor from './components/Editor';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CollabDocs</h1>
        <p>A simple, real-time cooperative rich-text workspace.</p>
      </header>
      
      <main className="main-content">
        <Editor />
      </main>
    </div>
  );
}

export default App;
