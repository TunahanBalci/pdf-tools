// handle_md.js
import { marked } from "marked";
import { jsPDF } from "jspdf";

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Parses Markdown text to HTML.
 * @param {string} mdText 
 * @returns {string}
 */
export function parseMarkdown(mdText) {
  if (!mdText) return "";
  return marked.parse(mdText);
}

const PT_TO_MM = 0.352778;

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function getDirectChildren(element, tagName) {
  return Array.from(element.children).filter(
    (child) => child.tagName.toLowerCase() === tagName
  );
}

/**
 * Converts a DOM element to a PDF File object.
 * @param {HTMLElement} element The HTML element to capture.
 * @param {string} filename The output file name.
 * @param {object} options Layout options (pageSize, marginPreset).
 * @returns {Promise<File>}
 */
export async function convertHtmlToPdf(element, filename, options = {}) {
  const {
    pageSize = "a4",
    marginPreset = "standard", // "none", "compact", "standard", "wide"
  } = options;

  // Map margin presets to millimeters (mm): [top, right, bottom, left]
  const marginPresets = {
    none: [0, 0, 0, 0],
    compact: [8, 5, 8, 5],
    standard: [12, 8, 12, 8],
    wide: [18, 15, 18, 15],
  };
  const preset = marginPresets[marginPreset] || marginPresets.standard;
  const [marginTop, marginRight, marginBottom, marginLeft] = preset;

  // A4 dimensions in mm: 210 x 297
  // Letter dimensions in mm: 215.9 x 279.4
  const isA4 = pageSize.toLowerCase() === "a4";
  const pageWidth = isA4 ? 210 : 215.9;
  const pageHeight = isA4 ? 297 : 279.4;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: pageSize,
  });

  const contentWidth = pageWidth - marginLeft - marginRight;
  const contentBottom = pageHeight - marginBottom;
  const markdownBody = element?.querySelector(".markdown-body") || element;
  let cursorY = marginTop;

  const setTextStyle = ({ size = 11, style = "normal", family = "helvetica" } = {}) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
    doc.setTextColor(51, 65, 85);
  };

  const lineHeight = (fontSize, factor = 1.35) => fontSize * PT_TO_MM * factor;

  const ensureSpace = (height) => {
    if (cursorY + height <= contentBottom) return;
    doc.addPage();
    cursorY = marginTop;
  };

  const splitLongToken = (token, maxWidth) => {
    const parts = [];
    let part = "";

    for (const char of token) {
      const candidate = part + char;
      if (part && doc.getTextWidth(candidate) > maxWidth) {
        parts.push(part);
        part = char;
      } else {
        part = candidate;
      }
    }

    if (part) parts.push(part);
    return parts;
  };

  const wrapText = (text, maxWidth) => {
    const paragraphs = String(text || "").split(/\r?\n/);
    const lines = [];

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const normalized = paragraph.replace(/\s+/g, " ").trim();
      if (!normalized) {
        if (paragraphIndex > 0) lines.push("");
        return;
      }

      let line = "";
      normalized.split(" ").forEach((word) => {
        const wordParts = doc.getTextWidth(word) > maxWidth
          ? splitLongToken(word, maxWidth)
          : [word];

        wordParts.forEach((part) => {
          const candidate = line ? `${line} ${part}` : part;
          if (line && doc.getTextWidth(candidate) > maxWidth) {
            lines.push(line);
            line = part;
          } else {
            line = candidate;
          }
        });
      });

      if (line) lines.push(line);
    });

    return lines.length ? lines : [""];
  };

  const fontStyleFromFlags = ({ bold = false, italic = false } = {}) => {
    if (bold && italic) return "bolditalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  };

  const applyRunStyle = (run) => {
    const family = run.family || "helvetica";
    const style = run.style || fontStyleFromFlags(run);
    doc.setFont(family, style);
    doc.setFontSize(run.size || 11);
    doc.setTextColor(...(run.color || [51, 65, 85]));
  };

  const measureRun = (run) => {
    applyRunStyle(run);
    return doc.getTextWidth(run.text);
  };

  const flattenInlineRuns = (node, inheritedStyle) => {
    if (!node) return [];

    if (node.nodeType === 3) {
      return [{ ...inheritedStyle, text: node.nodeValue || "" }];
    }

    if (node.nodeType !== 1) return [];

    const tagName = node.tagName.toLowerCase();
    if (tagName === "br") {
      return [{ ...inheritedStyle, text: "\n" }];
    }

    const nextStyle = { ...inheritedStyle };

    if (tagName === "strong" || tagName === "b") {
      nextStyle.bold = true;
    }

    if (tagName === "em" || tagName === "i") {
      nextStyle.italic = true;
    }

    if (tagName === "code") {
      nextStyle.family = "courier";
      nextStyle.size = inheritedStyle.size * 0.9;
      nextStyle.code = true;
      nextStyle.color = [15, 23, 42];
    }

    if (tagName === "mark") {
      nextStyle.highlight = true;
    }

    if (tagName === "a") {
      nextStyle.color = [37, 99, 235];
    }

    return Array.from(node.childNodes).flatMap((childNode) =>
      flattenInlineRuns(childNode, nextStyle)
    );
  };

  const tokenizeRuns = (runs) => {
    const tokens = [];

    runs.forEach((run) => {
      String(run.text || "")
        .split(/(\n|\s+)/)
        .forEach((part) => {
          if (!part) return;
          if (part === "\n") {
            tokens.push({ ...run, text: "\n", isBreak: true });
          } else if (/^\s+$/.test(part)) {
            tokens.push({ ...run, text: " ", isSpace: true });
          } else {
            tokens.push({ ...run, text: part });
          }
        });
    });

    return tokens;
  };

  const splitRunToFit = (run, maxWidth) => {
    const parts = [];
    let part = "";

    for (const char of run.text) {
      const candidate = part + char;
      if (part && measureRun({ ...run, text: candidate }) > maxWidth) {
        parts.push({ ...run, text: part });
        part = char;
      } else {
        part = candidate;
      }
    }

    if (part) parts.push({ ...run, text: part });
    return parts;
  };

  const wrapRuns = (runs, maxWidth) => {
    const tokens = tokenizeRuns(runs);
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    const pushLine = () => {
      while (currentLine.length && currentLine[currentLine.length - 1].isSpace) {
        currentWidth -= measureRun(currentLine[currentLine.length - 1]);
        currentLine.pop();
      }
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    };

    tokens.forEach((token) => {
      if (token.isBreak) {
        pushLine();
        return;
      }

      if (token.isSpace && currentLine.length === 0) return;

      const tokenWidth = measureRun(token);
      if (!token.isSpace && tokenWidth > maxWidth) {
        splitRunToFit(token, maxWidth).forEach((part) => {
          const partWidth = measureRun(part);
          if (currentLine.length && currentWidth + partWidth > maxWidth) {
            pushLine();
          }
          currentLine.push(part);
          currentWidth += partWidth;
        });
        return;
      }

      if (currentLine.length && currentWidth + tokenWidth > maxWidth) {
        pushLine();
      }

      if (token.isSpace && currentLine.length === 0) return;
      currentLine.push(token);
      currentWidth += tokenWidth;
    });

    if (currentLine.length || lines.length === 0) {
      pushLine();
    }

    return lines;
  };

  const drawInlineElement = (inlineElement, {
    x = marginLeft,
    width = contentWidth,
    size = 11,
    before = 0,
    after = 3,
    color = [51, 65, 85],
    lineFactor = 1.35,
    bold = false,
    italic = false,
  } = {}) => {
    const baseStyle = {
      size,
      bold,
      italic,
      family: "helvetica",
      color,
    };
    const lines = wrapRuns(flattenInlineRuns(inlineElement, baseStyle), width);
    const height = lineHeight(size, lineFactor);

    cursorY += before;

    lines.forEach((line) => {
      ensureSpace(height);
      let cursorX = x;

      line.forEach((run) => {
        if (!run.text) return;
        const runWidth = measureRun(run);

        if (run.code || run.highlight) {
          doc.setFillColor(...(run.code ? [241, 245, 249] : [254, 240, 138]));
          doc.rect(cursorX - 0.6, cursorY - 0.3, runWidth + 1.2, height, "F");
        }

        applyRunStyle(run);
        doc.text(run.text, cursorX, cursorY, { baseline: "top" });
        cursorX += runWidth;
      });

      cursorY += height;
    });

    cursorY += after;
  };

  const drawWrappedText = (text, {
    x = marginLeft,
    width = contentWidth,
    size = 11,
    style = "normal",
    family = "helvetica",
    before = 0,
    after = 3,
    color = [51, 65, 85],
    lineFactor = 1.35,
  } = {}) => {
    setTextStyle({ size, style, family });
    doc.setTextColor(...color);
    cursorY += before;

    const lines = wrapText(text, width);
    const height = lineHeight(size, lineFactor);

    lines.forEach((line) => {
      ensureSpace(height);
      if (line) {
        doc.text(line, x, cursorY, { baseline: "top" });
      }
      cursorY += height;
    });

    cursorY += after;
  };

  const drawList = (listElement, ordered = false) => {
    const items = getDirectChildren(listElement, "li");
    items.forEach((item, index) => {
      setTextStyle({ size: 11 });
      const marker = ordered ? `${index + 1}. ` : "- ";
      const markerWidth = doc.getTextWidth(marker);
      const lines = wrapRuns(
        flattenInlineRuns(item, {
          size: 11,
          family: "helvetica",
          color: [51, 65, 85],
        }),
        contentWidth - 8 - markerWidth
      );
      const height = lineHeight(11);

      lines.forEach((line, lineIndex) => {
        ensureSpace(height);
        if (lineIndex === 0) {
          doc.text(marker, marginLeft + 4, cursorY, { baseline: "top" });
        }
        let cursorX = marginLeft + 4 + markerWidth;
        line.forEach((run) => {
          const runWidth = measureRun(run);
          if (run.code || run.highlight) {
            doc.setFillColor(...(run.code ? [241, 245, 249] : [254, 240, 138]));
            doc.rect(cursorX - 0.6, cursorY - 0.3, runWidth + 1.2, height, "F");
          }
          applyRunStyle(run);
          doc.text(run.text, cursorX, cursorY, { baseline: "top" });
          cursorX += runWidth;
        });
        cursorY += height;
      });

      cursorY += 1.5;
    });

    cursorY += 2;
  };

  const drawTable = (tableElement) => {
    const rows = Array.from(tableElement.querySelectorAll("tr"));
    if (!rows.length) return;

    const columnCount = Math.max(
      ...rows.map((row) => Array.from(row.children).length),
      1
    );
    const cellPadding = 2;
    const cellWidth = contentWidth / columnCount;
    const fontSize = 9;
    const rowLineHeight = lineHeight(fontSize, 1.25);

    rows.forEach((row) => {
      const cells = Array.from(row.children);
      const isHeader = cells.some((cell) => cell.tagName.toLowerCase() === "th");
      setTextStyle({ size: fontSize, style: isHeader ? "bold" : "normal" });

      const wrappedCells = Array.from({ length: columnCount }, (_, cellIndex) => {
        const text = normalizeText(cells[cellIndex]?.textContent || "");
        return wrapText(text, cellWidth - cellPadding * 2);
      });
      const rowHeight = Math.max(...wrappedCells.map((lines) => lines.length)) * rowLineHeight + cellPadding * 2;

      ensureSpace(rowHeight);
      wrappedCells.forEach((lines, cellIndex) => {
        const cellX = marginLeft + cellIndex * cellWidth;
        doc.setDrawColor(226, 232, 240);
        doc.rect(cellX, cursorY, cellWidth, rowHeight);
        if (isHeader) {
          doc.setFillColor(241, 245, 249);
          doc.rect(cellX, cursorY, cellWidth, rowHeight, "F");
          doc.setDrawColor(226, 232, 240);
          doc.rect(cellX, cursorY, cellWidth, rowHeight);
        }
        lines.forEach((line, lineIndex) => {
          doc.text(line, cellX + cellPadding, cursorY + cellPadding + lineIndex * rowLineHeight, {
            baseline: "top",
          });
        });
      });

      cursorY += rowHeight;
    });

    cursorY += 4;
  };

  const wrapCodeLine = (line, maxWidth) => {
    setTextStyle({ size: 9.5, family: "courier" });
    const wrapped = [];
    let current = "";

    for (const char of line || " ") {
      const candidate = current + char;
      if (current && doc.getTextWidth(candidate) > maxWidth) {
        wrapped.push(current);
        current = char;
      } else {
        current = candidate;
      }
    }

    wrapped.push(current || " ");
    return wrapped;
  };

  const drawCodeBlock = (codeText) => {
    const fontSize = 9.5;
    const blockPaddingX = 4;
    const blockPaddingY = 3;
    const codeLineHeight = lineHeight(fontSize, 1.3);
    const codeX = marginLeft + blockPaddingX;
    const codeWidth = contentWidth - blockPaddingX * 2;
    const rawLines = codeText
      .replace(/\t/g, "    ")
      .replace(/\r\n/g, "\n")
      .replace(/\s+$/g, "")
      .split("\n");
    const lines = rawLines.flatMap((line) => wrapCodeLine(line, codeWidth));
    let segmentStartY = null;

    const startSegment = () => {
      segmentStartY = cursorY;
      doc.setFillColor(248, 250, 252);
      doc.rect(marginLeft, cursorY, contentWidth, blockPaddingY, "F");
      cursorY += blockPaddingY;
    };

    const finishSegment = () => {
      if (segmentStartY === null) return;
      const segmentHeight = cursorY - segmentStartY + blockPaddingY;
      doc.setFillColor(248, 250, 252);
      doc.rect(marginLeft, cursorY, contentWidth, blockPaddingY, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginLeft, segmentStartY, contentWidth, segmentHeight, 1.5, 1.5, "S");
      segmentStartY = null;
      cursorY += blockPaddingY;
    };

    cursorY += 2;
    startSegment();

    lines.forEach((line) => {
      if (cursorY + codeLineHeight + blockPaddingY > contentBottom) {
        finishSegment();
        doc.addPage();
        cursorY = marginTop;
        startSegment();
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(marginLeft, cursorY, contentWidth, codeLineHeight, "F");
      applyRunStyle({
        text: line,
        family: "courier",
        size: fontSize,
        color: [15, 23, 42],
      });
      doc.text(line, codeX, cursorY, { baseline: "top" });
      cursorY += codeLineHeight;
    });

    finishSegment();
    cursorY += 3;
  };

  const drawElement = (child) => {
    const tagName = child.tagName.toLowerCase();

    if (tagName === "h1") {
      drawInlineElement(child, {
        size: 18,
        bold: true,
        before: cursorY === marginTop ? 0 : 4,
        after: 5,
        color: [15, 23, 42],
        lineFactor: 1.2,
      });
      doc.setDrawColor(226, 232, 240);
      doc.line(marginLeft, cursorY - 2, marginLeft + contentWidth, cursorY - 2);
      return;
    }

    if (tagName === "h2") {
      drawInlineElement(child, {
        size: 15,
        bold: true,
        before: 4,
        after: 4,
        color: [15, 23, 42],
        lineFactor: 1.2,
      });
      return;
    }

    if (tagName === "h3" || tagName === "h4") {
      drawInlineElement(child, {
        size: 13,
        bold: true,
        before: 3,
        after: 3,
        color: [15, 23, 42],
        lineFactor: 1.2,
      });
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      drawList(child, tagName === "ol");
      return;
    }

    if (tagName === "pre") {
      drawCodeBlock(child.textContent);
      return;
    }

    if (tagName === "blockquote") {
      const startY = cursorY;
      drawInlineElement(child, {
        x: marginLeft + 5,
        width: contentWidth - 5,
        before: 2,
        after: 4,
        color: [100, 116, 139],
      });
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1);
      doc.line(marginLeft, startY, marginLeft, cursorY - 3);
      doc.setLineWidth(0.2);
      return;
    }

    if (tagName === "table") {
      drawTable(child);
      return;
    }

    if (tagName === "hr") {
      ensureSpace(6);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginLeft, cursorY + 2, marginLeft + contentWidth, cursorY + 2);
      cursorY += 8;
      return;
    }

    drawInlineElement(child);
  };

  Array.from(markdownBody.children).forEach(drawElement);

  const pdfBlob = doc.output("blob");
  return new File([pdfBlob], filename, {
    type: "application/pdf",
  });
}
