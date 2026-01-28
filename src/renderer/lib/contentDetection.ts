// Auto-detect content type from text
export type ContentType = 
  | "sql" 
  | "json" 
  | "url" 
  | "bash" 
  | "code" 
  | "email"
  | "path"
  | "text";

export interface ContentInfo {
  type: ContentType;
  label: string;
  color: string;
  icon: string;
}

export const contentTypes: Record<ContentType, Omit<ContentInfo, "type">> = {
  sql: { label: "SQL", color: "#60A5FA", icon: "database" },
  json: { label: "JSON", color: "#34D399", icon: "braces" },
  url: { label: "URL", color: "#A78BFA", icon: "link" },
  bash: { label: "Shell", color: "#F472B6", icon: "terminal" },
  code: { label: "Code", color: "#FBBF24", icon: "code" },
  email: { label: "Email", color: "#FB923C", icon: "mail" },
  path: { label: "Path", color: "#2DD4BF", icon: "folder" },
  text: { label: "Text", color: "#94A3B8", icon: "text" },
};

export function detectContentType(content: string): ContentInfo {
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();
  
  // JSON detection
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed);
      return { type: "json", ...contentTypes.json };
    } catch {}
  }
  
  // URL detection
  if (/^https?:\/\//.test(trimmed) || /^www\./.test(lower)) {
    return { type: "url", ...contentTypes.url };
  }
  
  // Email detection
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: "email", ...contentTypes.email };
  }
  
  // File path detection
  if (/^(\/|~\/|\.\/|\.\.\/)/.test(trimmed) || /^[A-Z]:\\/.test(trimmed)) {
    return { type: "path", ...contentTypes.path };
  }
  
  // SQL detection
  const sqlKeywords = ["select", "insert", "update", "delete", "create", "alter", "drop", "from", "where", "join"];
  const sqlScore = sqlKeywords.filter(kw => lower.includes(kw)).length;
  if (sqlScore >= 2 || /^(select|insert|update|delete|create)\s/i.test(trimmed)) {
    return { type: "sql", ...contentTypes.sql };
  }
  
  // Bash/Shell detection
  const bashPatterns = [
    /^(sudo|npm|yarn|pnpm|git|docker|kubectl|curl|wget|cd|ls|cat|grep|awk|sed|chmod|chown)\s/,
    /\|\s*(grep|awk|sed|xargs)/,
    /^\$\s/,
    /^#!\/bin\/(bash|sh|zsh)/,
  ];
  if (bashPatterns.some(p => p.test(trimmed))) {
    return { type: "bash", ...contentTypes.bash };
  }
  
  // Generic code detection
  const codePatterns = [
    /^(function|const|let|var|class|import|export|def|async|await)\s/,
    /[{}\[\]();]\s*$/,
    /=>/,
    /\(\)\s*{/,
  ];
  if (codePatterns.some(p => p.test(trimmed))) {
    return { type: "code", ...contentTypes.code };
  }
  
  return { type: "text", ...contentTypes.text };
}

export function getContentStats(content: string) {
  const chars = content.length;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const lines = content.split("\n").length;
  
  return { chars, words, lines };
}

export function formatJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}
