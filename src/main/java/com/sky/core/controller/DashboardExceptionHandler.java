package com.sky.core.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;

/**
 * API 仪表盘全局异常处理器
 * <p>
 * 捕获未处理的异常，根据运行环境返回不同级别的错误信息：
 * <ul>
 *   <li><b>开发环境</b>：返回详细的错误信息、类型和堆栈跟踪</li>
 *   <li><b>生产环境</b>：返回通用错误消息，隐藏敏感信息</li>
 * </ul>
 * 所有异常都会记录到日志中，便于问题排查。
 * </p>
 * 
 * @author Sky Team
 * @since 1.0.0
 */
@ControllerAdvice(basePackages = "com.sky.core")
public class DashboardExceptionHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(DashboardExceptionHandler.class);
    
    /**
     * 当前运行环境（默认为 prod）
     * <p>
     * 从配置文件读取 spring.profiles.active 的值。
     * 如果未配置，默认为生产环境。
     * </p>
     */
    @Value("${spring.profiles.active:prod}")
    private String activeProfile;
    
    /**
     * 处理所有未捕获的异常
     * <p>
     * <b>开发环境（dev）</b>：
     * <pre>
     * {
     *   "error": "Dashboard encountered an error",
     *   "message": "NullPointerException: ...",
     *   "type": "NullPointerException",
     *   "stackTrace": "..."
     * }
     * </pre>
     * </p>
     * 
     * <p>
     * <b>生产环境（prod）</b>：
     * <pre>
     * {
     *   "error": "服务暂时不可用",
     *   "message": "请稍后重试或联系管理员",
     *   "code": "INTERNAL_ERROR"
     * }
     * </pre>
     * </p>
     * 
     * @param e 捕获的异常对象
     * @return 错误信息Map
     */
    @ExceptionHandler(Exception.class)
    @ResponseBody
    public Map<String, String> handleException(Exception e) {
        Map<String, String> error = new HashMap<>();
        
        // 判断当前环境
        boolean isDevelopment = "dev".equalsIgnoreCase(activeProfile) || 
                                "development".equalsIgnoreCase(activeProfile);
        
        if (isDevelopment) {
            // 开发环境：返回详细错误信息
            error.put("error", "Dashboard encountered an error");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Unknown error");
            error.put("type", e.getClass().getSimpleName());
            error.put("stackTrace", getStackTraceAsString(e));
            
            // 开发环境也记录到日志（便于IDE查看）
            logger.error("Dashboard error occurred: {}", e.getMessage(), e);
        } else {
            // 生产环境：返回通用错误信息，隐藏技术细节
            error.put("error", "服务暂时不可用");
            error.put("message", "请稍后重试或联系管理员");
            error.put("code", "INTERNAL_ERROR");
            
            // 生产环境记录完整错误到日志（用于排查问题）
            logger.error("Dashboard error in production - Type: {}, Message: {}", 
                        e.getClass().getSimpleName(), e.getMessage(), e);
        }
        
        return error;
    }
    
    /**
     * 将异常堆栈转换为字符串
     * <p>
     * 用于开发环境返回详细的堆栈信息，便于调试。
     * </p>
     * 
     * @param e 异常对象
     * @return 堆栈跟踪字符串
     */
    private String getStackTraceAsString(Exception e) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }
}
