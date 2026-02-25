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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.core.MethodParameter;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.lang.reflect.Modifier;
import java.util.Collection;
import java.util.Collections;
import org.springframework.beans.BeanUtils;
import com.sky.core.util.JavaDocReader;
import com.sky.core.util.SpringCompatUtils;
import static com.sky.core.util.StringUtils.*;

/**
 * API 仪表盘控制器
 * <p>
 * 提供 API 列表展示、调试控制台、日志导出等功能。
 * 该控制器会自动过滤自身的接口，仅展示业务接口。
 * </p>
 */
@Controller
public class ApiDashboardController {

    // --- 常量定义 ---
    private static final int MAX_RECURSION_DEPTH = 3;
    // ✅ 性能优化：根据实际使用调整容量（从2048增加到4096，减少扩容次数）
    private static final int MARKDOWN_BUILDER_CAPACITY = 4096;
    private static final int LOGO_WIDTH_PX = 120;
    private static final String LOGO_RESOURCE_PATH = "static/logo.jpg";
    
    // 仪表盘路径集合（用于过滤）
    private static final java.util.Set<String> DASHBOARD_PATHS = java.util.Collections.unmodifiableSet(
        new java.util.HashSet<>(java.util.Arrays.asList(
            "/error",
            "/api-dashboard",
            "/api-dashboard/debugger",
            "/api-dashboard/meta",
            "/api-dashboard/export-md"
        ))
    );
    
    // --- 静态资源缓存 ---
    private static final String LOGO_BASE64;
    
    static {
        // 启动时加载 Logo 并缓存（避免每次导出都重新编码）
        String tempLogo = null;
        try {
            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource(LOGO_RESOURCE_PATH);
            byte[] bytes = org.springframework.util.StreamUtils.copyToByteArray(resource.getInputStream());
            tempLogo = java.util.Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            // Logo 是可选的，加载失败不影响核心功能
        }
        LOGO_BASE64 = tempLogo;
    }
    
    // --- 缓存 ---
    private volatile Map<String, Object> cachedMetadata = null;
    
    // --- 环境配置 ---
    /**
     * 当前运行环境（默认为 prod）
     * <p>
     * 开发环境（dev）会禁用缓存，确保接口变更立即生效。
     * </p>
     */
    @org.springframework.beans.factory.annotation.Value("${spring.profiles.active:prod}")
    private String activeProfile;
    
    // --- 依赖注入 ---
    @Autowired
    private RequestMappingHandlerMapping requestMappingHandlerMapping;

    private final ParameterNameDiscoverer parameterNameDiscoverer = new DefaultParameterNameDiscoverer();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // ===== 以下工具方法已移至 com.sky.core.util.StringUtils =====
    // getOrDefault(), isNullOrEmpty(), cleanJavaDocDescription(), formatParameterDetail()
    // 通过静态导入直接使用
    
    /**
     * 参数信息封装类
     * <p>
     * 用于封装方法参数解析的结果，包括参数名列表、详细参数信息、
     * 请求体模板和请求类型（JSON/FORM）。
     * </p>
     * 
     * @since 1.0
     */
    private static class ParameterInfo {
        /** 参数名称列表，用于 URL 显示 */
        List<String> paramNames = new ArrayList<>();
        
        /** 详细参数信息列表，格式："name|type|location|description" */
        List<String> detailedParams = new ArrayList<>();
        
        /** 请求体 JSON 模板（如果有 @RequestBody） */
        String bodyTemplate = "";
        
        /** 是否为 JSON 请求（true=JSON, false=FORM） */
        boolean isJson = false;
    }
    
