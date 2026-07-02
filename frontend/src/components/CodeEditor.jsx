import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Sun, Moon, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'csharp', label: 'C#' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'kotlin', label: 'Kotlin' },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 22, 24];
const LANGUAGE_MONACO_MAP = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  php: 'php',
  kotlin: 'kotlin',
};

const CodeEditor = ({
  value = '',
  language = 'javascript',
  onChange,
  onLanguageChange,
  readOnly = false,
  height = '60vh',
}) => {
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [currentLang, setCurrentLang] = useState(language);
  const [mounting, setMounting] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => {
    setCurrentLang(language);
  }, [language]);

  useEffect(() => {
    const timer = setTimeout(() => setMounting(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLanguageChange = useCallback((e) => {
    const newLang = e.target.value;
    setCurrentLang(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  }, [onLanguageChange]);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [2048 | 66],
      run: () => {
        const runButton = document.querySelector('[data-run-button]');
        if (runButton) runButton.click();
      }
    });
  }, []);

  const monacoLanguage = LANGUAGE_MONACO_MAP[currentLang] || 'javascript';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: '#252526', borderBottom: '1px solid #3c3c3c',
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code2 size={14} color="#888" />
          <select
            value={currentLang}
            onChange={handleLanguageChange}
            style={{
              background: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 4,
              padding: '2px 8px', fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            style={{
              background: '#3c3c3c', color: '#ccc', border: 'none', borderRadius: 4,
              padding: '2px 6px', fontSize: 11, cursor: 'pointer', outline: 'none',
            }}
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
          <button
            onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', padding: 2, display: 'flex',
            }}
            title="Toggle theme"
          >
            {theme === 'vs-dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {mounting && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#1e1e1e', zIndex: 10,
          }}>
            <Loader2 size={20} className="animate-spin" color="#6366f1" />
          </div>
        )}
        <Editor
          height="100%"
          language={monacoLanguage}
          value={value}
          theme={theme}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            autoIndenting: 'full',
            formatOnPaste: true,
            formatOnType: true,
            wordWrap: 'off',
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: true,
            folding: true,
            foldingHighlight: true,
            foldingStrategy: 'indentation',
            glyphMargin: true,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            matchBrackets: 'always',
            occurrencesHighlight: 'singleFile',
            parameterHints: { enabled: true },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'currentDocument',
            codeLens: true,
            colorDecorators: true,
            selectionHighlight: true,
            unfoldOnClickAfterEndOfLine: true,
            guides: { indentation: true, bracketPairs: true, highlightActiveIndentation: true },
            hover: { enabled: true, sticky: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoClosingComments: 'always',
            autoSurround: 'always',
            contextmenu: true,
            copyWithSyntaxHighlighting: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;