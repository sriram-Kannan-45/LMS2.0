

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../api/api';
import { getAuthHeaders } from '../api/request';
import QuizTaking from '../components/QuizTaking';
import Leaderboard from '../components/Leaderboard';

/* ─────────────────── DESIGN TOKENS ─────────────────── */
const T = {
  accent:    '#6366f1',
  accentSoft:'#eef2ff',
  accentMid: 'rgba(99,102,241,0.15)',
  purple:    '#7c3aed',
  pastelBg:  '#f0f0ff',       // matches screenshot bg
  surface:   '#ffffff',
  border:    '#e4e4f0',
  muted:     '#94a3b8',
  text:      '#1e1b4b',
  textSec:   '#6b7280',
  green:     '#10b981',
  amber:     '#f59e0b',
  red:       '#ef4444',
  crt:       "'Share Tech Mono', 'Courier New', monospace",
  sans:      "'DM Sans', 'Inter', sans-serif",
  display:   "'Outfit', 'DM Sans', sans-serif",
};

/* ─────────────────── FONTS (Google) ─────────────────── */
function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
}

/* ─────────────────── SIDEBAR ─────────────────── */
function Sidebar({ activeTab, onTabChange, onLogout, user }) {
  const navItems = [
    { id: 'trainings',   label: 'Available',    icon: '📖' },
    { id: 'enrollments', label: 'Enrollments',  icon: '📋' },
    { id: 'quizzes',     label: 'AI Quizzes',   icon: '✦'  },
    { id: 'feedback',    label: 'Give Feedback', icon: '💬' },
    { id: 'myfeedbacks', label: 'My Feedbacks',  icon: '📩' },
  ];

  return (
    <aside style={{
      width: 260,
      minHeight: '100vh',
      background: '#ffffff',
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-0.03em',
        }}>W</div>
        <div>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.2 }}>WAVE INIT</div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, marginTop: 1 }}>Learning Management</div>
        </div>
        <div style={{ marginLeft: 'auto', cursor: 'pointer', color: T.muted, fontSize: 18 }}>×</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '20px 12px', flex: 1 }}>
        <div style={{ fontFamily: T.crt, fontSize: 10, color: T.muted, letterSpacing: '0.12em', marginBottom: 10, paddingLeft: 8 }}>NAVIGATION</div>
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                border: 'none',
                background: active ? T.accentSoft : 'transparent',
                color: active ? T.accent : T.textSec,
                fontFamily: T.sans,
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 2,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
              {active && (
                <span style={{ marginLeft: 'auto', color: T.accent, fontSize: 12 }}>›</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Powered Banner */}
      <div style={{ padding: '0 12px 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
          border: `1px solid ${T.accentMid}`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 12, color: T.accent }}>AI-Powered</span>
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textSec }}>Smart quizzes & analytics enabled</div>
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: T.display, fontWeight: 700, fontSize: 13,
          }}>
            {(user?.name || 'D')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 13, color: T.text }}>{user?.name || 'demo2'}</div>
            <div style={{
              fontFamily: T.crt, fontSize: 9, color: T.accent,
              background: T.accentSoft, padding: '1px 6px', borderRadius: 4,
              display: 'inline-block', letterSpacing: '0.08em',
            }}>PARTICIPANT</div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16 }}>⇥</button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────── TOP NAV TABS ─────────────────── */
function TopNavTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'trainings',   label: 'Available Trainings' },
    { id: 'enrollments', label: 'My Enrollments' },
    { id: 'quizzes',     label: 'AI Quizzes' },
    { id: 'feedback',    label: 'Give Feedback' },
    { id: 'myfeedbacks', label: 'My Feedbacks' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 4, flexWrap: 'wrap',
      padding: '16px 24px 0',
      borderBottom: `1px solid ${T.border}`,
      background: T.surface,
    }}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
              background: 'none',
              color: active ? T.accent : T.textSec,
              fontFamily: T.sans,
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────── SCORE RING ─────────────────── */
function ScoreRing({ percent, size = 148, stroke = 12 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  const color = percent >= 80 ? T.green : percent >= 60 ? T.amber : T.accent;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color + 'bb'} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="url(#sg)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 220, damping: 15 }}
          style={{ fontFamily: T.crt, fontSize: 32, fontWeight: 400, color, lineHeight: 1 }}
        >
          {percent.toFixed(0)}%
        </motion.div>
        <div style={{ fontFamily: T.crt, fontSize: 9, color: T.muted, letterSpacing: '0.1em', marginTop: 4 }}>SCORE</div>
      </div>
    </div>
  );
}

