import React, { useState, useRef } from "react";
import { parseMarkdown, convertHtmlToPdf } from "../handle_md";

export default function MdToPdfPanel() {
  const [list, setList] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentHtml, setCurrentHtml] = useState("");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [outputDir, setOutputDir] = useState("");

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  // Check if running in Electron
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  // Format bytes for UI
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Process files dropped or selected
  const processFiles = (files) => {
    const validFiles = [];
    let invalidCount = 0;

    files.forEach((file) => {
      if (file.name.toLowerCase().endsWith(".md")) {
        validFiles.push({
          id: Math.random().toString(36).slice(2, 9),
          file: file,
          name: file.name,
          size: file.size,
          status: "ready", // "ready" | "converting" | "done" | "error"
        });
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      setWarning(`⚠️ Ignored ${invalidCount} non-Markdown file(s). Only .md files are allowed.`);
      setTimeout(() => setWarning(""), 5000);
    } else {
      setWarning("");
    }

    if (validFiles.length > 0) {
      setList((prev) => [...prev, ...validFiles]);
      setSuccess(false);
    }
  };

  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  // Drag and Drop
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

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleDelete = (id) => {
    if (isConverting) return;
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (isConverting) return;
    setList([]);
    setSuccess(false);
    setWarning("");
    setCurrentHtml("");
    setCurrentIndex(-1);
  };

  // Select directory in Electron
  const handleSelectDir = async () => {
    if (!isElectron) return;
    try {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setOutputDir(path);
        setWarning("");
      }
    } catch (err) {
      console.error("Select directory error:", err);
      setWarning("❌ Failed to select directory.");
    }
  };

  // Read Markdown file as text
  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Convert Blob/File to Base64 string
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  };

  // Bulk converter loop
  const handleBulkConvert = async () => {
    if (list.length === 0) return;
    
    // In Electron, we mandate selecting a directory first
    if (isElectron && !outputDir) {
      setWarning("⚠️ Please select an output folder first.");
      return;
    }
    
    try {
      setIsConverting(true);
      setSuccess(false);
      setWarning("");

      // Loop through all files
      for (let i = 0; i < list.length; i++) {
        setCurrentIndex(i);
        
        // Update status to "converting"
        setList((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "converting" } : item))
        );

        const currentItem = list[i];
        
        try {
          // 1. Read Markdown content
          const text = await readFileText(currentItem.file);
          
          // 2. Compile Markdown to HTML
          const html = parseMarkdown(text);
          setCurrentHtml(html);

          // 3. Wait for React to render the HTML into the off-screen preview
          await new Promise((resolve) => setTimeout(resolve, 200));

          // 4. Convert DOM element to PDF
          const pdfName = currentItem.name.replace(/\.md$/i, "") + ".pdf";
          const pdfFile = await convertHtmlToPdf(previewRef.current, pdfName, {
            pageSize: "a4",
            marginPreset: "standard", // default A4 with standard margins
          });

          // 5. Output file
          if (isElectron) {
            // Read PDF blob as Base64 string to transfer over IPC
            const base64Data = await blobToBase64(pdfFile);
            const res = await window.electronAPI.saveFile(outputDir, pdfName, base64Data);
            if (!res.success) {
              throw new Error(res.error || "Failed to write file");
            }
          } else {
            // Standard browser download fallback
            const url = URL.createObjectURL(pdfFile);
            const link = document.createElement("a");
            link.href = url;
            link.download = pdfName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }

          // 6. Update status to "done"
          setList((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "done" } : item))
          );
        } catch (err) {
          console.error(`Error converting ${currentItem.name}:`, err);
          setList((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "error" } : item))
          );
        }
      }

      setSuccess(true);
      setCurrentIndex(-1);
    } catch (err) {
      console.error(err);
      setWarning("❌ An error occurred during bulk conversion.");
    } finally {
      setIsConverting(false);
    }
  };

  const totalCount = list.length;
  const convertedCount = list.filter((item) => item.status === "done").length;

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".md"
        ref={fileInputRef}
        onChange={handleFilesChange}
        multiple
        style={{ display: "none" }}
      />

      {/* Warnings & Errors */}
      {warning && (
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#fca5a5",
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

      {/* Output Folder Selector (Electron-only) */}
      {isElectron && list.length > 0 && (
        <div
          className="glass-panel animate-slide-up"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Destination Folder
            </span>
            <span
              style={{
                fontSize: "14px",
                color: outputDir ? "var(--text-primary)" : "#ef4444",
                fontWeight: "500",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {outputDir || "⚠️ No output folder selected."}
            </span>
          </div>
          <button
            className="secondary-btn"
            onClick={handleSelectDir}
            disabled={isConverting}
            style={{ padding: "10px 16px", fontSize: "13px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Choose Folder
          </button>
        </div>
      )}

      {list.length === 0 ? (
        /* Empty State / Dropzone */
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
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>
            {isDragOver ? "Drop Markdown files here!" : "Select Markdown files to convert"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "340px" }}>
            Drag and drop multiple .md files here, or click to browse files from your computer.
          </p>
        </div>
      ) : (
        /* File Queue List */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 8px 4px 8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Conversion Queue ({list.length} files)
            </span>
            {!isConverting && (
              <button className="secondary-btn" onClick={triggerFileSelect} style={{ padding: "8px 14px", fontSize: "13px" }}>
                Add More Files
              </button>
            )}
          </div>
          {list.map((item, idx) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 20px",
                border: item.status === "converting" 
                  ? "1px solid var(--color-primary)" 
                  : "1px solid var(--border-card)",
                background: item.status === "converting"
                  ? "rgba(99, 102, 241, 0.05)"
                  : "var(--bg-card)",
                transition: "var(--transition-smooth)",
              }}
            >
              {/* Document Icon */}
              <div
                style={{
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  color: "var(--color-primary)",
                  borderRadius: "10px",
                  width: "42px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "16px",
                  flexShrink: 0,
                  fontWeight: "bold",
                  fontSize: "12px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                MD
              </div>

              {/* File Info */}
              <div style={{ flex: 1, minWidth: 0, marginRight: "16px" }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "15px",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    marginTop: "2px",
                  }}
                >
                  {formatBytes(item.size)}
                </div>
              </div>

              {/* Status Display */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {item.status === "converting" && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-primary)",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      style={{ animation: "spin 1s linear infinite" }}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Converting...
                  </span>
                )}
                {item.status === "done" && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-success)",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Converted
                  </span>
                )}
                {item.status === "error" && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-error)",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Failed
                  </span>
                )}

                {/* Delete Button */}
                {!isConverting && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#fca5a5",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "var(--transition-smooth)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                      e.currentTarget.style.color = "#fca5a5";
                    }}
                    title="Remove file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Convert Controls */}
      {list.length > 0 && (
        <div
          className="glass-panel animate-slide-up"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 40px)",
            maxWidth: "860px",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "16px",
          }}
        >
          {/* Statistics */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
              Markdown Files
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
                {totalCount}
              </span>
              {isConverting && (
                <span style={{ fontSize: "13px", color: "var(--color-primary)", fontWeight: "600" }}>
                  (Converting {currentIndex + 1} of {totalCount})
                </span>
              )}
              {success && (
                <span style={{ fontSize: "13px", color: "var(--color-success)", fontWeight: "600" }}>
                  (Converted {convertedCount} of {totalCount} successfully)
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!isConverting && (
              <button onClick={handleClearAll} className="secondary-btn">
                Clear All
              </button>
            )}

            {success ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--color-success)",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  className="animate-fade-in"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  All Converted!
                </span>
                <button
                  onClick={handleClearAll}
                  className="glow-btn"
                  style={{
                    background: "linear-gradient(135deg, var(--color-success), #059669)",
                    boxShadow: "0 4px 15px var(--color-success-glow)",
                    padding: "12px 18px",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={handleBulkConvert}
                disabled={list.length === 0 || isConverting}
                className="glow-btn"
                style={{ minWidth: "160px" }}
              >
                {isConverting ? (
                  <>
                    <svg
                      style={{ animation: "spin 1s linear infinite" }}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Converting...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Convert to PDFs
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Off-screen Document Renderer Container */}
      <div
        id="bulk-render-parent"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "794px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={previewRef}
          className="paper-page"
          style={{
            padding: "16px",
            background: "#ffffff",
            color: "#1a202c",
            width: "794px",
            minHeight: "1123px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: currentHtml }}
          />
        </div>
      </div>
    </div>
  );
}
