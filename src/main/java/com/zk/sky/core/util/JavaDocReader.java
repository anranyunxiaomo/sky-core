package com.zk.sky.core.util;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * JavaDoc 源码读取器
 * <p>
 * 由于运行时 Reflection 无法获取 Javadoc 注释，
 * 该工具类通过直接读取 .java 源文件来提取类和方法的描述信息。
 * </p>
 */
public class JavaDocReader {

    private static final String SRC_FOLDER = "src/main/java";

    /**
     * 获取指定方法的 Javadoc 描述
     * @param clazz 目标类
     * @param method 目标方法
     * @return 提取到的注释文本，如果未找到或无源码则返回 null
     */
    public static String getMethodDescription(Class<?> clazz, Method method) {
        // 1. Locate Source File
        String packagePath = clazz.getPackage().getName().replace('.', '/');
        String fileName = clazz.getSimpleName() + ".java";
        // 假设源码位于 src/main/java 下 (标准 Maven 结构)
        File sourceFile = new File(SRC_FOLDER + File.separator + packagePath + File.separator + fileName);

        if (!sourceFile.exists()) {
            return null;
        }

        try {
            List<String> lines = Files.readAllLines(sourceFile.toPath());
            
            // 2. Find Method Declaration
            String methodName = method.getName();
            String methodPattern = ".*\\s+" + methodName + "\\s*\\(.*";
            
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                if (line.matches(methodPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
                    return extractCommentBlock(lines, i);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    public static String getClassDescription(Class<?> clazz) {
        String packagePath = clazz.getPackage().getName().replace('.', '/');
        String fileName = clazz.getSimpleName() + ".java";
        File sourceFile = new File(SRC_FOLDER + File.separator + packagePath + File.separator + fileName);

        if (!sourceFile.exists()) return null;

        try {
            List<String> lines = Files.readAllLines(sourceFile.toPath());
            String classPattern = ".*class\\s+" + clazz.getSimpleName() + ".*";
            
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                if (line.matches(classPattern) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
                    return extractCommentBlock(lines, i);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * 逆向提取注释块
     * 从目标行开始向上扫描，寻找 /* ... *\/ 结构
     */
    private static String extractCommentBlock(List<String> lines, int methodLineIdx) {
        // Look backwards from methodLineIdx - 1
        for (int i = methodLineIdx - 1; i >= 0; i--) {
            String line = lines.get(i).trim();
            
            // Skip Annotations (lines starting with @)
            if (line.startsWith("@")) continue;
            
            // If we hit end of comment "*/"
            if (line.endsWith("*/")) {
                StringBuilder comment = new StringBuilder();
                // Read backwards until "/**"
                for (int j = i; j >= 0; j--) {
                    String cLine = lines.get(j).trim();
                    boolean isStart = cLine.startsWith("/**");
                    
                    // Clean content: remove /**, */, *
                    String clean = cLine.replaceAll("^/\\*+|\\*+/$|\\*", "").trim();
                    if (!clean.isEmpty()) {
                        if (comment.length() > 0) comment.insert(0, "\n");
                        comment.insert(0, clean);
                    }
                    
                    if (isStart) {
                        return comment.toString();
                    }
                }
            }
            // If we hit empty line or something else before finding comment, assume no comment
            if (line.isEmpty()) continue;
            
            // If it's not an annotation and not a comment end, break
            return null; 
        }
        return null;
    }
}
