import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Save, PlayCircle, Clock, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  problemId: string;
  allowedLanguages: string[];
  onCodeChange?: (code: string, language: string) => void;
  onSubmit?: (code: string, language: string, type: 'test' | 'final') => void;
  initialCode?: string;
  initialLanguage?: string;
  disabled?: boolean;
  submissionCount?: number;
  maxSubmissions?: number;
}

// Language configurations
const LANGUAGE_CONFIG = {
  cpp: {
    label: 'C++',
    monacoId: 'cpp',
    defaultCode: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}`,
    judge0Id: 54 // C++ (GCC 9.2.0)
  },
  c: {
    label: 'C',
    monacoId: 'c',
    defaultCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Your code here
    
    return 0;
}`,
    judge0Id: 50 // C (GCC 9.2.0)
  },
  java: {
    label: 'Java',
    monacoId: 'java',
    defaultCode: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        // Your code here
        
    }
}`,
    judge0Id: 62 // Java (OpenJDK 13.0.1)
  },
  python: {
    label: 'Python',
    monacoId: 'python',
    defaultCode: `# Your code here

def solution():
    pass

if __name__ == "__main__":
    solution()`,
    judge0Id: 71 // Python (3.8.1)
  },
  javascript: {
    label: 'JavaScript',
    monacoId: 'javascript',
    defaultCode: `// Your code here

function solution() {
    
}

solution();`,
    judge0Id: 63 // JavaScript (Node.js 12.14.0)
  }
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  problemId,
  allowedLanguages,
  onCodeChange,
  onSubmit,
  initialCode = '',
  initialLanguage,
  disabled = false,
  submissionCount = 0,
  maxSubmissions = 10
}) => {
  const editorRef = useRef<any>(null);
  const [language, setLanguage] = useState(() => {
    if (initialLanguage && allowedLanguages.includes(initialLanguage)) {
      return initialLanguage;
    }
    return allowedLanguages[0] || 'cpp';
  });
  
  const [code, setCode] = useState(() => {
    // Try to load from localStorage first
    const savedCode = localStorage.getItem(`test-code-${problemId}-${language}`);
    return savedCode || initialCode || LANGUAGE_CONFIG[language as keyof typeof LANGUAGE_CONFIG]?.defaultCode || '';
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save functionality
  useEffect(() => {
    if (!code.trim()) return;

    setAutoSaveStatus('unsaved');
    const timeoutId = setTimeout(() => {
      setAutoSaveStatus('saving');
      localStorage.setItem(`test-code-${problemId}-${language}`, code);
      setLastSaved(new Date());
      setAutoSaveStatus('saved');
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [code, language, problemId]);

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    // Save current code before switching
    if (code.trim()) {
      localStorage.setItem(`test-code-${problemId}-${language}`, code);
    }

    setLanguage(newLanguage);
    
    // Load saved code for new language or use default
    const savedCode = localStorage.getItem(`test-code-${problemId}-${newLanguage}`);
    const defaultCode = LANGUAGE_CONFIG[newLanguage as keyof typeof LANGUAGE_CONFIG]?.defaultCode || '';
    setCode(savedCode || defaultCode);
  };

  // Handle code change
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange?.(newCode, language);
  };

  // Handle test run
  const handleTestRun = () => {
    if (!code.trim()) return;
    setIsSubmitting(true);
    onSubmit?.(code, language, 'test');
  };

  // Handle final submission
  const handleFinalSubmit = () => {
    if (!code.trim()) return;
    setIsSubmitting(true);
    onSubmit?.(code, language, 'final');
  };

  // Reset submitting state when disabled changes
  useEffect(() => {
    if (!disabled) {
      setIsSubmitting(false);
    }
  }, [disabled]);

  const canSubmit = code.trim() && !disabled && !isSubmitting && submissionCount < maxSubmissions;

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header with language selector and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Select value={language} onValueChange={handleLanguageChange} disabled={disabled}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG]?.label || lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Auto-save status */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Save className="h-4 w-4" />
              <span>
                {autoSaveStatus === 'saving' && 'Saving...'}
                {autoSaveStatus === 'saved' && lastSaved && `Saved ${lastSaved.toLocaleTimeString()}`}
                {autoSaveStatus === 'unsaved' && 'Unsaved changes'}
              </span>
            </div>
          </div>

          {/* Submission counter */}
          <div className="flex items-center gap-2">
            <Badge variant={submissionCount >= maxSubmissions ? "destructive" : "secondary"}>
              {submissionCount}/{maxSubmissions} submissions
            </Badge>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 border rounded-lg overflow-hidden">
          <Editor
            height="100%"
            language={LANGUAGE_CONFIG[language as keyof typeof LANGUAGE_CONFIG]?.monacoId || 'cpp'}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'line',
              contextmenu: false, // Disable right-click context menu
              selectOnLineNumbers: true,
              automaticLayout: true
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestRun}
              disabled={!canSubmit}
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {isSubmitting ? 'Running...' : 'Test Run'}
            </Button>
            
            <Button
              onClick={handleFinalSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Solution'}
            </Button>
          </div>

          {/* Warnings */}
          {submissionCount >= maxSubmissions && (
            <Alert className="w-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Maximum submissions reached
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Keyboard shortcuts info */}
        <div className="mt-2 text-xs text-gray-500">
          <p>Shortcuts: Ctrl+S (Save) • Ctrl+Enter (Test Run) • Ctrl+Shift+Enter (Submit)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeEditor; 