    /**
     * 解析方法参数信息（提取的核心逻辑）
     * <p>
     * 统一处理参数解析，支持以下注解：
     * <ul>
     *   <li>@RequestBody - 请求体参数，生成 JSON 模板</li>
     *   <li>@RequestParam - 查询参数</li>
     *   <li>@PathVariable - 路径变量</li>
     *   <li>无注解 - 默认作为查询参数处理</li>
     * </ul>
     * </p>
     * 
     * <p><b>处理逻辑</b>：
     * <ol>
     *   <li>遍历所有方法参数</li>
     *   <li>提取参数名、类型、JavaDoc 描述</li>
     *   <li>根据注解类型分类处理</li>
     *   <li>对复杂类型生成 JSON 模板</li>
     * </ol>
     * </p>
     * 
     * @param handlerMethod Spring MVC 处理方法对象
     * @return ParameterInfo 参数信息封装对象
     * @see ParameterInfo
     */
    private ParameterInfo parseMethodParameters(org.springframework.web.method.HandlerMethod handlerMethod) {
        ParameterInfo info = new ParameterInfo();
        
        for (org.springframework.core.MethodParameter param : handlerMethod.getMethodParameters()) {
            param.initParameterNameDiscovery(parameterNameDiscoverer);
            String pName = param.getParameterName();
            String pType = param.getParameterType().getSimpleName();
            String pDesc = cleanJavaDocDescription(
                JavaDocReader.getParamDescription(handlerMethod.getBeanType(), handlerMethod.getMethod(), pName),
                "无描述"
            );

            if (param.hasParameterAnnotation(org.springframework.web.bind.annotation.RequestBody.class)) {
                info.isJson = true;
                Class<?> paramType = param.getParameterType();
                if (org.springframework.beans.BeanUtils.isSimpleValueType(paramType) || paramType.getName().startsWith("java.lang")) {
                    info.paramNames.add("BODY:" + pType);
                    info.detailedParams.add(formatParameterDetail("Body", pType, "Body", "请求体"));
                } else {
                    try {
                        Object template = generateTemplate(paramType, 0);
                        info.bodyTemplate = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(template);
                        info.detailedParams.add(formatParameterDetail("Body", pType, "Body", "JSON 结构体"));
                    } catch (Exception e) {
                        info.paramNames.add("BODY:ComplexType");
                    }
                }
            } else if (param.hasParameterAnnotation(org.springframework.web.bind.annotation.RequestParam.class)) {
                org.springframework.web.bind.annotation.RequestParam rp = param.getParameterAnnotation(org.springframework.web.bind.annotation.RequestParam.class);
                String name = getOrDefault(rp.name(), pName);
                if (name != null) {
                    info.paramNames.add(name);
                    info.detailedParams.add(formatParameterDetail(name, pType, "Query", pDesc));
                }
            } else if (param.hasParameterAnnotation(org.springframework.web.bind.annotation.PathVariable.class)) {
                org.springframework.web.bind.annotation.PathVariable pv = param.getParameterAnnotation(org.springframework.web.bind.annotation.PathVariable.class);
                String name = getOrDefault(pv.name(), pName);
                if (name != null) {
                    info.paramNames.add("PATH:" + name);
                    info.detailedParams.add(formatParameterDetail(name, pType, "Path", pDesc));
                }
            } else {
                if (org.springframework.beans.BeanUtils.isSimpleValueType(param.getParameterType()) || param.getParameterType().getName().startsWith("java.lang")) {
                    if (pName != null) {
                        info.detailedParams.add(formatParameterDetail(pName, pType, "Query", pDesc));
                    }
                }
            }
        }
        
        return info;
    }

    /**
     * 获取当前服务的基础 URL (支持 Docker/Nginx 反向代理)
     */
    /**
     * 获取当前服务的基础 URL (相对路径模式)
     * <p>
     * 仅返回 Context Path (如 "/api" 或 "")，不包含 Scheme/Host/Port。
     * 这使得前端可以使用相对路径发起请求，完美适配 Nginx 反向代理和 Docker 内部网络。
     * </p>
     */
    private String getBaseUrl(javax.servlet.http.HttpServletRequest request) {
        String contextPath = request.getContextPath();
        return contextPath == null ? "" : contextPath;
    }







    /**
     * 渲染仪表盘主页 (Thymeleaf Mode)
     */
    @GetMapping("/api-dashboard")
    public String dashboard(javax.servlet.http.HttpServletRequest request, org.springframework.ui.Model model) {
        model.addAttribute("baseUrl", getBaseUrl(request));
        return "dashboard"; 
    }

