package com.sky.core.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.condition.PatternsRequestCondition;
import org.springframework.web.servlet.mvc.condition.RequestMethodsRequestCondition;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.*;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.core.MethodParameter;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Collection;
import java.util.Collections;
import org.springframework.beans.BeanUtils;
import com.sky.core.util.JavaDocReader;

/**
 * API 仪表盘控制器
 * <p>
 * 提供 API 列表展示、调试控制台、日志导出等功能。
 * 该控制器会自动过滤自身的接口，仅展示业务接口。
 * </p>
 */
@Controller
public class ApiDashboardController {

    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;

    private ParameterNameDiscoverer parameterNameDiscoverer = new DefaultParameterNameDiscoverer();
    private ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private org.springframework.core.env.Environment environment;

    /**
     * 获取当前服务的基础 URL (http://ip:port/context)
     */
    private String getBaseUrl() {
        String address = environment.getProperty("server.address");
        if (address == null || address.isEmpty()) {
            try {
                address = java.net.InetAddress.getLocalHost().getHostAddress();
            } catch (Exception e) {
                address = "localhost";
            }
        }
        String port = environment.getProperty("server.port", "8080");
        String contextPath = environment.getProperty("server.servlet.context-path", "");
        return "http://" + address + ":" + port + contextPath;
    }







    /**
     * 渲染仪表盘主页 (SPA Mode)
     * <p>
     * 直接读取 resources/templates/dashboard.html 并作为 String 返回。
     * 避免依赖宿主项目的 ViewResolver 配置。
     * </p>
     */
    @GetMapping(value = "/api-dashboard", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String dashboard() {
        try {
            ClassPathResource resource = new ClassPathResource("templates/dashboard.html");
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            e.printStackTrace();
            return "<h1>Error loading dashboard template</h1><pre>" + e.getMessage() + "</pre>";
        }
    }

    /**
     * 获取仪表盘元数据 (JSON)
     * <p>
     * 前端通过 AJAX 请求此接口来渲染左侧 API 列表。
     * </p>
     */
    @GetMapping("/api-dashboard/meta")
    @ResponseBody
    public Map<String, Object> dashboardMeta() {
        Map<String, Object> meta = new HashMap<>();
        meta.put("baseUrl", getBaseUrl());
        
        // Map<ControllerName, List<EndpointConf>>
        Map<String, List<Map<String, String>>> controllerGroups = new TreeMap<>();


        Map<RequestMappingInfo, HandlerMethod> handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo mappingInfo = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();
            
            // Filter out the Dashboard Controller itself
            if (handlerMethod.getBeanType().equals(ApiDashboardController.class)) {
                continue;
            }

            // Smart Protocol Detection & Param Extraction
            boolean isJson = false;
            List<String> paramNames = new ArrayList<>();
            String bodyTemplate = "";
            
            for (MethodParameter param : handlerMethod.getMethodParameters()) {
                param.initParameterNameDiscovery(parameterNameDiscoverer);
                if (param.hasParameterAnnotation(RequestBody.class)) {
                    isJson = true;
                    Class<?> paramType = param.getParameterType();
                    // Check if simple type
                    // Check if simple type
                    if (BeanUtils.isSimpleValueType(paramType) || paramType.getName().startsWith("java.lang")) {
                         String typeName = paramType.getSimpleName();
                         paramNames.add("BODY:" + typeName); 
                    } else {
                         // Entity Class - Recursive reflection
                         try {
                             Object template = generateTemplate(paramType, 0);
                             bodyTemplate = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(template);
                         } catch (Exception e) {
                             e.printStackTrace();
                             paramNames.add("BODY:ComplexType");
                         }
                    }
                }
                if (param.hasParameterAnnotation(RequestParam.class)) {
                    RequestParam rp = param.getParameterAnnotation(RequestParam.class);
                    String name = (rp.name() != null && !rp.name().isEmpty()) ? rp.name() : param.getParameterName();
                    if (name != null) paramNames.add(name);
                }
            }
            String paramType = isJson ? "JSON" : "FORM";

            Set<String> patterns = com.sky.core.util.SpringCompatUtils.getActivePatterns(mappingInfo);

            RequestMethodsRequestCondition methodsCondition = mappingInfo.getMethodsCondition();
            Set<RequestMethod> methods = (methodsCondition != null) ? methodsCondition.getMethods() : Collections.emptySet();

            for (String pattern : patterns) {
                // Skip dashboard itself, error endpoints, and internal views
                if (pattern.equals("/error")) continue;
                if (pattern.equals("/api-dashboard") || pattern.equals("/api-dashboard/debugger") || pattern.equals("/api-dashboard/meta")) continue;

                Map<String, String> endpoint = new HashMap<>();
                endpoint.put("url", getBaseUrl() + pattern);
                endpoint.put("path", pattern); // Raw path for filtering
                endpoint.put("method", methods.isEmpty() ? "ALL" : methods.toString());
                
                String controllerSimpleName = handlerMethod.getBeanType().getSimpleName();
                String controllerDesc = JavaDocReader.getClassDescription(handlerMethod.getBeanType());
                // Use Desc if available, otherwise SimpleName
                String controllerInternalName = controllerSimpleName; 
                String displayGroupName = (controllerDesc != null && !controllerDesc.isEmpty()) ? controllerDesc : controllerSimpleName;

                endpoint.put("bean", controllerSimpleName);
                endpoint.put("function", handlerMethod.getMethod().getName());
                endpoint.put("paramType", paramType);
                endpoint.put("params", String.join(",", paramNames));
                endpoint.put("bodyTemplate", bodyTemplate);
                
                // Description Priority: JavaDoc
                String desc = "";
                // Try to read from Source Code JavaDoc
                String doc = JavaDocReader.getMethodDescription(handlerMethod.getBeanType(), handlerMethod.getMethod());
                if (doc != null) desc = doc;
                endpoint.put("description", desc);

                controllerGroups.computeIfAbsent(displayGroupName, k -> new ArrayList<>()).add(endpoint);
            }
        }
        
        // Sort inside groups
        controllerGroups.forEach((k, v) -> v.sort(Comparator.comparing(m -> m.get("url"))));

        meta.put("controllerGroups", controllerGroups);
        return meta;
    }



