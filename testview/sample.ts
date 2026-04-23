/*
 * 这是 TypeScript 的多行注释
 * 展示了 TS 的各种字符串特性
 * 包括模板字符串、类型注解等
 */

/**
 * 这是文档注释（JSDoc）
 * 用户类型定义
 */
type User = { 
  id: number; 
  name: string;
  email?: string; // 可选属性
};

interface UserProfile {
  /** 用户档案接口 */
  bio: string;
  age: number;
}

// 多行字符串（使用模板字符串）
const multilineString = `
这是 TypeScript 的多行字符串
可以包含变量插值
例如用户ID: ${Math.floor(Math.random() * 100)}
还支持表达式计算: ${2 + 2}
`;

// 模板字符串中的类型转换和方法链
const name = "TypeScript";
const formattedName = `${name.toUpperCase().split('').join('-')}`;

// 模板字符串中访问对象属性
const user: User = { id: 1, name: "Alice", email: "alice@example.com" };
const userInfo = `
User Details:
ID: ${user.id}
Name: ${user.name}
Email: ${user.email || 'Not provided'}
`;

// 模板字符串中的函数调用
function getCurrentTime(): string {
  return new Date().toLocaleTimeString();
}
const timeMessage = `Current time: ${getCurrentTime()}`;

// 模板字符串中的复杂表达式
const numbers = [1, 2, 3, 4, 5];
const sumMessage = `Sum of [${numbers}] is: ${numbers.reduce((sum, num) => sum + num, 0)}`;

// 带有泛型的函数示例
function formatEntity<T extends { id: number; name: string }>(entity: T): string {
  return `Formatted: ${entity.id} - ${entity.name}`;
}

// 复杂的对象类型
const userProfile: UserProfile & User = {
  id: 1,
  name: "Alice",
  bio: "Software Developer",
  age: 30
};

// 模板字符串中使用联合类型
type Status = "active" | "inactive";
const status: Status = "active";
const statusMessage = `User status is: ${status}`;

// 联合类型和条件类型的结合
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

const response: ApiResponse<User> = {
  data: { id: 1, name: "Alice" },
  status: 200,
  message: "Success"
};

const responseInfo = `
API Response:
Status: ${response.status}
Message: ${response.message}
Data: ${JSON.stringify(response.data)}
`;

console.log(multilineString);
console.log(formattedName);
console.log(userInfo);
console.log(timeMessage);
console.log(sumMessage);
console.log(formatEntity({ id: 42, name: "Sample Entity" }));
console.log(statusMessage);
console.log(responseInfo);

function formatUser(user: User): string {
  return `${user.id}-${user.name.toLowerCase()}`;
}

console.log(formatUser(user)); // Function call with type check