    /**
     * 获取仪表盘元数据 (JSON)
     * <p>
     * 前端通过 AJAX 请求此接口来渲染左侧 API 列表。
     * <b>缓存策略</b>：
     * <ul>
     *   <li>开发环境（dev）：禁用缓存，接口变更立即生效</li>
     *   <li>生产环境（prod）：使用缓存，提升性能</li>
     * </ul>
     * </p>
     * 
     * @param request HTTP请求对象
     * @return API元数据Map
     */
    @GetMapping("/api-dashboard/meta")
    @ResponseBody
    public Map<String, Object> dashboardMeta(javax.servlet.http.HttpServletRequest request) {
        boolean isDevelopment = "dev".equalsIgnoreCase(activeProfile) || 
                                "development".equalsIgnoreCase(activeProfile);
        
        // 开发环境禁用缓存，或缓存为空时重新生成
        if (isDevelopment || cachedMetadata == null) {
            Map<String, Object> meta = generateMetadata(request);
            if (!isDevelopment) {
                // 仅生产环境缓存
                cachedMetadata = meta;
            }
            return meta;
        }
        
        // 生产环境使用缓存，动态更新 baseUrl（支持不同域名访问）
        Map<String, Object> result = new HashMap<>(cachedMetadata);
        result.put("baseUrl", getBaseUrl(request));
        return result;
    }
    
