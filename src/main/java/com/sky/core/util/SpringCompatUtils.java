package com.sky.core.util;

import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.mvc.condition.PatternsRequestCondition;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Utility to handle compatibility between varying Spring Boot versions (2.0 - 2.7+).
 * Uses reflection to avoid NoSuchMethodErrors at runtime.
 */
public class SpringCompatUtils {

    /**
     * Safely configures CORS allowing all origins, handling the API shift from allowedOrigins to allowedOriginPatterns.
     */
    public static void configureCorsAllowAll(CorsRegistration registry) {
        try {
            // Spring 5.3+ (Boot 2.4+): allowedOriginPatterns("*")
            Method method = CorsRegistration.class.getMethod("allowedOriginPatterns", String[].class);
            method.invoke(registry, (Object) new String[]{"*"});
        } catch (Exception e) {
            try {
                // Spring 4.2 - 5.2 (Boot 2.0 - 2.3): allowedOrigins("*")
                // Note: In older versions, allowCredentials(true) might conflict with specific allowedOrigins("*") 
                // depending on browser, but server-side it was allowed in older Spring versions.
                Method method = CorsRegistration.class.getMethod("allowedOrigins", String[].class);
                method.invoke(registry, (Object) new String[]{"*"});
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    /**
     * Extracts URL patterns from RequestMappingInfo, compatible with both AntPathMatcher (Legacy) and PathPatternParser (New).
     */
    public static Set<String> getActivePatterns(RequestMappingInfo info) {
        Set<String> patterns = new HashSet<>();

        // 1. Try Legacy: getPatternsCondition() -> getPatterns()
        try {
             PatternsRequestCondition condition = info.getPatternsCondition();
             if (condition != null) {
                 patterns.addAll(condition.getPatterns());
             }
        } catch (Exception e) {
            // Ignore
        }

        // 2. Try New (Spring 5.3+): getPathPatternsCondition() -> getPatterns() -> getPatternString()
        // Use reflection to avoid compile/runtime errors if class is missing on classpath on very old constructs
        try {
            Method getPathPatternsMethod = RequestMappingInfo.class.getMethod("getPathPatternsCondition");
            Object pathPatternsCondition = getPathPatternsMethod.invoke(info);
            
            if (pathPatternsCondition != null) {
                Method getPatternsMethod = pathPatternsCondition.getClass().getMethod("getPatterns");
                Set<?> pathPatterns = (Set<?>) getPatternsMethod.invoke(pathPatternsCondition);
                
                if (pathPatterns != null) {
                    for (Object pathPattern : pathPatterns) {
                         // PathPattern.getPatternString()
                         Method getPatternString = pathPattern.getClass().getMethod("getPatternString");
                         String pattern = (String) getPatternString.invoke(pathPattern);
                         patterns.add(pattern);
                    }
                }
            }
        } catch (NoSuchMethodException e) {
            // Expected on Spring Boot < 2.4
        } catch (Exception e) {
            e.printStackTrace();
        }

        return patterns;
    }
}
