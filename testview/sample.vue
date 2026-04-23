<template>
  <div class="container">
    <h1>Vue 组件示例</h1>
    
    <!-- 
      这是 Vue 模板中的多行注释
      可以跨越多行
      不会影响最终渲染的 HTML
    -->
    
    <p>此组件展示了 Vue 的各种字符串和模板特性：</p>
    
    <!-- 多行内容展示 -->
    <pre class="multiline-content">{{ multilineString }}</pre>
    
    <!-- 原始字符串展示 -->
    <pre class="multiline-content">{{ rawLikeString }}</pre>
    
    <!-- 插值表达式示例 -->
    <p>{{ `使用模板字符串: 用户 ${userName} 年龄 ${userAge}` }}</p>
    
    <!-- 按钮 -->
    <button @click="onClick">{{ label }}</button>
    
    <!-- 循环和条件渲染 -->
    <ul>
      <li v-for="(item, index) in items" :key="index">
        {{ `${index + 1}. ${item}` }}
      </li>
    </ul>
    
    <!-- 使用 v-html 渲染多行 HTML -->
    <div v-html="renderedHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

// 定义响应式数据
const label = ref("Click Vue");
const userName = ref("Vue User");
const userAge = ref(25);

// 多行字符串示例
const multilineString = ref(`
这是 Vue 中的多行字符串
可以包含特殊字符 "引号" 和 '单引号'
    保持缩进
支持 ${"插值"} 功能
`);

// 原始字符串概念的模拟
const rawLikeString = ref(`
C:\\Users\\Vue\\Projects
不需要转义反斜杠
路径很清晰
`);

// 使用计算属性生成多行 HTML
const renderedHtml = computed(() => {
  return `
    <div style="background-color: #f0f8ff; padding: 10px; border-radius: 4px;">
      <h3>计算属性生成的 HTML</h3>
      <p>用户名: ${userName.value}</p>
      <p>年龄: ${userAge.value}</p>
      <p>时间: ${new Date().toLocaleString()}</p>
    </div>
  `;
});

// 列表示例
const items = ref([
  "模板语法",
  "响应式数据",
  "计算属性",
  "事件处理",
  "条件渲染"
]);

// 事件处理函数
function onClick(): void {
  // 使用模板字符串更新标签
  label.value = `${label.value.split(" ")[0]} clicked at ${new Date().toLocaleTimeString()}`;
  console.log(label.value);
  
  // 更新用户信息
  userName.value = `Updated ${userName.value}`;
  userAge.value = userAge.value + 1;
}

// 定义一个方法用于格式化信息
function formatUserInfo(): string {
  return `
用户信息:
  姓名: ${userName.value}
  年龄: ${userAge.value}
  点击次数: ${label.value.split('at')[0].includes('clicked') ? 
    parseInt(label.value.match(/\d+/)?.[0] || '1') + 1 : 1}
  `;
}

// 打印格式化的用户信息
console.log(formatUserInfo());
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.multiline-content {
  white-space: pre-line;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  font-family: monospace;
}

button {
  padding: 10px 15px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 10px 0;
}

button:hover {
  background-color: #369870;
}

/* 
  多行 CSS 注释
  用于描述样式规则
*/
button::after {
  content: " vue string";
  display: block;
  font-size: 0.8em;
  color: #888;
}
</style>