/* ─────────────────── DIFFICULTY BADGE ─────────────────── */
function DiffBadge({ level }) {
  const cfg = {
    easy:   { bg: '#ecfdf5', color: '#065f46', dot: T.green },
    medium: { bg: '#fffbeb', color: '#92400e', dot: T.amber },
    hard:   { bg: '#fef2f2', color: '#991b1b', dot: T.red },
  };
  const c = cfg[(level || 'easy').toLowerCase()] || cfg.easy;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100,
      background: c.bg, color: c.color,
      fontFamily: T.crt, fontSize: 10, letterSpacing: '0.08em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {(level || 'EASY').toUpperCase()}
    </span>
  );
}

/* ─────────────────── SKELETON CARD ─────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 20,
      padding: 24,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      {[100, 60, 80, 40, 70].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 13, width: `${w}%`,
          background: '#f1f5f9', borderRadius: 6,
          marginBottom: 12, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            animation: `shimmer 1.4s infinite`,
            animationDelay: `${i * 0.1}s`,
          }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────── QUIZ CARD ─────────────────── */
function QuizCard({ quiz, onStart, onLeaderboard, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 24 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.surface,
        border: `1.5px solid ${hovered ? T.accent + '40' : T.border}`,
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.22s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 8px 32px rgba(99,102,241,0.12)` : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'default',
      }}
    >
      {/* Top accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #6366f1, #7c3aed)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.22s',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: T.display, fontWeight: 700, fontSize: 15,
          color: T.text, lineHeight: 1.35, flex: 1,
          letterSpacing: '-0.01em',
        }}>{quiz.title}</h3>
        <DiffBadge level={quiz.difficulty} />
      </div>

      {/* Meta */}
      <div style={{
        background: T.pastelBg,
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {[
          { key: 'QUESTIONS', val: `${quiz.questions?.length || 0} items` },
          { key: 'TIME', val: `${quiz.timeLimit || 30} min` },
          ...(quiz.training ? [{ key: 'MODULE', val: quiz.training.title }] : []),
        ].map(({ key, val }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: T.crt, fontSize: 9, color: T.muted,
              letterSpacing: '0.1em', minWidth: 70,
            }}>{key}</span>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.textSec, fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onStart(quiz.id)}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            color: '#fff',
            fontFamily: T.sans,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}
        >
          Start Quiz →
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onLeaderboard(quiz.id)}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: `1.5px solid ${T.border}`,
            background: T.surface,
            color: T.textSec,
            fontFamily: T.crt,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          🏆
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────── EMPTY STATE ─────────────────── */
function EmptyState({ onRefresh }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        background: T.surface,
        borderRadius: 20,
        border: `2px dashed ${T.border}`,
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 80, height: 80,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 20,
          border: `1px solid ${T.border}`,
        }}
      >✦</motion.div>

      <div style={{ fontFamily: T.crt, fontSize: 10, color: T.muted, letterSpacing: '0.14em', marginBottom: 8 }}>
        NO_QUIZZES_FOUND
      </div>
      <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, color: T.text, marginBottom: 10 }}>
        Nothing here yet
      </h3>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.textSec, maxWidth: 280, lineHeight: 1.6, marginBottom: 24 }}>
        Quizzes will appear here once your trainers publish them. Check back soon!
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRefresh}
        style={{
          padding: '9px 20px',
          borderRadius: 12,
          border: `1.5px solid ${T.accent}`,
          background: T.accentSoft,
          color: T.accent,
          fontFamily: T.sans,
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        ↻ Refresh
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────── RESULT PAGE ─────────────────── */
function ResultPage({ result, onBack, onLeaderboard }) {
  const pct = result.percentage ?? 0;
  const grade =
    pct >= 90 ? { label: 'Outstanding!', emoji: '🏆', color: T.amber } :
    pct >= 80 ? { label: 'Excellent!',   emoji: '🌟', color: T.green } :
    pct >= 60 ? { label: 'Good Job!',    emoji: '🎯', color: T.accent } :
               { label: 'Keep Going!',  emoji: '💪', color: T.muted };

  const stats = [
    { label: 'TOTAL SCORE', value: `${result.totalScore ?? 0}/${result.maxScore ?? 0}`, color: T.accent },
    { label: 'RANK',        value: result.rank ? `#${result.rank}` : 'N/A',            color: T.amber },
    { label: 'TIME',        value: result.timeTaken ?? '—',                            color: T.textSec },
    { label: 'ANSWERED',    value: `${result.answeredCount ?? '—'}/${result.totalQuestions ?? '—'}`, color: T.green },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          width: '100%', maxWidth: 460,
          background: T.surface,
          borderRadius: 28,
          border: `1.5px solid ${T.border}`,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(99,102,241,0.12)',
        }}
      >
        {/* Gradient top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #7c3aed, #a855f7)' }} />

        <div style={{ padding: '32px 32px 28px' }}>
          {/* Grade pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px',
              background: T.accentSoft, borderRadius: 100,
              border: `1px solid ${T.accentMid}`,
              marginBottom: 20,
            }}
          >
            <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 1, duration: 0.5 }}>
              {grade.emoji}
            </motion.span>
            <span style={{ fontFamily: T.crt, fontSize: 11, color: T.accent, letterSpacing: '0.08em' }}>
              {grade.label.toUpperCase()}
            </span>
          </motion.div>

          <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, color: T.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Quiz Complete
          </h2>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: T.textSec, marginBottom: 28 }}>
            Here's a breakdown of your performance
          </p>

          {/* Score ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <ScoreRing percent={pct} />
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {stats.map(({ label, value, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                style={{
                  background: T.pastelBg,
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontFamily: T.crt, fontSize: 9, color: T.muted, letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: T.crt, fontSize: 20, color, lineHeight: 1 }}>{value}</div>
              </motion.div>
            ))}
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: 12,
                border: `1.5px solid ${T.border}`,
                background: T.surface,
                color: T.textSec,
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >← Back to Quizzes</motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLeaderboard}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                color: '#fff',
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              }}
            >🏆 Leaderboard</motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────── LEADERBOARD MODAL ─────────────────── */
function LeaderboardModal({ data, onClose }) {
  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'relative',
            background: T.surface,
            borderRadius: 24,
            border: `1.5px solid ${T.border}`,
            width: '100%', maxWidth: 520,
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(99,102,241,0.18)',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)' }} />
          <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(85vh - 3px)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: T.crt, fontSize: 9, color: T.muted, letterSpacing: '0.14em', marginBottom: 4 }}>RANKINGS</div>
                <h3 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.text, letterSpacing: '-0.02em' }}>Leaderboard</h3>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: `1.5px solid ${T.border}`,
                  background: T.surface,
                  color: T.muted, cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >×</button>
            </div>

            {/* Top 3 podium */}
            {data.length >= 3 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {[data[1], data[0], data[2]].map((entry, i) => {
                  const heights = [80, 100, 70];
                  const medals  = ['🥈', '🥇', '🥉'];
                  const colors  = ['#64748b', '#f59e0b', '#b45309'];
                  const ranks   = [2, 1, 3];
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textSec, marginBottom: 6, fontWeight: 500 }}>
                        {entry?.name || '—'}
                      </div>
                      <div style={{
                        background: i === 1 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : T.pastelBg,
                        border: `1.5px solid ${i === 1 ? '#fbbf24' : T.border}`,
                        borderRadius: '12px 12px 0 0',
                        height: heights[i],
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}>
                        <span style={{ fontSize: 20 }}>{medals[i]}</span>
                        <span style={{ fontFamily: T.crt, fontSize: 13, color: colors[i] }}>
                          {entry?.percentage?.toFixed(0) ?? '—'}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rankings list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: i === 0 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : T.pastelBg,
                    border: `1px solid ${i === 0 ? '#fde68a' : T.border}`,
                  }}
                >
                  <span style={{
                    fontFamily: T.crt, fontSize: 13,
                    color: i === 0 ? T.amber : i === 1 ? '#64748b' : i === 2 ? '#b45309' : T.muted,
                    minWidth: 28,
                  }}>#{i + 1}</span>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: T.display, fontWeight: 700, fontSize: 12,
                    flexShrink: 0,
                  }}>{(entry.name || '?')[0].toUpperCase()}</div>
                  <span style={{ fontFamily: T.sans, fontWeight: 500, fontSize: 13, color: T.text, flex: 1 }}>{entry.name || '—'}</span>
                  <span style={{ fontFamily: T.crt, fontSize: 13, color: T.green }}>{entry.percentage?.toFixed(0) ?? '—'}%</span>
                  <span style={{ fontFamily: T.crt, fontSize: 11, color: T.muted }}>{entry.totalScore ?? '—'}pt</span>
                </motion.div>
              ))}
              {data.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: T.sans, fontSize: 13, color: T.muted }}>
                  No entries yet. Be the first to complete this quiz!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ─────────────────── HEADER BANNER ─────────────────── */
