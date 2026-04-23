/**
 * 这是 Java 的多行文档注释 (Javadoc)
 * 展示了 Java 的各种字符串特性
 * 包括文本块（Java 15+）、多行注释等
 * 
 * @author Example
 * @version 1.0
 */
public class Sample {
  
  /**
   * 计算数字的平方
   * 
   * @param n 输入数字
   * @return 平方值
   */
  static int square(int n) {
    return n * n;
  }

  public static void main(String[] args) {
    /* 
     * 这是 Java 的传统多行注释
     * 可以跨越多行
     * 通常用于详细说明
     */
     
    // Java 15+ 文本块 (多行字符串)
    String multilineString = """
      这是 Java 文本块 (Text Block)
      可以包含多行内容
          保持缩进
      不需要转义 "引号" 或 '单引号'
      支持换行符
      """;
    
    // 包含变量插值的文本块 (通过字符串连接实现)
    String name = "Alice";
    int age = 30;
    String infoBlock = """
      用户信息:
         姓名: %s
         年龄: %d
      详细资料结束
      """.formatted(name, age);
    
    // 原始字符串概念的模拟 (Java没有真正的原始字符串)
    String rawLikeString = """
        C:\\Users\\Java\\Projects
        不需要转义反斜杠
        路径很清晰
        """;
        
    // 包含特殊字符的文本块
    String regexExample = """
      正则表达式示例:
        \\d{4}-\\d{2}-\\d{2}
      不需要过多转义
      """;
      
    // 在文本块中嵌入代码片段
    String codeSnippet = """
      public void example() {
          System.out.println("Hello");
      }
      """;
    
    System.out.println(multilineString);
    System.out.println(infoBlock);
    System.out.println(rawLikeString);
    System.out.println(regexExample);
    System.out.println(codeSnippet);
    
    String s = "Hello from Java";
    var values = List.of(2, 3, 4);
    int value = square(values.get(1)); // Function call
    System.out.println(s + " => " + value);
  }
}

import java.util.List;