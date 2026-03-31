import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "../components/Editor";
import "./EditorPage.css";

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [navigate]);

  if (!id) {
    return <div>Invalid Document ID</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm rounded-t-xl mb-4">
        <div className="flex items-center gap-4">
          <button 
            className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium" 
            onClick={() => navigate("/")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <span className="font-semibold text-gray-800 font-mono text-sm bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
            {id}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-600">Connected</span>
        </div>
      </div>
      
      <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full flex flex-col">
        <Editor docId={id} />
      </main>
    </div>
  );
};

export default EditorPage;
