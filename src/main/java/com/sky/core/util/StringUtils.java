package com.sky.core.util;

/**
 * 字符串工具类
 * <p>
 * 提供常用的字符串处理方法，避免代码重复。
 * 从 ApiDashboardController 中提取的通用工具方法。
 * </p>
 * 
 * @author Sky Team
 * @since 1.0.0
 */
public class StringUtils {
    
    /**
     * 获取非空字符串，如果为 null 或空则返回默认值
     * 
     * @param value 原始值
     * @param defaultValue 默认值
     * @return 非空字符串
     */
    public static String getOrDefault(String value, String defaultValue) {
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
    
    /**
     * 检查字符串是否为 null 或空
     * 
     * @param str 待检查的字符串
     * @return true 如果为 null 或空
     */
    public static boolean isNullOrEmpty(String str) {
        return str == null || str.isEmpty();
    }
    
    /**
     * 清理 JavaDoc 描述，替换特殊字符
     * <p>
     * 主要用于处理从 JavaDoc 中读取的描述信息，确保：
     * <ul>
     *   <li>将管道符 "|" 替换为斜杠 "/" （避免与分隔符冲突）</li>
     *   <li>将换行符替换为空格（保持单行显示）</li>
     * </ul>
     * </p>
     * 
     * @param desc JavaDoc 描述文本
     * @param defaultValue 默认值（当 desc 为 null 时返回）
     * @return 清理后的描述文本
     */
    public static String cleanJavaDocDescription(String desc, String defaultValue) {
        if (desc == null) {
            return defaultValue;
        }
        return desc.replace("|", "/").replace("\n", " ");
    }
    
    /**
     * 格式化参数详情为固定格式
     * <p>
     * 将参数信息格式化为 "name|type|location|description" 的形式，
     * 便于后续解析和展示。
     * </p>
     * 
     * @param name 参数名
     * @param type 参数类型（如 String, Integer 等）
     * @param location 参数位置（Query/Path/Body）
     * @param description 参数描述
     * @return 格式化后的字符串，格式：name|type|location|description
     */
    public static String formatParameterDetail(String name, String type, 
                                               String location, String description) {
        return String.format("%s|%s|%s|%s", name, type, location, description);
    }
}