function QuizHeader({ count, loading }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
      padding: '28px 28px',
      marginBottom: 24,
    }}>
      {/* Decorative dots */}
      <div style={{
        position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 8px)', gap: 6, opacity: 0.2,
      }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: T.crt, fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.15em' }}>✦ AI_POWERED</span>
          </div>
          <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Available Quizzes
          </h2>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Test your knowledge with AI-generated assessments
          </p>
        </div>
        {!loading && (
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 16,
            padding: '12px 20px',
            textAlign: 'center',
            minWidth: 80,
          }}>
            <div style={{ fontFamily: T.crt, fontSize: 28, color: '#fff', lineHeight: 1 }}>{count}</div>
            <div style={{ fontFamily: T.crt, fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', marginTop: 4 }}>READY</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── MAIN COMPONENT ─────────────────── */
function ParticipantQuizzes({ user, activeTab, onTabChange, onLogout }) {
  const [quizzes, setQuizzes]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeQuiz, setActiveQuiz]     = useState(null);
  const [attemptId, setAttemptId]       = useState(null);
  const [quizResult, setQuizResult]     = useState(null);
  const [showLB, setShowLB]             = useState(false);
  const [leaderboardData, setLBData]    = useState([]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/ai-quiz/participant/quizzes`, { headers: getAuthHeaders() });
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch { setError('Failed to load quizzes'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleStartQuiz = async (quizId) => {
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/ai-quiz/participant/start/${quizId}`, {
        method: 'POST', headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      if (!data.quiz?.questions?.length) throw new Error('No questions. Contact your trainer.');
      setActiveQuiz(data.quiz);
      setAttemptId(data.attemptId);
    } catch (e) { setError(e.message); }
  };

  const handleQuizSubmit = (result) => {
    setQuizResult(result);
    setActiveQuiz(null);
    setAttemptId(null);
  };

  const fetchLeaderboard = async (quizId) => {
    try {
      const res  = await fetch(`${API_BASE}/ai-quiz/leaderboard/${quizId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setLBData(data.leaderboard || []);
      setShowLB(true);
    } catch (e) { console.error(e); }
  };

  /* ── Shell wrapper ── */
  const Shell = ({ children, title = 'AI Quizzes', subtitle = '' }) => (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: T.pastelBg,
      fontFamily: T.sans,
    }}>
      <FontLoader />
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout} user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 18, color: T.text, letterSpacing: '-0.01em' }}>
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.muted, position: 'relative' }}>
              🔔
              <span style={{
                position: 'absolute', top: 0, right: 0, width: 8, height: 8,
                borderRadius: '50%', background: T.red, border: '2px solid white',
              }} />
            </button>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.muted }}>⇥</button>
          </div>
        </div>

        <TopNavTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );

  /* ── Quiz taking ── */
  if (activeQuiz && attemptId) {
    return (
      <Shell title="Taking Quiz" subtitle="Answer carefully">
        <QuizTaking
          quizId={activeQuiz.id}
          attemptId={attemptId}
          quizData={activeQuiz}
          onSubmit={handleQuizSubmit}
        />
      </Shell>
    );
  }

  /* ── Result ── */
  if (quizResult) {
    return (
      <Shell title="Quiz Results">
        <ResultPage
          result={quizResult}
          onBack={() => setQuizResult(null)}
          onLeaderboard={() => fetchLeaderboard(quizResult.quizId)}
        />
        {showLB && (
          <LeaderboardModal data={leaderboardData} onClose={() => setShowLB(false)} />
        )}
      </Shell>
    );
  }

  /* ── Main listing ── */
  return (
    <Shell title="AI Quizzes">
      <QuizHeader count={quizzes.length} loading={loading} />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: T.red, borderRadius: 12, padding: '10px 16px',
              fontFamily: T.sans, fontSize: 13, marginBottom: 16,
            }}
          >
            <span>⚠</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={fetchQuizzes}
              style={{
                background: '#fee2e2', border: 'none', color: T.red,
                borderRadius: 8, padding: '4px 10px',
                fontFamily: T.crt, fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >RETRY</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skeleton loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && quizzes.length === 0 && <EmptyState onRefresh={fetchQuizzes} />}

      {/* Quiz grid */}
      {!loading && quizzes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {quizzes.map((quiz, i) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              index={i}
              onStart={handleStartQuiz}
              onLeaderboard={fetchLeaderboard}
            />
          ))}
        </div>
      )}

      {showLB && (
        <LeaderboardModal data={leaderboardData} onClose={() => setShowLB(false)} />
      )}
    </Shell>
  );
}

export default ParticipantQuizzes;
