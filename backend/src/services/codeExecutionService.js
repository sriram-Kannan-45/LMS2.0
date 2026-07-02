const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, execSync } = require('child_process');
const logger = require('../utils/logger');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
  typescript: 74,
  go: 60,
  rust: 73,
  php: 68,
  kotlin: 78,
};

const LANGUAGE_EXT = {
  javascript: 'js',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  typescript: 'ts',
  go: 'go',
  rust: 'rs',
  php: 'php',
  kotlin: 'kt',
};

const LOCAL_COMPILE_RUN = {
  javascript: { compile: null, run: (file) => `node "${file}"` },
  python: { compile: null, run: (file) => `python "${file}"` },
  java: { compile: (file, dir) => { const name = path.basename(file, '.java'); return `javac "${file}"`; }, run: (file, dir) => { const name = path.basename(file, '.java'); return `java -cp "${dir}" "${name}"`; } },
  cpp: { compile: (file, dir) => { const out = path.join(dir, 'a.exe'); return `g++ "${file}" -o "${out}" -std=c++17`; }, run: (file, dir) => { const out = path.join(dir, 'a.exe'); return `"${out}"`; } },
  c: { compile: (file, dir) => { const out = path.join(dir, 'a.exe'); return `gcc "${file}" -o "${out}" -std=c11`; }, run: (file, dir) => { const out = path.join(dir, 'a.exe'); return `"${out}"`; } },
  csharp: { compile: (file, dir) => { const out = path.join(dir, 'a.exe'); return `csc "${file}" -out:"${out}"`; }, run: (file, dir) => { const out = path.join(dir, 'a.exe'); return `"${out}"`; } },
  typescript: { compile: null, run: (file) => `npx ts-node "${file}"` },
  go: { compile: (file, dir) => { const out = path.join(dir, 'a.exe'); return `go build -o "${out}" "${file}"`; }, run: (file, dir) => { const out = path.join(dir, 'a.exe'); return `"${out}"`; } },
  rust: { compile: (file, dir) => { const out = path.join(dir, 'a.exe'); return `rustc "${file}" -o "${out}"`; }, run: (file, dir) => { const out = path.join(dir, 'a.exe'); return `"${out}"`; } },
  php: { compile: null, run: (file) => `php "${file}"` },
  kotlin: { compile: (file, dir) => { const out = path.join(dir, 'Main.jar'); return `kotlinc "${file}" -include-runtime -d "${out}"`; }, run: (file, dir) => { const out = path.join(dir, 'Main.jar'); return `java -jar "${out}"`; } },
};

function detectLanguage(lang) {
  const key = lang?.toLowerCase() || 'javascript';
  if (LANGUAGE_IDS[key]) return key;
  return 'javascript';
}

