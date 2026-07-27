import { useEffect, useRef, useState } from "react";

const PLACEHOLDER =
  "Paste a chapter, lecture notes, or an article here. Lumen will find the ideas worth remembering…";

export function PromptForm({
  onSubmit,
  disabled,
  initialText = "",
  onTextChange,
}) {
  const [text, setText] = useState(initialText);
  const [count, setCount] = useState(8);
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const updateText = (value) => {
    setText(value);
    onTextChange?.(value);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!disabled && text.trim()) onSubmit(text, count);
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      submit(event);
    }
  };

  return (
    <form className="prompt-form" onSubmit={submit}>
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
      <div className="prompt-actions">
        <label className="count-select">
          <span>Cards</span>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={disabled}
          >
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
          </select>
        </label>
        <button
          type="submit"
          className="button button-primary generate-button"
          disabled={disabled || !text.trim()}
        >
          <span aria-hidden="true">✦</span>
          Build my deck
          <span className="key-hint">⌘↵</span>
        </button>
      </div>
    </form>
  );
}
