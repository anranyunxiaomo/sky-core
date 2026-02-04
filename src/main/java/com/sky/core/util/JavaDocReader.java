package com.sky.core.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.LoggerFactory;

/**
 * JavaDoc 源码读取器 (Zero-Dependency)
 * <p>
 * 策略：
 * 1. 优先尝试读取本地源码文件 (Dev 环境)
 * 2. 降级尝试读取 Classpath 中的源码资源 (Prod 环境，需用户打包源码)
 * </p>
 */
public class JavaDocReader {

    private static final String SRC_FOLDER = "src/main/java";
    private static final java.util.Map<Class<?>, List<String>> CACHE = new java.util.concurrent.ConcurrentHashMap<>();
    
    // ✅ 性能优化：预编译参数正则表达式
    private static final java.util.regex.Pattern PARAM_PATTERN = java.util.regex.Pattern.compile("@param\\s+(\\w+)\\s+(.*)");

    public static String getMethodDescription(Class<?> clazz, Method method) {
        List<String> lines = readSourceLines(clazz);
        if (lines == null || lines.isEmpty()) return null;

        String methodName = method.getName();
        // Simple regex to match method declaration
        String methodPattern = ".*\\s+" + methodName + "\\s*\\(.*";

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.matches(methodPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
                return extractCommentBlock(lines, i, false);
            }
        }
        return null;
    }

    public static String getParamDescription(Class<?> clazz, Method method, String paramName) {
        List<String> lines = readSourceLines(clazz);
        if (lines == null || lines.isEmpty()) return null;

        String methodName = method.getName();
        String methodPattern = ".*\\s+" + methodName + "\\s*\\(.*";

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.matches(methodPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
                String fullComment = extractCommentBlock(lines, i, true);
                if (fullComment == null) return null;
                // Parse @param paramName description
                // ✅ 使用预编译的正则表达式
                java.util.regex.Matcher m = PARAM_PATTERN.matcher(fullComment);
                if (m.find()) {
                    return m.group(1).trim();
                }
            }
        }
        return null;
    }

    public static String getFieldDescription(Class<?> clazz, String fieldName) {
        List<String> lines = readSourceLines(clazz);
        if (lines == null || lines.isEmpty()) return null;

        // Pattern: Type fieldName = or Type fieldName;
        // Simplified check: whitespace + fieldName + whitespace/semicolon/=
        String fieldPattern = ".*\\s+" + fieldName + "\\s*[=;].*";

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            // Ensure it's a field declaration (rudimentary check)
            if (line.matches(fieldPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.trim().startsWith("return")) {
                return extractCommentBlock(lines, i, false);
            }
        }
        return null;
    }

    public static String getClassDescription(Class<?> clazz) {
        List<String> lines = readSourceLines(clazz);
        if (lines == null || lines.isEmpty()) return null;

        String classPattern = ".*class\\s+" + clazz.getSimpleName() + ".*";

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.matches(classPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
                return extractCommentBlock(lines, i, false);
            }
        }
        return null;
    }

    /**
     * 核心读取逻辑：双模式支持
     */
    private static List<String> readSourceLines(Class<?> clazz) {
        // 使用 computeIfAbsent 保证线程安全（避免 Check-Then-Act 竞争条件）
        return CACHE.computeIfAbsent(clazz, k -> loadSourceLines(k));
    }
    
    /**
     * 实际加载源码的逻辑
     */
    private static List<String> loadSourceLines(Class<?> clazz) {

        String packagePath = clazz.getPackage().getName().replace('.', '/');
        String fileName = clazz.getSimpleName() + ".java";
        String relativePath = packagePath + "/" + fileName;

        List<String> lines = null;

        // 1. Try Local File System (Dev Mode)
        File sourceFile = new File(SRC_FOLDER + File.separator + relativePath);
        if (sourceFile.exists()) {
            try {
                lines = Files.readAllLines(sourceFile.toPath(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                // Ignore, try classpath
            }
        }

        // 2. Try Classpath Resource (Prod Mode - Requires source packaging)
        if (lines == null) {
            try (InputStream is = clazz.getResourceAsStream("/" + relativePath)) {
                if (is != null) {
                    lines = new ArrayList<>();
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            lines.add(line);
                        }
                    }
                }
                } catch (IOException e) {
                    LoggerFactory.getLogger(JavaDocReader.class).warn("Failed to load source for class {}", clazz.getName(), e);
                }
        }
        
        // 返回结果，如果为 null 则返回空列表（更安全）
        return lines != null ? lines : java.util.Collections.emptyList();
    }

    private static String extractCommentBlock(List<String> lines, int methodLineIdx, boolean includeTags) {
        for (int i = methodLineIdx - 1; i >= 0; i--) {
            String line = lines.get(i).trim();
            if (line.startsWith("@")) continue;
            if (line.endsWith("*/")) {
                StringBuilder comment = new StringBuilder();
                for (int j = i; j >= 0; j--) {
                    String cLine = lines.get(j).trim();
                    boolean isStart = cLine.startsWith("/**");
                    String clean = cLine.replaceAll("^/\\*+|\\*+/$|\\*", "").trim();
                    // Strip HTML tags (e.g. <p>, <b>) for clean UI
                    clean = clean.replaceAll("<[^>]+>", ""); 
                    
                    if (!includeTags && clean.startsWith("@")) {
                        if (isStart) return comment.toString();
                        continue;
                    }

                    if (!clean.isEmpty()) {
                        if (comment.length() > 0) comment.insert(0, "\n");
                        comment.insert(0, clean);
                    }
                    if (isStart) return comment.toString();
                }
            }
            if (line.isEmpty()) continue;
            return null;
        }
        return null;
    }
}
