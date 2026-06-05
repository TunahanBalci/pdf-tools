import React, { useState, useRef } from "react";
import DragDropList from "./components/DragDropList";
import MergePanel from "./components/MergePanel";
import MdToPdfPanel from "./components/MdToPdfPanel";
import { merge } from "./handle_pdf";

export default function App() {
  const [activeTab, setActiveTab] = useState("merge");
  const [list, setList] = useState([]);
  const [mergedFile, setMergedFile] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Calculate statistics
  const totalCount = list.length;
  const totalSize = list.reduce((acc, item) => acc + item.file.size, 0);

  // Format size for UI
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle file addition and validation
  const processFiles = (files) => {
    const validFiles = [];
    let invalidCount = 0;

    files.forEach((file) => {
      // Validate PDF format
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        validFiles.push({
          id: Math.random().toString(36).slice(2, 9),
          file: file,
          name: file.name,
          size: file.size,
        });
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      setWarning(`⚠️ Ignored ${invalidCount} non-PDF file(s). Only PDFs are allowed.`);
      setTimeout(() => setWarning(""), 5000);
    } else {
      setWarning("");
    }

    if (validFiles.length > 0) {
      setList((prev) => [...prev, ...validFiles]);
      setSuccess(false);
      setMergedFile(null);
    }
  };

  // Input change handler
  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  // Drag and Drop files onto window/dropzone
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  // Trigger file selection input click
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset
      fileInputRef.current.click();
    }
  };

  // Merge handler
  const handleMerge = async () => {
    if (list.length < 2) {
      setWarning("⚠️ Please add at least 2 PDF files to merge.");
      return;
    }

    try {
      setWarning("");
      setIsMerging(true);
      setSuccess(false);

      const orderedFiles = list.map((item) => item.file);
      const resultFile = await merge(orderedFiles);

      setMergedFile(resultFile);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setWarning("❌ An error occurred while merging your PDF files.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleClearAll = () => {
    setList([]);
    setMergedFile(null);
    setSuccess(false);
    setWarning("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "40px 20px 140px 20px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
      onDragOver={activeTab === "merge" ? handleDragOver : undefined}
      onDragLeave={activeTab === "merge" ? handleDragLeave : undefined}
      onDrop={activeTab === "merge" ? handleDrop : undefined}
    >
      {/* Hidden file input for Merger */}
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={handleFilesChange}
        multiple
        style={{ display: "none" }}
      />

      {/* App Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
        className="animate-fade-in"
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
            PDF Tools
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Start selecting files to start :)
          </p>
        </div>
        {activeTab === "merge" && list.length > 0 && (
          <button className="secondary-btn" onClick={triggerFileSelect}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Files
          </button>
        )}
      </header>

      {/* Navigation Tab Switcher */}
      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === "merge" ? "active" : ""}`}
          onClick={() => setActiveTab("merge")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M9 15h6M9 11h6M9 19h6"></path>
          </svg>
          Merge PDFs
        </button>
        <button
          className={`tab-btn ${activeTab === "md2pdf" ? "active" : ""}`}
          onClick={() => setActiveTab("md2pdf")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Markdown to PDF
        </button>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "merge" ? (
          /* PDF Merger Work Flow */
          <>
            {/* Warnings & Errors */}
            {warning && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  marginBottom: "24px",
                  fontSize: "15px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                className="animate-slide-up"
              >
                {warning}
              </div>
            )}

            {list.length === 0 ? (
              /* Empty state / drop zone */
              <div
                onClick={triggerFileSelect}
                className={`glass-panel animate-slide-up ${isDragOver ? "drag-over" : ""}`}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 40px",
                  border: "2px dashed var(--border-card)",
                  cursor: "pointer",
                  transition: "var(--transition-smooth)",
                  textAlign: "center",
                  minHeight: "350px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "24px",
                    background: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    marginBottom: "24px",
                    transition: "var(--transition-smooth)",
                    boxShadow: isDragOver ? "0 0 20px var(--color-primary-glow)" : "none",
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>
                  {isDragOver ? "Drop files here!" : "Select PDF files to merge"}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "340px" }}>
                  Drag and drop your PDF files here, or click to browse files from your computer.
                </p>
              </div>
            ) : (
              /* File List */
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <DragDropList list={list} setList={setList} formatBytes={formatBytes} />
              </div>
            )}

            {/* Floating Merge Controls */}
            {list.length > 0 && (
              <MergePanel
                totalCount={totalCount}
                totalSize={formatBytes(totalSize)}
                onMerge={handleMerge}
                onClearAll={handleClearAll}
                isMerging={isMerging}
                mergedFile={mergedFile}
                success={success}
              />
            )}
          </>
        ) : (
          /* Markdown to PDF Panel */
          <MdToPdfPanel />
        )}
      </main>
    </div>
  );
}