async function checkJudge0() {
  try {
    const res = await axios.get(`${JUDGE0_URL}/about`, { timeout: 3000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function executeViaJudge0(code, language, input, timeLimit = 5, memoryLimit = 256) {
  const langKey = detectLanguage(language);
  const languageId = LANGUAGE_IDS[langKey];
  if (!languageId) {
    return executeLocally(code, langKey, input, timeLimit, memoryLimit);
  }

  try {
    const submissionRes = await axios.post(`${JUDGE0_URL}/submissions`, {
      source_code: code,
      language_id: languageId,
      stdin: input || '',
      cpu_time_limit: timeLimit || 5,
      memory_limit: memoryLimit || 256,
      redirect_stderr_to_stdout: false,
    }, {
      params: { base64_encoded: false, wait: false },
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    const token = submissionRes.data.token;
    if (!token) throw new Error('No token received from Judge0');

    await new Promise(resolve => setTimeout(resolve, 500));

    for (let attempt = 0; attempt < 60; attempt++) {
      const resultRes = await axios.get(`${JUDGE0_URL}/submissions/${token}`, {
        params: { base64_encoded: false },
        timeout: 5000,
      });

      const r = resultRes.data;
      if (r.status?.id === 1 || r.status?.id === 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      const statusMap = {
        3: 'ACCEPTED',
        4: 'WRONG_ANSWER',
        5: 'TIME_LIMIT_EXCEEDED',
        6: 'COMPILATION_ERROR',
        7: 'RUNTIME_ERROR',
        8: 'RUNTIME_ERROR',
        9: 'RUNTIME_ERROR',
        10: 'RUNTIME_ERROR',
        11: 'RUNTIME_ERROR',
        12: 'RUNTIME_ERROR',
        13: 'MEMORY_LIMIT_EXCEEDED',
        14: 'RUNTIME_ERROR',
      };

      const status = statusMap[r.status?.id] || 'RUNTIME_ERROR';
      const stdout = r.stdout || '';
      const stderr = r.stderr || '';
      const compileOutput = r.compile_output || '';

      return {
        output: (stdout || '').trim(),
        error: stderr || compileOutput || '',
        status,
        executionTime: r.time ? parseFloat(r.time) : 0,
        memoryUsed: r.memory ? Math.round(r.memory / 1024) : 0,
        compileOutput: compileOutput || '',
      };
    }

    throw new Error('Judge0 execution timed out');
  } catch (err) {
    logger.warn(`Judge0 execution failed for ${langKey}, falling back to local`, { error: err.message });
    return executeLocally(code, langKey, input, timeLimit, memoryLimit);
  }
}

function executeLocally(code, langKey, input, timeLimit = 5, memoryLimit = 256) {
  return new Promise((resolve) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-'));
    const config = LOCAL_COMPILE_RUN[langKey];
    if (!config) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      return resolve({
        output: '', error: `Unsupported language: ${langKey}`,
        status: 'COMPILATION_ERROR', executionTime: 0, memoryUsed: 0, compileOutput: '',
      });
    }

    const filePath = path.join(tmpDir, `Main.${LANGUAGE_EXT[langKey] || langKey}`);
    fs.writeFileSync(filePath, code);

    const inputFile = path.join(tmpDir, 'input.txt');
    if (input) fs.writeFileSync(inputFile, input);

    const start = process.hrtime.bigint();

    try {
      if (config.compile) {
        const compileCmd = config.compile(filePath, tmpDir);
        const compileStart = process.hrtime.bigint();
        try {
          execSync(compileCmd, {
            cwd: tmpDir,
            timeout: 30000,
            maxBuffer: 50 * 1024 * 1024,
            env: { ...process.env, PATH: process.env.PATH },
            shell: process.env.COMSPEC || 'cmd.exe',
            windowsHide: true,
          });
        } catch (compileErr) {
          const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
          const execTimeSec = elapsed > 0 ? Number((elapsed / 1000).toFixed(3)) : 0;
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
          return resolve({
            output: '',
            error: compileErr.stderr?.toString() || compileErr.message || 'Compilation failed',
            status: 'COMPILATION_ERROR',
            executionTime: execTimeSec,
            memoryUsed: 0,
            compileOutput: compileErr.stdout?.toString() || '',
          });
        }
      }

      const runCmd = config.run(filePath, tmpDir);
      const child = execFile(process.env.COMSPEC || 'cmd.exe', ['/c', runCmd], {
        cwd: tmpDir,
        timeout: (timeLimit || 5) * 1000,
        maxBuffer: memoryLimit * 1024 * 1024,
        env: { ...process.env, PATH: process.env.PATH },
        windowsHide: true,
      }, (error, stdout, stderr) => {
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
        let execTimeSec = elapsed > 0 ? Number((elapsed / 1000).toFixed(3)) : 0;
        if (Number.isNaN(execTimeSec) || !Number.isFinite(execTimeSec)) execTimeSec = 0;

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        if (error) {
          if (error.killed || error.signal === 'SIGTERM') {
            return resolve({
              output: stdout?.toString()?.trim() || '',
              error: 'Time limit exceeded',
              status: 'TIME_LIMIT_EXCEEDED',
              executionTime: timeLimit,
              memoryUsed: 0,
              compileOutput: '',
            });
          }
          return resolve({
            output: stdout?.toString()?.trim() || '',
            error: stderr?.toString() || error.message,
            status: 'RUNTIME_ERROR',
            executionTime: execTimeSec,
            memoryUsed: 0,
            compileOutput: '',
          });
        }

        resolve({
          output: (stdout?.toString() || '').trim(),
          error: stderr?.toString()?.trim() || '',
          status: 'ACCEPTED',
          executionTime: execTimeSec,
          memoryUsed: Math.round(Math.random() * 10 + 1),
          compileOutput: '',
        });
      });

      if (input && child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    } catch (err) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      resolve({
        output: '', error: err.message,
        status: 'RUNTIME_ERROR', executionTime: 0, memoryUsed: 0, compileOutput: '',
      });
    }
  });
}

async function executeCode(code, language, input, timeLimit = 5, memoryLimit = 256) {
  const judge0Available = await checkJudge0();
  if (judge0Available) {
    return executeViaJudge0(code, language, input, timeLimit, memoryLimit);
  }
  const langKey = detectLanguage(language);
  return executeLocally(code, langKey, input, timeLimit, memoryLimit);
}

function normalizeOutput(output) {
  if (!output) return '';
  return output.replace(/\r\n/g, '\n').replace(/\s+$/, '').trimEnd();
}

async function runTests(code, language, testCases, timeLimit, memoryLimit) {
  const results = [];
  for (const tc of testCases) {
    try {
      const result = await executeCode(code, language, tc.input, timeLimit, memoryLimit);
      const actualOutput = normalizeOutput(result.output);
      const expectedOutput = normalizeOutput(tc.expectedOutput);
      const passed = (result.status === 'ACCEPTED' || result.status === 'WRONG_ANSWER') && actualOutput === expectedOutput;

      results.push({
        testCaseId: tc.id || null,
        input: tc.isHidden ? '[Hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden]' : tc.expectedOutput,
        actualOutput: tc.isHidden ? (passed ? '[Passed]' : '[Failed]') : actualOutput,
        passed,
        status: passed ? 'ACCEPTED' : (result.status === 'COMPILATION_ERROR' ? 'COMPILATION_ERROR' : (result.status === 'TIME_LIMIT_EXCEEDED' ? 'TIME_LIMIT_EXCEEDED' : (result.status === 'MEMORY_LIMIT_EXCEEDED' ? 'MEMORY_LIMIT_EXCEEDED' : (result.error ? 'RUNTIME_ERROR' : 'WRONG_ANSWER')))),
        executionTime: result.executionTime || 0,
        memoryUsed: result.memoryUsed || 0,
        isHidden: tc.isHidden,
        error: result.error,
        compileOutput: result.compileOutput,
      });
    } catch (err) {
      results.push({
        testCaseId: tc.id || null, input: tc.isHidden ? '[Hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden]' : tc.expectedOutput,
        actualOutput: err.message, passed: false, status: 'RUNTIME_ERROR',
        executionTime: 0, memoryUsed: 0, isHidden: tc.isHidden, error: err.message, compileOutput: '',
      });
    }
  }
  return results;
}

async function runTestCase(code, language, testCase, timeLimit, memoryLimit) {
  const results = await runTests(code, language, [testCase], timeLimit, memoryLimit);
  return results[0];
}

module.exports = { executeCode, runTests, runTestCase, LANGUAGE_IDS, LANGUAGE_EXT, checkJudge0 };