    private Object generateTemplate(Type type, int depth) {
        if (depth > 5) {
            return "Recursion Limit Reached";
        }

        Class<?> rawClass = null;
        if (type instanceof Class) {
            rawClass = (Class<?>) type;
        } else if (type instanceof ParameterizedType) {
            rawClass = (Class<?>) ((ParameterizedType) type).getRawType();
        }

        if (rawClass == null) return null;

        if (BeanUtils.isSimpleValueType(rawClass) || rawClass.getName().startsWith("java.lang")) {
            if (Number.class.isAssignableFrom(rawClass) || rawClass == int.class || rawClass == long.class || rawClass == double.class) return 0;
            if (rawClass == Boolean.class || rawClass == boolean.class) return false;
            return "请填写 " + rawClass.getSimpleName();
        }

        if (Collection.class.isAssignableFrom(rawClass)) {
            if (type instanceof ParameterizedType) {
                Type genericType = ((ParameterizedType) type).getActualTypeArguments()[0];
                return Collections.singletonList(generateTemplate(genericType, depth + 1));
            }
            return Collections.emptyList();
        }

        if (Map.class.isAssignableFrom(rawClass)) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("demoKey", "demoValue");
            return map;
        }
        
        if (rawClass.isArray()) {
            return Collections.singletonList(generateTemplate(rawClass.getComponentType(), depth + 1));
        }

        // Complex Object
        Map<String, Object> map = new LinkedHashMap<>();
        for (Field field : rawClass.getDeclaredFields()) {
            map.put(field.getName(), generateTemplate(field.getGenericType(), depth + 1));
        }
        return map;
    }
}
