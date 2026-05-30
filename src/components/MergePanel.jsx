import React, { useEffect, useState } from "react";

export default function MergePanel({
  totalCount,
  totalSize,
  onMerge,
  onClearAll,
  isMerging,
  mergedFile,
  success,
}) {
  const [downloadUrl, setDownloadUrl] = useState(null);

  // Manage URL.createObjectURL lifecycle
  useEffect(() => {
    if (mergedFile) {
      const url = URL.createObjectURL(mergedFile);
      setDownloadUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setDownloadUrl(null);
    }
  }, [mergedFile]);

  const handleDownload = () => {
    if (!downloadUrl || !mergedFile) return;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = mergedFile.name || "merged-document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
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
      }}
    >
      {/* File Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
          Selected Files
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            {totalCount}
          </span>
          <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "500" }}>
            ({totalSize})
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Clear All */}
        {!isMerging && !success && (
          <button
            onClick={onClearAll}
            className="secondary-btn"
            style={{
              padding: "12px 18px",
            }}
          >
            Clear All
          </button>
        )}

        {/* Merge Button / Download / Success State */}
        {success && mergedFile ? (
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
              Merged!
            </span>
            <button
              onClick={handleDownload}
              className="glow-btn"
              style={{
                background: "linear-gradient(135deg, var(--color-success), #059669)",
                boxShadow: "0 4px 15px var(--color-success-glow)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClearAll}
              className="secondary-btn"
              style={{
                padding: "12px",
                borderRadius: "12px",
              }}
              title="Start Over"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onMerge}
            disabled={totalCount < 2 || isMerging}
            className="glow-btn"
            style={{
              minWidth: "150px",
            }}
          >
            {isMerging ? (
              <>
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
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
                Merging...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <polyline points="12 8 12 12 16 14"></polyline>
                </svg>
                Merge PDFs
              </>
            )}
          </button>
        )}
      </div>

      {/* Quick Spinner Style */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
