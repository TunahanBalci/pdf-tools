import React, { useRef, useState } from "react";

export default function DragDropList({ list, setList, formatBytes }) {
  const draggedItemIndex = useRef(null);
  const [draggedIndexState, setDraggedIndexState] = useState(null);

  // Drag handles
  const handleDragStart = (e, index) => {
    draggedItemIndex.current = index;
    setDraggedIndexState(index);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragEnter = (index) => {
    if (draggedItemIndex.current === null) return;
    if (draggedItemIndex.current === index) return;

    // Swap elements in place
    const newList = [...list];
    const itemToMove = newList[draggedItemIndex.current];
    newList.splice(draggedItemIndex.current, 1);
    newList.splice(index, 0, itemToMove);

    draggedItemIndex.current = index;
    setDraggedIndexState(index);
    setList(newList);
  };

  const handleDragEnd = () => {
    draggedItemIndex.current = null;
    setDraggedIndexState(null);
  };

  // Button-based reordering for accessibility & precision
  const moveUp = (index) => {
    if (index === 0) return;
    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setList(newList);
  };

  const moveDown = (index) => {
    if (index === list.length - 1) return;
    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setList(newList);
  };

  const handleDelete = (id) => {
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {list.map((item, index) => {
        const isDragging = draggedIndexState === index;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={handleDragEnd}
            className="glass-panel"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 20px",
              opacity: isDragging ? 0.4 : 1,
              transform: isDragging ? "scale(0.98)" : "none",
              border: isDragging 
                ? "1px dashed var(--color-primary)" 
                : "1px solid var(--border-card)",
              boxShadow: isDragging ? "none" : "0 4px 12px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease",
              cursor: "grab",
            }}
            onMouseDown={(e) => {
              if (e.target.closest("button") || e.target.closest("svg:not(.drag-icon)")) {
                e.preventDefault();
              }
            }}
          >
            {/* Drag Handle Icon */}
            <div
              className="disable-select drag-icon"
              style={{
                color: "var(--text-muted)",
                marginRight: "16px",
                display: "flex",
                alignItems: "center",
                cursor: "grab",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="9" x2="16" y2="9"></line>
                <line x1="8" y1="13" x2="16" y2="13"></line>
                <line x1="8" y1="17" x2="16" y2="17"></line>
              </svg>
            </div>

            {/* Document PDF Icon */}
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "var(--color-error)",
                borderRadius: "10px",
                width: "42px",
                height: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "16px",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
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

            {/* Actions (Reorder and Delete) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Move Up */}
              <button
                className="secondary-btn"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  opacity: index === 0 ? 0.3 : 1,
                  cursor: index === 0 ? "not-allowed" : "pointer",
                }}
                title="Move Up"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>

              {/* Move Down */}
              <button
                className="secondary-btn"
                onClick={() => moveDown(index)}
                disabled={index === list.length - 1}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  opacity: index === list.length - 1 ? 0.3 : 1,
                  cursor: index === list.length - 1 ? "not-allowed" : "pointer",
                }}
                title="Move Down"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Spacer */}
              <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

              {/* Delete */}
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
                title="Remove File"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