    /**
     * 手动刷新元数据缓存
     * <p>
     * 用于生产环境手动清除缓存，使新增的接口立即生效。
     * 开发环境无需调用此接口（已自动禁用缓存）。
     * </p>
     * 
     * <h3>使用场景：</h3>
     * <ul>
     *   <li>运行时新增了 Controller 或接口</li>
     *   <li>接口描述（JavaDoc）发生变化</li>
     *   <li>需要强制刷新接口列表</li>
     * </ul>
     * 
     * @return 刷新结果信息
     */
    @GetMapping("/api-dashboard/refresh-cache")
    @ResponseBody
    public Map<String, String> refreshCache() {
        cachedMetadata = null;
        Map<String, String> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "缓存已清除");
        result.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return result;
    }
    
    /**
     * 生成 API 元数据（核心逻辑）
     */
    private Map<String, Object> generateMetadata(javax.servlet.http.HttpServletRequest request) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("baseUrl", getBaseUrl(request));
        
        // Map<ControllerName, List<EndpointConf>>
        Map<String, List<Map<String, String>>> controllerGroups = new TreeMap<>();


        Map<RequestMappingInfo, HandlerMethod> handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo mappingInfo = entry.getKey();
            HandlerMethod handlerMethod = entry.getValue();
            
            // 过滤掉仪表盘控制器自身
            if (handlerMethod.getBeanType().equals(ApiDashboardController.class)) {
                continue;
            }

            // 解析参数信息（提取的方法）
            ParameterInfo paramInfo = parseMethodParameters(handlerMethod);
            String paramType = paramInfo.isJson ? "JSON" : "FORM";

            // 返回类型分析
            String responseBodyTemplate = "";
            String returnTypeSimpleName = "void";
            try {
                Class<?> returnType = handlerMethod.getReturnType().getParameterType();
                returnTypeSimpleName = returnType.getSimpleName();
                if (returnType != void.class && returnType != Void.class) {
                    Object template = generateTemplate(returnType, 0);
                    if (template != null) {
                        responseBodyTemplate = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(template);
                    }
                }
            } catch (Exception e) {
                // 返回值解析失败不影响接口列表展示，使用默认值
                responseBodyTemplate = "{}";
            }

            Set<String> patterns = com.sky.core.util.SpringCompatUtils.getActivePatterns(mappingInfo);

            RequestMethodsRequestCondition methodsCondition = mappingInfo.getMethodsCondition();
            Set<RequestMethod> methods = (methodsCondition != null) ? methodsCondition.getMethods() : Collections.emptySet();

            for (String pattern : patterns) {
                // 跳过仪表盘自身、错误端点和内部视图
                // 过滤仪表盘自身的端点
                if (DASHBOARD_PATHS.contains(pattern)) continue;

                Map<String, String> endpoint = new HashMap<>();
                endpoint.put("url", getBaseUrl(request) + pattern);
                endpoint.put("path", pattern); // 原始路径用于过滤
                endpoint.put("method", methods.isEmpty() ? "ALL" : methods.toString());
                
                String controllerSimpleName = handlerMethod.getBeanType().getSimpleName();
                String controllerDesc = JavaDocReader.getClassDescription(handlerMethod.getBeanType());
                // 如果有描述则使用描述，否则使用 SimpleName
                String controllerInternalName = controllerSimpleName; 
                String displayGroupName = getOrDefault(controllerDesc, controllerSimpleName);

                endpoint.put("bean", controllerSimpleName);
                endpoint.put("function", handlerMethod.getMethod().getName());
                endpoint.put("paramType", paramType);
                endpoint.put("params", String.join(",", paramInfo.paramNames));
                // 使用特殊分隔符连接以便于解析
                endpoint.put("requestParamsDetailed", String.join("||", paramInfo.detailedParams));
                endpoint.put("bodyTemplate", paramInfo.bodyTemplate);
                endpoint.put("responseBodyTemplate", responseBodyTemplate);
                endpoint.put("returnType", returnTypeSimpleName);
                
                // 分析响应字段
                List<String> validResponseFields = new ArrayList<>();
                try {
                    Type returnType = handlerMethod.getReturnType().getGenericParameterType();
                    if (returnType != void.class && returnType != Void.class) {
                        analyzeResponseFields(returnType, "", 0, validResponseFields);
                    }
                } catch (Exception e) {
                   // 忽略异常
                }
                endpoint.put("responseFieldsDetailed", String.join("||", validResponseFields));
                
                // 描述优先级：JavaDoc
                String desc = "";
                // 尝试从源码 JavaDoc 读取
                String doc = JavaDocReader.getMethodDescription(handlerMethod.getBeanType(), handlerMethod.getMethod());
                if (doc != null) desc = doc;
                endpoint.put("description", desc);

                controllerGroups.computeIfAbsent(displayGroupName, k -> new ArrayList<>()).add(endpoint);
            }
        }
        
        // 组内排序
        controllerGroups.forEach((k, v) -> v.sort(Comparator.comparing(m -> m.get("url"))));

        meta.put("controllerGroups", controllerGroups);
        return meta;
    }

    private void analyzeResponseFields(Type type, String prefix, int depth, List<String> fields) {
         if (depth > MAX_RECURSION_DEPTH) return;
         
         Class<?> clazz = null;
         if (type instanceof Class) {
             clazz = (Class<?>) type;
         } else if (type instanceof ParameterizedType) {
             clazz = (Class<?>) ((ParameterizedType) type).getRawType();
         }
         
         if (clazz == null || BeanUtils.isSimpleValueType(clazz) || clazz.getName().startsWith("java.lang") && !Iterable.class.isAssignableFrom(clazz) && !Map.class.isAssignableFrom(clazz)) return;
         
         // 处理集合/迭代器
         if (Iterable.class.isAssignableFrom(clazz) || clazz.isArray()) {
             if (type instanceof ParameterizedType) {
                 Type genericType = ((ParameterizedType) type).getActualTypeArguments()[0];
                 analyzeResponseFields(genericType, prefix, depth + 1, fields);
             } else if (clazz.isArray()) {
                 analyzeResponseFields(clazz.getComponentType(), prefix, depth + 1, fields);
             }
             return;
         }
         
         // 处理 Map
         if (Map.class.isAssignableFrom(clazz)) {
             if (type instanceof ParameterizedType) {
                 Type[] typeArgs = ((ParameterizedType) type).getActualTypeArguments();
                 if (typeArgs.length >= 2) {
                     // Key 通常是字符串，分析 Value
                     analyzeResponseFields(typeArgs[1], prefix, depth + 1, fields);
                 }
             }
             return;
         }

         for (Field field : clazz.getDeclaredFields()) {
             if (Modifier.isStatic(field.getModifiers())) continue;
             String fName = (prefix.isEmpty() ? "" : prefix + ".") + field.getName();
             String fType = field.getType().getSimpleName();
             
             // 如果字段是泛型（如 List<String> items），尝试获取更友好的显示名称
             if (field.getGenericType() instanceof ParameterizedType) {
                 fType = field.getGenericType().toString().replaceAll("class |interface ", "").replaceAll("java\\.lang\\.", "").replaceAll("java\\.util\\.", "");
                 // 简化自定义类的完整包名。
                 // 暂时保持简单，如果不是参数化类型则使用简单名称。
             }

             String fDesc = cleanJavaDocDescription(
                 JavaDocReader.getFieldDescription(clazz, field.getName()),
                 "-"
             );
             
             fields.add(fName + "|" + fType + "|" + fDesc);
             
             // 复杂类型递归处理
             if (!BeanUtils.isSimpleValueType(field.getType()) && !field.getType().getName().startsWith("java.lang")) {
                 analyzeResponseFields(field.getType(), fName, depth + 1, fields);
             } else if (Collection.class.isAssignableFrom(field.getType()) || Map.class.isAssignableFrom(field.getType())) {
                 // 同样深入处理集合/Map 类型的字段
                 analyzeResponseFields(field.getGenericType(), fName, depth + 1, fields);
             }
         }
    }



    private Object generateTemplate(Type type, int depth) {
        if (depth > MAX_RECURSION_DEPTH) {
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
            // 智能默认值：提供合理的示例数据
            if (rawClass == String.class) return "示例文本";
            if (rawClass == Integer.class || rawClass == int.class) return 1;
            if (rawClass == Long.class || rawClass == long.class) return 1L;
            if (rawClass == Double.class || rawClass == double.class) return 1.0;
            if (rawClass == Float.class || rawClass == float.class) return 1.0f;
            if (rawClass == Boolean.class || rawClass == boolean.class) return true;
            if (rawClass == Byte.class || rawClass == byte.class) return (byte) 1;
            if (rawClass == Short.class || rawClass == short.class) return (short) 1;
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

        // 复杂对象
        Map<String, Object> map = new LinkedHashMap<>();
        for (Field field : rawClass.getDeclaredFields()) {
            map.put(field.getName(), generateTemplate(field.getGenericType(), depth + 1));
        }
        return map;
    }
    /**
     * 导出指定接口的 Markdown 文档
     */
    @RequestMapping(value = "/api-dashboard/export-md", method = {RequestMethod.GET, RequestMethod.POST}, produces = "text/markdown;charset=UTF-8")
    @ResponseBody
    public String exportMd(@RequestParam String url, 
                           @RequestParam(required = false) String responseBody,
                           javax.servlet.http.HttpServletRequest request, 
                           javax.servlet.http.HttpServletResponse response) {
        // 设置 Header 强制文件下载
        response.setHeader("Content-Disposition", "attachment; filename=\"api-doc.md\"");
        // 响应类型已由 produces 设置，但我们可以加强它
        response.setContentType("text/markdown; charset=UTF-8");

        String baseUrl = getBaseUrl(request);
        String matchUrl = url.startsWith("http") ? url : (baseUrl + (url.startsWith("/") ? url : "/" + url));
        
        // 使用静态缓存的 Logo（启动时已加载）
        
        // 查找端点
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            Set<String> patterns = com.sky.core.util.SpringCompatUtils.getActivePatterns(entry.getKey());
            for (String pattern : patterns) {
                 String fullUrl = getBaseUrl(request) + pattern;
                 if (fullUrl.equals(matchUrl) || pattern.equals(url)) {
                     // 生成 Markdown
                     Map<String, String> ep = new HashMap<>(); // 重构或复用元数据逻辑？
                     // 理想情况下复用逻辑。但目前为了简单起见，直接重构或在缓存的元数据中查找（如果可能）。
                     // 但元数据是请求范围内生成的。
                     
                     // 快速处理：仅为该端点生成部分元数据
                     HandlerMethod handlerMethod = entry.getValue();
                     ep.put("function", handlerMethod.getMethod().getName());
                     ep.put("path", pattern);
                     ep.put("method", entry.getKey().getMethodsCondition().getMethods().toString());
                     ep.put("bean", handlerMethod.getBeanType().getSimpleName());
                     
                     String desc = "";
                     String doc = JavaDocReader.getMethodDescription(handlerMethod.getBeanType(), handlerMethod.getMethod());
                     if (doc != null) desc = doc;
                     ep.put("description", desc);
                     
                      // 解析参数信息（复用提取的方法）
                      ParameterInfo paramInfo = parseMethodParameters(handlerMethod);
                      ep.put("requestParamsDetailed", String.join("||", paramInfo.detailedParams));
                      
                      // 返回类型和响应字段
                      Method method = handlerMethod.getMethod();
                     
                     // 返回类型和响应字段
                     Class<?> returnType = method.getReturnType();
                     ep.put("returnType", returnType.getSimpleName());
                     try {
                        if (returnType != void.class && returnType != Void.class) {
                            Object template = generateTemplate(returnType, 0);
                            ep.put("responseBodyTemplate", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(template));
                            
                            List<String> respFields = new ArrayList<>();
                            analyzeResponseFields(returnType, "", 0, respFields);
                            ep.put("responseFieldsDetailed", String.join("||", respFields));
                        }
                     } catch (Exception e) {
                    // 响应字段解析失败不影响主流程
                }
                     
                     // 添加 Logo
                     if (LOGO_BASE64 != null) {
                         ep.put("logoBase64", LOGO_BASE64);
                     }
                     
                     return generateMarkdown(ep, responseBody);
                 }
            }
        }
        return "# 找不到接口\n\n在当前注册表中未找到请求的 API URL。\n\nURL: " + url;
    }

    private String generateMarkdown(Map<String, String> ep, String responseBody) {
        StringBuilder sb = new StringBuilder(MARKDOWN_BUILDER_CAPACITY);
        
        // 添加 Logo（如果存在）
        String logo = ep.get("logoBase64");
        if (logo != null && !logo.isEmpty()) {
            sb.append("<div align=\"center\">\n");
            sb.append("  <img src=\"data:image/jpeg;base64,").append(logo)
              .append("\" width=\"").append(LOGO_WIDTH_PX)
              .append("\" style=\"border-radius: 50%;\" />\n");
            sb.append("</div>\n\n");
        }
        
        // 生成标题（优先使用 description，否则使用 function）
        String description = ep.get("description");
        String function = ep.get("function");
        String title = getOrDefault(description, getOrDefault(function, "未命名接口"));
        sb.append("# ").append(title).append("\n\n");
        
        sb.append("## 基本信息\n");
        sb.append("| 项目 | 内容 |\n");
        sb.append("| --- | --- |\n");
        sb.append("| **接口路径** | `").append(getOrDefault(ep.get("path"), "unknown")).append("` |\n");
        sb.append("| **请求方法** | ").append(getOrDefault(ep.get("method"), "ALL")).append(" |\n");
        sb.append("| **控制器** | ").append(getOrDefault(ep.get("bean"), "unknown")).append(" |\n\n");
        
        sb.append("## 请求参数\n");
        String detailedParams = ep.get("requestParamsDetailed");
        if (isNullOrEmpty(detailedParams)) {
            sb.append("*无参数*\n\n");
        } else {
            sb.append("| 参数名 | 类型 | 位置 | 描述 |\n");
            sb.append("| --- | --- | --- | --- |\n");
            // 解析 "Name|Type|Loc|Desc || Name|Type|Loc|Desc"
            String[] paramsList = detailedParams.split("\\|\\|");
            for (String pStr : paramsList) {
                if (pStr.trim().isEmpty()) continue;
                String[] parts = pStr.split("\\|");
                if (parts.length >= 4) {
                     sb.append("| ").append(parts[0]).append(" | `").append(parts[1]).append("` | ").append(parts[2]).append(" | ").append(parts[3]).append(" |\n");
                } else {
                     // 兜底机制以防万一
                     sb.append("| ").append(pStr).append(" | - | - | - |\n");
                }
            }
            sb.append("\n");
        }
        
        String body = ep.get("bodyTemplate");
        if (!isNullOrEmpty(body)) {
            sb.append("## 请求体示例\n");
            sb.append("```json\n").append(body).append("\n```\n");
        }

        String returnType = ep.get("returnType");
        String respFields = ep.get("responseFieldsDetailed");
        
        sb.append("## 响应参数\n");
        
        if (respFields != null && !respFields.isEmpty()) {
            sb.append("| 字段名 | 类型 | 描述 |\n");
            sb.append("| --- | --- | --- |\n");
             String[] fieldsList = respFields.split("\\|\\|");
            for (String fStr : fieldsList) {
                if (fStr.trim().isEmpty()) continue;
                String[] parts = fStr.split("\\|");
                if (parts.length >= 3) {
                     sb.append("| ").append(parts[0]).append(" | `").append(parts[1]).append("` | ").append(parts[2]).append(" |\n");
                }
            }
            sb.append("\n");
        }
        
        String respTemplate = ep.get("responseBodyTemplate");
        if (respTemplate != null && !respTemplate.isEmpty() && !respTemplate.equals("{}")) {
             sb.append("### 响应示例\n");
             sb.append("```json\n").append(respTemplate).append("\n```\n");
        }

        if (!isNullOrEmpty(responseBody)) {
            sb.append("## 实际响应结果\n");
            sb.append("```json\n").append(responseBody).append("\n```\n");
        }
        
        // 添加水印到右下角
        sb.append("\n---\n\n");
        sb.append("<div align=\"right\">\n");
        sb.append("  <sub>由天枢系统为你生成</sub>\n");
        sb.append("</div>\n");
        
        return sb.toString();
    }
}
