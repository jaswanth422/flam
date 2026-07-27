import { useEffect, useRef, useState } from "react";
import { readStudyFile } from "../lib/readStudyFile.js";

const PLACEHOLDER =
  "Paste a chapter, lecture notes, or an article here. Lumen will find the ideas worth remembering…";

export function PromptForm({
  onSubmit,
  disabled,
  initialText = "",
  onTextChange,
  mode = "flashcards",
  onModeChange,
}) {
  const [text, setText] = useState(initialText);
  const [count, setCount] = useState(8);
  const [fileState, setFileState] = useState({
    phase: "idle",
    message: "",
  });
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const updateText = (value) => {
    setText(value);
    onTextChange?.(value);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!disabled && text.trim()) onSubmit(text, count, mode);
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      submit(event);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileState({ phase: "reading", message: `Reading ${file.name}…` });
    try {
      const result = await readStudyFile(file);
      updateText(result.text);
      setFileState({
        phase: "ready",
        message: result.truncated
          ? `${result.fileName} added. Long text was trimmed to fit.`
          : `${result.fileName} added to your study material.`,
      });
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (error) {
      setFileState({
        phase: "error",
        message: error instanceof Error ? error.message : "We couldn’t read that file.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const fileBusy = fileState.phase === "reading";

  return (
    <form className="prompt-form" onSubmit={submit}>
      <fieldset className="mode-picker" disabled={disabled}>
        <legend>Choose a study mode</legend>
        <div className="mode-segments">
          <button
            type="button"
            className={mode === "flashcards" ? "is-active" : ""}
            aria-pressed={mode === "flashcards"}
            onClick={() => onModeChange?.("flashcards")}
          >
            <span aria-hidden="true">↻</span>
            <strong>Flashcards</strong>
            <small>Recall one idea at a time</small>
          </button>
          <button
            type="button"
            className={mode === "quiz" ? "is-active" : ""}
            aria-pressed={mode === "quiz"}
            onClick={() => onModeChange?.("quiz")}
          >
            <span aria-hidden="true">1·2·3</span>
            <strong>Quiz</strong>
            <small>Choose from close answers</small>
          </button>
        </div>
      </fieldset>
      <div className="prompt-label-row">
        <label htmlFor="study-material">Your study material</label>
        <span>{text.length.toLocaleString()} characters</span>
      </div>
      <textarea
        ref={textareaRef}
        id="study-material"
        value={text}
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        disabled={disabled}
        maxLength={19999}
        rows={9}
      />
      <div className={`file-status file-status-${fileState.phase}`}>
        {fileState.message || "PDF, Word .docx, Markdown, or text · up to 12 MB"}
      </div>
      <div className={`grounding-preview ${text.trim().length >= 400 ? "is-source" : "is-topic"}`}>
        {text.trim().length >= 400
          ? "✓ Source mode — evidence will be checked against these notes"
          : "General-knowledge mode — add 400+ characters to verify against your notes"}
      </div>
      <div className="prompt-actions">
        <div className="prompt-tools">
          <input
            ref={fileInputRef}
            className="visually-hidden-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            onChange={handleFile}
            tabIndex={-1}
          />
          <button
            type="button"
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || fileBusy}
          >
            <span className="upload-icon" aria-hidden="true">
              {fileBusy ? "···" : "↑"}
            </span>
            {fileBusy ? "Reading file" : "Upload file"}
          </button>
          <label className="count-select">
            <span>Cards</span>
            <select
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              disabled={disabled || fileBusy}
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="button button-primary generate-button"
          disabled={disabled || fileBusy || !text.trim()}
        >
          <span aria-hidden="true">✦</span>
          Build {mode === "quiz" ? "quiz" : "flashcards"}
          <span className="key-hint">⌘↵</span>
        </button>
      </div>
    </form>
  );
}
