import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API, API_BASE } from '../api/api';
import { getAuthHeaders } from '../api/request';
import AnimatedDropdown from './AnimatedDropdown';
import Leaderboard from './Leaderboard';
import './TrainerAIQuiz.css';

const FILE_TYPE_ICONS = { pdf: '📕', docx: '📘', doc: '📘', txt: '📄' };
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const TrainerAIQuiz = ({ user }) => {
  const [activeTab, setActiveTab] = useState('prompt');
  const [promptText, setPromptText] = useState('');
  const [trainings, setTrainings] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);
  const [selectedTraining, setSelectedTraining] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [previewingQuiz, setPreviewingQuiz] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedQuizForLeaderboard, setSelectedQuizForLeaderboard] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [sending, setSending] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');
  const fileInputRef = useRef();
  const uploadInProgress = useRef(false);

  // ── Data Fetching ─────────────────────────────
  const fetchTrainings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/trainer/trainings`, { headers: getAuthHeaders(user) });
      const data = await res.json();
      setTrainings(data.trainings || []);
    } catch (err) { console.error('Failed to fetch trainings:', err); }
  }, [user]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/trainer/quizzes`, { headers: getAuthHeaders(user) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quizzes');
      setQuizzes(data.quizzes || []);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }
  }, [user]);

  useEffect(() => { fetchTrainings(); fetchQuizzes(); }, [fetchTrainings, fetchQuizzes]);

  // ── File Validation ───────────────────────────
  const validateFile = (selected) => {
    const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'];
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff'];
    const fileExt = '.' + selected.name.split('.').pop().toLowerCase();

    if (imageTypes.includes(selected.type) || imageExts.includes(fileExt)) {
      setError('Images are NOT supported. Please upload PDF, DOCX, PPTX, or TXT files only.');
      return false;
    }
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'];
    if (!validTypes.includes(selected.type) && !selected.name.match(/\.(pdf|docx|pptx|txt)$/i)) {
      setError('Unsupported file type. Please upload PDF, DOCX, PPTX, or TXT files only.');
      return false;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File size must be less than 25 MB.');
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && validateFile(selected)) { setFile(selected); setError(''); }
    else if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag & Drop ───────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && validateFile(dropped)) { setFile(dropped); setError(''); }
  };

  // ── Prompt Quiz Generation ─────────────────────
  const handleGenerateFromPrompt = async (e) => {
    e.preventDefault();
    if (!promptText.trim()) { setError('Please enter a prompt or topic'); return; }
    setLoading(true);
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/ai-quiz/generate-from-prompt`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(user),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId: '',
          trainingId: selectedTraining,
          prompt: promptText.trim(),
          questionCount: numQuestions,
          difficulty: difficulty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Generation failed');

      await fetchQuizzes();
      const createdQuiz = data.quiz;
      if (createdQuiz?.id) {
        setSendTarget(createdQuiz);
      } else {
        setSuccess('Quiz Created Successfully');
        setTimeout(() => setActiveTab('my-quizzes'), 1500);
      }
      setPromptText('');
    } catch (err) {
      console.error('Prompt generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  // ── Document Quiz Generation ───────────────────
  const handleGenerateFromDocument = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload'); return; }
    if (uploadInProgress.current) return;

    uploadInProgress.current = true;
    setLoading(true);
    setGenerating(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', '');
    formData.append('trainingId', selectedTraining || '');
    formData.append('questionCount', numQuestions);
    formData.append('difficulty', difficulty);

    try {
      const res = await fetch(`${API_BASE}/ai-quiz/generate-from-document`, {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Upload failed');

      await fetchQuizzes();
      const createdQuiz = data.quiz;
      if (createdQuiz?.id) {
        setSendTarget(createdQuiz);
      } else {
        setSuccess('Quiz Created Successfully');
        setTimeout(() => setActiveTab('my-quizzes'), 1500);
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Document generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setGenerating(false);
      uploadInProgress.current = false;
    }
  };

  // ── Quiz Management ───────────────────────────
  const handleEditQuiz = (quiz) => { setEditingQuiz(quiz); setGeneratedQuestions(quiz.questions || []); };
  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...generatedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedQuestions(updated);
  };
  const handleSaveQuiz = async () => {
    if (!editingQuiz) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/trainer/quiz/${editingQuiz.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingQuiz.title, timeLimit: editingQuiz.timeLimit, status: editingQuiz.status })
      });
      if (!res.ok) throw new Error('Failed to update');
      setSuccess('Quiz updated successfully!');
      setEditingQuiz(null);
      fetchQuizzes();
    } catch (err) { setError('Failed to update quiz: ' + err.message); }
    finally { setLoading(false); }
  };

  const handlePublishQuiz = async (quiz) => {
    const confirm = window.confirm("Are you sure you want to publish this quiz? Participants will be able to attempt it.");
    if (!confirm) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API.AI_QUIZ.PUBLISH(quiz.id), {
        method: 'POST',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish quiz');
      setSuccess('Quiz published successfully!');
      await fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to publish quiz');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResult = async (quiz) => {
    const confirm = window.confirm("Publish results for this quiz? Participants will see their scores, correct answers, and rankings.");
    if (!confirm) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API.AI_QUIZ.PUBLISH_RESULT_V2(quiz.id), {
        method: 'POST',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish results');
      setSuccess('Results published successfully!');
      await fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to publish results');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQuiz = async (quiz) => {
    const confirm = window.confirm(`Close "${quiz.title || 'this quiz'}"? In-progress attempts will be auto-submitted. Participants will no longer be able to access it.`);
    if (!confirm) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API.AI_QUIZ.CLOSE(quiz.id), {
        method: 'POST',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close quiz');
      setSuccess(`Quiz closed. ${data.autoSubmitted || 0} attempt(s) auto-submitted.`);
      await fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to close quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublishQuiz = async (quiz) => {
    const confirm = window.confirm(`Return "${quiz.title || 'this quiz'}" to draft? This will remove all time window settings.`);
    if (!confirm) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API.AI_QUIZ.UNPUBLISH(quiz.id), {
        method: 'POST',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unpublish quiz');
      setSuccess('Quiz returned to draft.');
      await fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to unpublish quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quiz) => {
    const confirm = window.confirm(`Are you sure you want to delete "${quiz.title || 'this quiz'}"? This is permanent and cannot be undone.`);
    if (!confirm) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API.AI_QUIZ.DELETE(quiz.id), {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete quiz');
      setSuccess('Quiz deleted successfully!');
      await fetchQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  // ── Send Quiz to Participants ───────────────────
  const handleSendQuiz = async (quizId) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(API.AI_QUIZ.SEND(quizId), {
        method: 'POST',
        headers: getAuthHeaders(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send quiz');
      const count = data.participantCount ?? 0;
      setSuccess(`✅ Quiz sent to ${count} participant${count !== 1 ? 's' : ''} successfully!`);
      setSendTarget(null);
      await fetchQuizzes();
      setTimeout(() => setActiveTab('my-quizzes'), 800);
    } catch (err) {
      setError(err.message || 'Failed to send quiz');
    } finally {
      setSending(false);
    }
  };

  // ── Leaderboard ───────────────────────────────
  const fetchLeaderboard = async (quizId) => {
    if (!quizId) return;
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/leaderboard/${quizId}`, { headers: getAuthHeaders(user) });
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
    } catch (err) { console.error('Failed to fetch leaderboard:', err); }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard' && quizzes.length > 0 && !selectedQuizForLeaderboard) {
      setSelectedQuizForLeaderboard(quizzes[0]?.id || '');
    }
  }, [activeTab, quizzes, selectedQuizForLeaderboard]);

  useEffect(() => {
    if (selectedQuizForLeaderboard) fetchLeaderboard(selectedQuizForLeaderboard);
  }, [selectedQuizForLeaderboard]);

  // ── Helpers ───────────────────────────────────
  const fileExt = file ? file.name.split('.').pop().toLowerCase() : '';
  const trainingOptions = trainings.map(t => ({ label: t.title, value: t.id }));
  const difficultyOptions = [
    { label: 'Easy', value: 'EASY' }, { label: 'Medium', value: 'MEDIUM' },
    { label: 'Hard', value: 'HARD' }, { label: 'Mixed', value: 'MIXED' }
  ];

  // ── Alert Component ───────────────────────────
  const AlertBox = ({ type, text, onClose }) => (
    <motion.div className={`alert-box ${type}`}
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3 }}>
      <span className="alert-icon">{type === 'error' ? '⚠️' : '✅'}</span>
      <div className="alert-body">
        <span className="alert-title">{type === 'error' ? 'Something went wrong' : 'Success'}</span>
        <span className="alert-text">{text}</span>
      </div>
      <button className="alert-close" onClick={onClose}>✕</button>
    </motion.div>
  );

  // ── Skeleton Loader ───────────────────────────
  const SkeletonLoader = () => (
    <div className="quiz-skeleton">
      <div className="skeleton-bar h-lg w-60" />
      <div className="skeleton-bar w-full" /><div className="skeleton-bar w-75" />
      <div className="skeleton-bar w-full" /><div className="skeleton-bar w-50" />
      <div className="skeleton-bar w-full" /><div className="skeleton-bar w-75" />
    </div>
  );

  return (
    <div className="trainer-ai-quiz">
      <div className="quiz-header">
        <h2>🤖 AI Quiz Generator</h2>
        <p className="subtitle">Upload training materials and let AI generate quizzes automatically</p>
      </div>

      {/* ── Tabs ─────────────────────────────── */}
      <div className="quiz-tabs">
        {[
          { key: 'prompt', icon: '✨', label: 'From Prompt / Topic' },
          { key: 'document', icon: '📄', label: 'From Document' },
          { key: 'my-quizzes', icon: '📚', label: 'My Quizzes' },
          { key: 'leaderboard', icon: '🏆', label: 'Leaderboard' }
        ].map(tab => (
          <button key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Alerts ───────────────────────────── */}
      <AnimatePresence>
        {error && <AlertBox type="error" text={error} onClose={() => setError('')} />}
        {success && <AlertBox type="success" text={success} onClose={() => setSuccess('')} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {/* ── PROMPT TAB ─────────────────── */}
          {activeTab === 'prompt' && (
            <div className="upload-section">
              {generating ? (
                <div className="generating-overlay">
                  <div className="generating-spinner" />
                  <div className="generating-text">Generating Your Quiz…</div>
                  <div className="generating-sub">AI is analyzing your topic and creating questions. This may take 30–60 seconds.</div>
                  <SkeletonLoader />
                </div>
              ) : (
                <form onSubmit={handleGenerateFromPrompt} className="upload-form">
                  <div className="form-group">
                    <label>Topic or Prompt</label>
                    <textarea
                      value={promptText}
                      onChange={e => setPromptText(e.target.value)}
                      placeholder="e.g. Java OOP Concepts (Inheritance, Polymorphism, Encapsulation, Abstraction)"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Provide a specific topic or description to guide question generation.
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Assign to Training (Optional)</label>
                      {trainings.length > 0 ? (
                        <AnimatedDropdown
                          options={[{ label: 'No Training', value: '' }, ...trainingOptions]}
                          value={selectedTraining} onChange={setSelectedTraining}
                          placeholder="Select training..." />
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0.5rem' }}>
                          No trainings available.{' '}
                          <button type="button" onClick={fetchTrainings}
                            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}>Refresh</button>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Number of Questions</label>
                      <AnimatedDropdown
                        options={[5, 10, 15, 20, 25, 30].map(n => ({ label: `${n} Questions`, value: n }))}
                        value={numQuestions} onChange={setNumQuestions} placeholder="Select..." />
                    </div>
                    <div className="form-group">
                      <label>Difficulty</label>
                      <AnimatedDropdown
                        options={difficultyOptions} value={difficulty}
                        onChange={setDifficulty} placeholder="Select..." />
                    </div>
                  </div>

                  <button type="submit" className="generate-btn" disabled={loading || !promptText.trim()}>
                    {loading ? (<><span className="spinner" /> Generating…</>) : '🤖 Generate Quiz with AI'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── DOCUMENT TAB ───────────────── */}
          {activeTab === 'document' && (
            <div className="upload-section">
              {generating ? (
                <div className="generating-overlay">
                  <div className="generating-spinner" />
                  <div className="generating-text">Generating Your Quiz…</div>
                  <div className="generating-sub">AI is analyzing your document and creating questions. This may take 30–60 seconds.</div>
                  <SkeletonLoader />
                </div>
              ) : (
                <form onSubmit={handleGenerateFromDocument} className="upload-form">
                  <div className="form-group">
                    <label>Upload Training Document</label>
                    <div className="upload-warning">⚠️ Only PDF, DOCX, PPTX, and TXT files are supported. Images are NOT supported.</div>
                    <div
                      className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}>
                      <input ref={fileInputRef} type="file"
                        accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                        onChange={handleFileChange} style={{ display: 'none' }} />
                      {file ? (
                        <div className="file-preview">
                           <div className="file-type-icon">{FILE_TYPE_ICONS[fileExt] || '📄'}</div>
                           <div className="file-details">
                             <div className="file-name">{file.name}</div>
                             <div className="file-meta">{(file.size / 1024).toFixed(1)} KB · {fileExt.toUpperCase()}</div>
                           </div>
                           <button type="button" className="file-remove" onClick={(e) => {
                             e.stopPropagation(); setFile(null);
                             if (fileInputRef.current) fileInputRef.current.value = '';
                           }}>✕</button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">☁️</span>
                          <p>Drag & drop your file here, or click to browse</p>
                          <p className="upload-hint">PDF, DOCX, PPTX, or TXT · Max 25 MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Assign to Training (Optional)</label>
                      {trainings.length > 0 ? (
                        <AnimatedDropdown
                          options={[{ label: 'No Training', value: '' }, ...trainingOptions]}
                          value={selectedTraining} onChange={setSelectedTraining}
                          placeholder="Select training..." />
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0.5rem' }}>
                          No trainings available.{' '}
                          <button type="button" onClick={fetchTrainings}
                            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}>Refresh</button>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Number of Questions</label>
                      <AnimatedDropdown
                        options={[5, 10, 15, 20].map(n => ({ label: `${n} Questions`, value: n }))}
                        value={numQuestions} onChange={setNumQuestions} placeholder="Select..." />
                    </div>
                    <div className="form-group">
                      <label>Difficulty</label>
                      <AnimatedDropdown
                        options={difficultyOptions} value={difficulty}
                        onChange={setDifficulty} placeholder="Select..." />
                    </div>
                  </div>

                  <button type="submit" className="generate-btn" disabled={loading || !file}>
                    {loading ? (<><span className="spinner" /> Generating…</>) : '🤖 Generate Quiz with AI'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'my-quizzes' && (
            <div className="quizzes-section">
              {/* ── Lifecycle filter tabs ── */}
              <div className="lifecycle-filters">
                {['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED', 'RESULTS_PUBLISHED'].map(status => {
                  const labels = { ALL: 'All', DRAFT: 'Drafts', PUBLISHED: 'Live', CLOSED: 'Closed', RESULTS_PUBLISHED: 'Results' };
                  const counts = { ALL: quizzes.length };
                  for (const q of quizzes) {
                    const s = q.status || (q.isResultPublished ? 'RESULTS_PUBLISHED' : q.isPublished ? 'PUBLISHED' : 'DRAFT');
                    counts[s] = (counts[s] || 0) + 1;
                  }
                  return (
                    <button key={status}
                      className={`lifecycle-filter-btn ${lifecycleFilter === status ? 'active' : ''}`}
                      onClick={() => setLifecycleFilter(status)}
                    >{labels[status]} {counts[status] > 0 && <span className="filter-count">{counts[status]}</span>}</button>
                  );
                })}
              </div>

              {quizzes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <p>No quizzes generated yet. Create a quiz from a prompt or document to get started!</p>
                </div>
              ) : (
                <div className="quizzes-list">
                  {quizzes
                    .filter(quiz => {
                      if (lifecycleFilter === 'ALL') return true;
                      const s = quiz.status || (quiz.isResultPublished ? 'RESULTS_PUBLISHED' : quiz.isPublished ? 'PUBLISHED' : 'DRAFT');
                      return s === lifecycleFilter;
                    })
                    .map(quiz => {
                      const status = quiz.status || (quiz.isResultPublished ? 'RESULTS_PUBLISHED' : quiz.isPublished ? 'PUBLISHED' : 'DRAFT');
                      const statusConfig = {
                        DRAFT: { label: '✏️ Draft', bg: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' },
                        PUBLISHED: { label: '📤 Live', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e', border: '1px solid #fcd34d' },
                        CLOSED: { label: '🔒 Closed', bg: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#991b1b', border: '1px solid #fca5a5' },
                        RESULTS_PUBLISHED: { label: '📊 Results Published', bg: 'linear-gradient(135deg,#dbeafe,#ede9fe)', color: '#1e40af', border: '1px solid #bfdbfe' },
                      };
                      const cfg = statusConfig[status] || statusConfig.DRAFT;
                      return (
                    <motion.div key={quiz.id} className="quiz-card"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="quiz-card-header">
                        <h3>{quiz.title || 'Untitled Quiz'}</h3>
                        <span className="status-badge" style={{
                          background: cfg.bg, color: cfg.color, border: cfg.border,
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
                        }}>{cfg.label}</span>
                      </div>

                      <div className="quiz-meta">
                        <span>❓ {quiz.questions?.length || 0} questions</span>
                        <span>🎯 {quiz.difficulty || 'MEDIUM'}</span>
                        {quiz.training && <span>📚 {quiz.training.title}</span>}
                        {quiz.publishedAt && (
                          <span>📅 Sent {new Date(quiz.publishedAt).toLocaleDateString()}</span>
                        )}
                        {quiz.startTime && (
                          <span>🕐 {new Date(quiz.startTime).toLocaleDateString()} – {new Date(quiz.endTime || quiz.startTime).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="quiz-actions">
                        <button
                          className="view-btn"
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b' }}
                          onClick={() => setPreviewingQuiz(quiz)}
                        >👁️ Preview</button>

                        {status === 'DRAFT' && (
                          <>
                            <button className="edit-btn" onClick={() => handleEditQuiz(quiz)}>✏️ Edit</button>
                            <button className="publish-btn"
                              style={{
                                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                color: '#fff', border: 'none',
                                padding: '8px 18px', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                                boxShadow: '0 2px 8px rgba(245,158,11,0.35)'
                              }}
                              onClick={() => setSendTarget(quiz)}
                            >📤 Send to Participants</button>
                            <button
                              style={{
                                background: '#fef2f2', color: '#b91c1c',
                                border: '1px solid #fecaca', padding: '7px 13px',
                                borderRadius: '8px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: '600'
                              }}
                              onClick={() => handleDeleteQuiz(quiz)}
                            >🗑️ Delete</button>
                          </>
                        )}

                        {status === 'PUBLISHED' && (
                          <>
                            <button className="publish-btn"
                              style={{
                                background: '#fef2f2', color: '#b91c1c',
                                border: '1px solid #fecaca', padding: '8px 16px',
                                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                              }}
                              onClick={() => handleCloseQuiz(quiz)}
                              disabled={loading}
                            >🔒 Close Now</button>
                            <button className="publish-btn"
                              style={{
                                background: '#f0fdf4', color: '#166534',
                                border: '1px solid #bbf7d0', padding: '8px 16px',
                                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                              }}
                              onClick={() => handleUnpublishQuiz(quiz)}
                              disabled={loading}
                            >⬅️ Unpublish</button>
                            <button className="view-btn"
                              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                              onClick={() => { setSelectedQuizForLeaderboard(quiz.id); setActiveTab('leaderboard'); }}
                            >🏆 Leaderboard</button>
                          </>
                        )}

                        {status === 'CLOSED' && (
                          <>
                            <button className="publish-btn"
                              style={{
                                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                color: '#fff', border: 'none',
                                padding: '8px 16px', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                              }}
                              onClick={() => handlePublishResult(quiz)}
                              disabled={loading}
                            >📊 Publish Results</button>
                            <button className="view-btn"
                              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                              onClick={() => { setSelectedQuizForLeaderboard(quiz.id); setActiveTab('leaderboard'); }}
                            >🏆 Leaderboard</button>
                          </>
                        )}

                        {status === 'RESULTS_PUBLISHED' && (
                          <button className="view-btn"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                            onClick={() => { setSelectedQuizForLeaderboard(quiz.id); setActiveTab('leaderboard'); }}
                          >📊 View Analytics</button>
                        )}
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── LEADERBOARD TAB ────────────── */}
          {activeTab === 'leaderboard' && (
            <div className="leaderboard-section">
              {quizzes.length > 0 ? (
                <>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Select Quiz</label>
                    <AnimatedDropdown
                      options={quizzes.map(q => ({ label: q.title || 'Untitled Quiz', value: q.id }))}
                      value={selectedQuizForLeaderboard}
                      onChange={(val) => { setSelectedQuizForLeaderboard(val); fetchLeaderboard(val); }}
                      placeholder="Select a quiz..." />
                  </div>
                  <Leaderboard data={leaderboardData}
                    title={quizzes.find(q => q.id == selectedQuizForLeaderboard)?.title || 'Quiz Leaderboard'} />
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🏆</div>
                  <p>No quizzes available. Generate a quiz first!</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Edit Quiz Modal ─────────────────── */}
      <AnimatePresence>
        {editingQuiz && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingQuiz(null)}>
            <motion.div className="modal-content edit-quiz-modal"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <h2>Edit Quiz Questions</h2>
              <div className="questions-editor">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="question-editor">
                    <div className="question-header">
                      <span className="q-type-badge">{q.questionType}</span>
                      <span className="q-number">Q{idx + 1}</span>
                    </div>
                    <textarea className="question-text-input" value={q.questionText}
                      onChange={(e) => handleUpdateQuestion(idx, 'questionText', e.target.value)}
                      placeholder="Question text..." />
                    {q.questionType === 'MCQ' && (
                      <div className="options-editor">
                        {(q.options || []).map((opt, oidx) => (
                          <div key={oidx} className="option-row">
                            <input type="radio" name={`correct-${idx}`}
                              checked={q.correctAnswer === String(oidx)}
                              onChange={() => handleUpdateQuestion(idx, 'correctAnswer', String(oidx))} />
                            <input type="text" value={opt} className="option-input"
                              onChange={(e) => {
                                const newOpts = [...(q.options || [])];
                                newOpts[oidx] = e.target.value;
                                handleUpdateQuestion(idx, 'options', newOpts);
                              }} />
                          </div>
                        ))}
                      </div>
                    )}
                    <input type="text" className="model-answer-input"
                      value={q.correctAnswer || ''}
                      onChange={(e) => handleUpdateQuestion(idx, 'correctAnswer', e.target.value)}
                      placeholder="Correct answer / Model answer" />
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setEditingQuiz(null)}>Cancel</button>
                <button className="save-btn" onClick={handleSaveQuiz} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Send Quiz Confirmation Modal ──────── */}
      <AnimatePresence>
        {sendTarget && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!sending) setSendTarget(null); }}>
            <motion.div
              className="modal-content confirm-modal"
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '520px', padding: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.18)' }}>

              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                padding: '28px 28px 24px',
                position: 'relative'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📤</div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  Send Quiz to Participants
                </h2>
                <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
                  This will assign the quiz to all enrolled participants
                </p>
                {!sending && (
                  <button
                    onClick={() => setSendTarget(null)}
                    style={{
                      position: 'absolute', top: '16px', right: '16px',
                      background: 'rgba(255,255,255,0.2)', border: 'none',
                      borderRadius: '50%', width: '32px', height: '32px',
                      cursor: 'pointer', color: '#fff', fontSize: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >✕</button>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '24px 28px' }}>
                {/* Quiz details card */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '12px', padding: '16px', marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px', marginBottom: '8px' }}>
                    📝 {sendTarget.title || 'Untitled Quiz'}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      ❓ {sendTarget.questions?.length || 0} questions
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      🎯 {sendTarget.difficulty || 'MEDIUM'}
                    </span>
                    {sendTarget.training && (
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        📚 {sendTarget.training.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* What happens next */}
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                    What happens when you click Send:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: '👥', text: 'Quiz assigned to all enrolled participants' },
                      { icon: '✅', text: 'Participants see it in their Available Quizzes' },
                      { icon: '📊', text: 'You can publish results after they complete it' },
                    ].map((step, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', background: '#f0fdf4',
                        borderRadius: '8px', border: '1px solid #bbf7d0'
                      }}>
                        <span style={{ fontSize: '18px' }}>{step.icon}</span>
                        <span style={{ fontSize: '13px', color: '#166534', fontWeight: '500' }}>{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setSendTarget(null)}
                    disabled={sending}
                    style={{
                      padding: '10px 20px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#64748b', fontWeight: '600', fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSendQuiz(sendTarget.id)}
                    disabled={sending}
                    style={{
                      padding: '10px 28px', borderRadius: '10px',
                      background: sending
                        ? '#d1d5db'
                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#fff', fontWeight: '700', fontSize: '14px',
                      border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                      boxShadow: sending ? 'none' : '0 4px 14px rgba(245,158,11,0.4)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {sending ? (
                      <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Sending…</>
                    ) : (
                      <>📤 Send Quiz Now</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Quiz Modal ───────────────── */}
      <AnimatePresence>
        {previewingQuiz && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewingQuiz(null)}>
            <motion.div className="modal-content edit-quiz-modal"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <h2>Preview Quiz: {previewingQuiz.title}</h2>
              <div className="questions-editor" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {(previewingQuiz.questions || []).map((q, idx) => (
                  <div key={idx} className="question-editor" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div className="question-header">
                      <span className="q-type-badge">{q.questionType}</span>
                      <span className="q-number">Q{idx + 1}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', marginBottom: '10px' }}>
                      {q.questionText}
                    </div>
                    {q.options && q.options.length > 0 ? (
                      <div className="options-editor" style={{ paddingLeft: '8px' }}>
                        {q.options.map((opt, oidx) => (
                          <div key={oidx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            background: String(oidx) === String(q.correctAnswer) ? '#f0fdf4' : 'transparent',
                            border: String(oidx) === String(q.correctAnswer) ? '1px solid #bbf7d0' : '1px solid transparent',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: String(oidx) === String(q.correctAnswer) ? '#166534' : '#475569',
                            fontWeight: String(oidx) === String(q.correctAnswer) ? '600' : 'normal'
                          }}>
                            <span style={{ fontSize: '10px' }}>{String.fromCharCode(65 + oidx)}.</span>
                            <span>{opt}</span>
                            {String(oidx) === String(q.correctAnswer) && <span style={{ marginLeft: 'auto', fontSize: '12px' }}>✓ Correct Option</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        Correct Answer: <strong style={{ color: '#0f172a' }}>{q.correctAnswer}</strong>
                      </div>
                    )}
                    {q.explanation && (
                      <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginTop: '10px', borderLeft: '3px solid #cbd5e1' }}>
                        💡 <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setPreviewingQuiz(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerAIQuiz;
