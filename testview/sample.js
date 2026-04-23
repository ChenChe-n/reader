/*
 * 这是 JavaScript 的多行注释
 * 展示了 JS 的各种字符串特性
 * 包括模板字符串、多行字符串等
 */

/**
 * 这是文档注释（JSDoc）
 * 问候函数，返回带名字的问候语
 * @param {string} name - 要问候的名字
 * @return {string} 问候语
 */
function greet(name) {
  return `Hello, ${name}!`;
}

// 多行字符串（使用模板字符串）
const multilineString = `
这是第一行
这是第二行
包含特殊字符 " ' \ 和换行符
还有一行在这里
`;

// 模板字符串中的表达式插值
const name = "Alice";
const age = 30;
const interpolated = `My name is ${name} and I am ${age} years old.`;

// 复杂的模板字符串表达式
const calculation = `Next year I will be ${age + 1} years old.`;
const fruits = ['apple', 'banana', 'orange'];
const fruitList = `I have ${fruits.length} fruits: ${fruits.join(', ')}`;

// 模板字符串中调用函数
function getTimestamp() {
  return new Date().toLocaleTimeString();
}
const messageWithTime = `Current time is: ${getTimestamp()}`;

// 嵌套模板字符串
const nestedExample = `He said "${greet('Bob')}" yesterday`;

// 模板字符串中的对象属性
const person = { firstName: 'John', lastName: 'Doe' };
const fullName = `${person.firstName} ${person.lastName}`;

// 多行注释中包含代码示例
/* 
 * 原始字符串概念在 JS 中通过反斜杠实现（ES2021之前）
 * 现代 JS 使用模板字符串替代了大部分原始字符串的需求
 * 但我们可以模拟一些原始字符串的效果
 */

// 正则表达式，类似原始字符串的功能
const regex = /\d{4}-\d{2}-\d{2}/;

// 转义序列示例
const escapeExample = "Line 1\nLine 2\tTabbed";

console.log(multilineString);
console.log(interpolated);
console.log(calculation);
console.log(fruitList);
console.log(messageWithTime);
console.log(nestedExample);
console.log(fullName);
console.log(`Regex match: ${regex}`);
console.log(escapeExample);

const input = "  js string trim  ";
const cleaned = input.trim().toUpperCase(); // String method call
console.log(greet(cleaned));

[1, 2, 3].map((n) => n * 2).forEach((n) => console.log("n=", n)); // Function chain